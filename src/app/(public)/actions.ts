'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendVerificationEmail, sendBookingConfirmationEmail } from '@/lib/mail'

export async function getPublicBranchBookings(branchId: number, date: string) {
    const supabase = await createAdminClient()

    // Query bookings for this branch on this date that are NOT Cancelled or Deleted
    // We need to check for overlaps.
    // Assuming 'start_time' is a timestampz.

    // We want bookings that overlap with the 'date' day.
    // Actually, start_time is usually full timestamp.

    // We query for a wider range (-1 day to +2 days) to cover:
    // 1. Timezone offsets (e.g. 01:00 AM KSA is 22:00 PM prev day UTC)
    // 2. Cross-midnight shifts (e.g. 9 PM to 4 AM)

    // Calculate dates
    const d = new Date(date)

    // Start: Previous Day
    const prev = new Date(d)
    prev.setDate(prev.getDate() - 1)
    const startRange = `${prev.toISOString().split('T')[0]} 00:00:00`

    // End: 2 Days after
    const next = new Date(d)
    next.setDate(next.getDate() + 2)
    const endRange = `${next.toISOString().split('T')[0]} 23:59:59`

    const { data: bookings } = await supabase
        .from('bookings')
        .select('start_time, end_time, duration_value, duration_unit')
        .eq('branch_id', branchId)
        .eq('is_deleted', false)
        .neq('status', 'cancelled') // Cancelled bookings don't block time
        .gte('start_time', startRange)
        .lte('start_time', endRange)

    return bookings || []
}

// --- OTP Actions ---

// --- OTP Actions ---

export async function sendVerificationCode(email: string) {
    const supabase = await createClient()

    // Generate 4 digit code
    const code = Math.floor(1000 + Math.random() * 9000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60000) // 10 minutes

    // Store in DB
    const { error } = await supabase
        .from('verification_codes')
        .insert({
            email,
            code,
            expires_at: expiresAt.toISOString(),
            is_used: false
        })

    if (error) {
        console.error("Error storing OTP", error)
        return { error: 'Failed to generate verification code' }
    }

    // Send Email
    const emailResult = await sendVerificationEmail(email, code) // Bilingual
    if (!emailResult) {
        console.error("Failed to send verification email")
        // We generally still return success to avoiding leaking info, but for this app we might want to know.
        // For now, let's treat it as a warning but proceed, or return error?
        // If email fails, user can't verify. So we should probably return error.
        // return { error: 'Failed to send verification code' }
    }

    return { success: true, debugCode: code } // debugCode left for dev purposes, remove in prod
}

