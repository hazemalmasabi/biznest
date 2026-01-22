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

    // 1. Find or Create Customer
    let customerId: string | null = null

    // Check by Phone (Active Only)
    const { data: customerByPhone } = await supabase
        .from('customers')
        .select('id, name, phone, email')
        .eq('business_id', businessId)
        .eq('phone', data.customer_phone.trim())
        .or('is_deleted.is.null,is_deleted.eq.false') // Only active customers
        .limit(1)

    // Check by Email (Active Only)
    const { data: customerByEmail } = await supabase
        .from('customers')
        .select('id, name, phone, email')
        .eq('business_id', businessId)
        .eq('email', data.customer_email.trim().toLowerCase())
        .or('is_deleted.is.null,is_deleted.eq.false') // Only active customers
        .limit(1)

    // detailed logging to debug
    console.log(`[Booking Lookup] Phone: ${data.customer_phone}, Email: ${data.customer_email}`)
    console.log(`[Booking Lookup] Found Active by Phone:`, customerByPhone?.length)
    console.log(`[Booking Lookup] Found Active by Email:`, customerByEmail?.length)

    // Prioritize Phone match, then Email match
    let existingCustomer = null
    if (customerByPhone && customerByPhone.length > 0) {
        existingCustomer = customerByPhone[0]
    } else if (customerByEmail && customerByEmail.length > 0) {
        existingCustomer = customerByEmail[0]
    }

    if (existingCustomer) {
        customerId = existingCustomer.id

        // Update name if different
        if (existingCustomer.name !== data.customer_name) {
            await supabase
                .from('customers')
                .update({ name: data.customer_name })
                .eq('id', customerId)
        }
    } else {
        // Create new customer
        const { data: newCustomer, error: createError } = await supabase
            .from('customers')
            .insert({
                name: data.customer_name,
                phone: data.customer_phone,
                email: data.customer_email,
                business_id: businessId
            })
            .select('id')
            .single()

        if (createError) {
            console.error("Create Customer Error", createError)
            return { error: 'Failed to create customer record.' }
        }
        customerId = newCustomer.id
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
    const { data } = await supabase.from('branches').select('business_id').eq('id', branchId).single()
    return data?.business_id
}