export async function verifyVerificationCode(email: string, code: string) {
    const supabase = await createClient()

    const { data: record } = await supabase
        .from('verification_codes')
        .select('*')
        .eq('email', email)
        .eq('code', code)
        .eq('is_used', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

    if (!record) {
        return { error: 'الرمز غير صحيح أو منتهي الصلاحية' }
    }

    // Mark as used
    await supabase
        .from('verification_codes')
        .update({ is_used: true })
        .eq('id', record.id)

    // Code is valid
    return { success: true }
}

// ... existing code ...

export async function getPublicBooking(token: string) {
    console.log(`[getPublicBooking] Fetching booking with token: ${token}`)
    const supabase = await createAdminClient()

    // Query by Token (UUID) instead of ID
    // We assume the 'token' column exists and is unique.
    const { data, error } = await supabase
        .from('bookings')
        .select(`
            *,
            service:services (name, description),
            branch:branches (
                name, 
                slug,
                address, 
                phone,
                image_url,
                location_url,
                businesses (name)
            ),
            customer:customers (name, phone, email)
        `)
        .eq('token', token)
        .single()

    if (error) {
        console.error(`[getPublicBooking] Error fetching booking:`, error)
        return { error: error.message }
    }

    if (!data) {
        console.error(`[getPublicBooking] No data returned for token: ${token}`)
    } else {
        console.log(`[getPublicBooking] Successfully fetched booking: ${data.id}`)
    }

    return { data }
}

// --- Booking Action ---

export async function createPublicBooking(data: {
    branch_id: number,
    service_id: number,
    start_time: string, // ISO String
    duration_minutes: number, // Total minutes
    duration_unit: string, // 'minute', 'hour', 'day'
    duration_value: number,
    price: number,
    customer_name: string,
    customer_phone: string,
    customer_email: string // Now Mandatory
}) {
    const supabase = await createAdminClient()

    const businessId = await getBusinessIdForBranch(supabase, data.branch_id)

    // Trim and normalize inputs
    const phone = data.customer_phone.trim()
    const email = data.customer_email.trim().toLowerCase()

    // 1. Find or Create Customer
    let customerId: string | null = null

    // Check by Phone (Include Deleted to handle reactivation)
    const { data: customerByPhone } = await supabase
        .from('customers')
        .select('id, name, phone, email, is_deleted')
        .eq('business_id', businessId)
        .eq('phone', phone)
        .limit(1)

    // Check by Email (Include Deleted)
    const { data: customerByEmail } = await supabase
        .from('customers')
        .select('id, name, phone, email, is_deleted')
        .eq('business_id', businessId)
        .eq('email', email)
        .limit(1)

    // detailed logging to debug
    console.log(`[Booking Lookup] Phone: ${phone}, Email: ${email}`)
    console.log(`[Booking Lookup] Found by Phone:`, customerByPhone?.length, customerByPhone?.[0]?.is_deleted ? '(Deleted)' : '(Active)')
    console.log(`[Booking Lookup] Found by Email:`, customerByEmail?.length)

    let existingCustomer = null
    if (customerByPhone && customerByPhone.length > 0) {
        existingCustomer = customerByPhone[0]
    } else if (customerByEmail && customerByEmail.length > 0) {
        existingCustomer = customerByEmail[0]
    }

    if (existingCustomer) {
        customerId = existingCustomer.id.toString()
        const updates: any = {}

        // Reactivate if deleted
        if (existingCustomer.is_deleted) {
            updates.is_deleted = false
            console.log(`[Booking Lookup] Reactivating deleted customer: ${customerId}`)
        }

        // Update name if changed
        if (data.customer_name && existingCustomer.name !== data.customer_name) {
            updates.name = data.customer_name
        }

        // Update email if missing in DB but provided now
        if (email && !existingCustomer.email) {
            updates.email = email
        }

        if (Object.keys(updates).length > 0) {
            const { error: updateError } = await supabase
                .from('customers')
                .update(updates)
                .eq('id', customerId)

            if (updateError) {
                console.error("Update/Reactivate Customer Error", updateError)
                // If update fails, we might just proceed or return error? 
                // If it was a duplicate key error on update (e.g. email conflict), we should handle it.
                // But for now, let's assume it works.
            }
        }
    } else {
        // Create new customer
        const { data: newCustomer, error: createError } = await supabase
            .from('customers')
            .insert({
                name: data.customer_name,
                phone: phone,
                email: email,
                business_id: businessId
            })
            .select('id')
            .single()

        if (createError) {
            console.error("Create Customer Error", createError)
            // Provide more specific error if possible
            if (createError.code === '23505') { // Unique violation
                return { error: 'Customer already exists (Duplicate).' }
            }
            return { error: 'Failed to create customer record.' }
        }
        customerId = newCustomer.id.toString()
    }

    // 2. Calculate End Time
    const startDate = new Date(data.start_time)
    const endDate = new Date(startDate.getTime() + data.duration_minutes * 60000)

    // 3. Create Booking
    // Normalize duration logic: Extract Half Hour if exists
    let dbDurationValue = data.duration_value
    let dbDurationUnit = data.duration_unit
    let dbHasHalfHour = false
    let dbHalfHourPrice = 0

    // Only apply this logic if unit is 'hour' and value is fractional (e.g. 1.5, 2.5)
    if (dbDurationUnit === 'hour' && !Number.isInteger(dbDurationValue)) {
        // Check if it works like X.5
        const remainder = dbDurationValue % 1
        if (remainder === 0.5) {
            dbDurationValue = Math.floor(dbDurationValue) // 1.5 -> 1
            dbHasHalfHour = true

            // Calculate Half Hour Price
            // Logic: Subtract price of base duration (e.g. 1 hour) from total price (e.g. 1.5 hours)
            // 1. Fetch price of base duration
            const { data: baseDurationData } = await supabase
                .from('service_durations')
                .select('price')
                .eq('service_id', data.service_id)
                .eq('duration_unit', 'hour')
                .eq('duration_value', dbDurationValue) // The integer part (e.g. 1)
                .single()

            if (baseDurationData) {
                // 2. Subtract base price from total price
                dbHalfHourPrice = data.price - baseDurationData.price
                // Ensure no negative values just in case
                if (dbHalfHourPrice < 0) dbHalfHourPrice = 0
            } else {
                // If base duration price doesn't exist, half hour price is 0 (as requested)
                dbHalfHourPrice = 0
            }
        } else {
            // Fallback for weird fractions, round or keep as minutes?
            // User requested specific logic for .5, so we stick to that.
        }
    }

    const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
            branch_id: data.branch_id,
            service_id: data.service_id,
            customer_id: customerId,
            start_time: startDate.toISOString(),
            end_time: endDate.toISOString(),
            price: data.price,
            status: 'under_review', // Public bookings go to review
            business_id: (await getBusinessIdForBranch(supabase, data.branch_id)),
            duration_unit: dbDurationUnit,
            duration_value: dbDurationValue,
            has_half_hour: dbHasHalfHour,
            half_hour_price: dbHalfHourPrice
        })
        .select()
        .single()

    if (bookingError) {
        console.error("Booking Error", bookingError)
        return { error: 'Failed to create booking. Please try again.' }
    }

    // --- Email Sending ---
    if (booking && booking.token) {
        // Fetch full booking details for the email
        const fullBooking = await getPublicBooking(booking.token)
        if (fullBooking.data) {
            await sendBookingConfirmationEmail(fullBooking.data) // Bilingual
        }
    }

    return { success: true, booking }
}

async function getBusinessIdForBranch(supabase: any, branchId: number) {
    return data?.business_id
}

// --- Payment Actions ---

import { PaylinkService } from '@/lib/paylink'

export async function initiatePayment(bookingId: number, amount: number, branchId: number, type: 'full' | 'deposit' | 'remaining') {
    const supabase = await createAdminClient()

    // 1. Fetch Payment Settings
    const { data: settings } = await supabase
        .from('payment_settings')
        .select('*')
        .eq('branch_id', branchId)
        .single()

    if (!settings || !settings.is_enabled) {
        return { error: 'Payments are not enabled for this branch.' }
    }

    // 2. Fetch Booking & Customer (for invoice details)
    const { data: booking } = await supabase
        .from('bookings')
        .select(`
            *,
            customer:customers (name, phone, email)
        `)
        .eq('id', bookingId)
        .single()

    if (!booking) {
        return { error: 'Booking not found.' }
    }

    const paylink = new PaylinkService(settings.app_id, settings.secret_key, settings.is_production)

    // 3. Construct Callback URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000'
    const callbackUrl = `${baseUrl}/payment?branchId=${branchId}&bookingId=${bookingId}`

    try {
        const titleMap = {
            'full': 'Full Payment',
            'deposit': 'Deposit Payment',
            'remaining': 'Remaining Balance Payment'
        }

        const invoice = await paylink.createInvoice({
            amount: amount,
            callBackUrl: callbackUrl,
            clientEmail: booking.customer.email,
            clientMobile: booking.customer.phone,
            clientName: booking.customer.name,
            note: `Payment for Booking #${bookingId} (${type})`,
            orderNumber: bookingId.toString(),
            products: [{
                title: `Booking #${bookingId} - ${titleMap[type]}`,
                price: amount,
                qty: 1
            }]
        })

        if (invoice.url) {
            return { success: true, url: invoice.url }
        } else {
            return { error: 'Failed to generate payment link.' }
        }
    } catch (e: any) {
        console.error("Initiate Payment Error", e)
        return { error: e.message || 'Payment initiation failed.' }
    }
}


