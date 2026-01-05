'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type Booking = {
    id: number
    business_id: number
    branch_id: number
    service_id: number
    customer_id: number
    start_time: string
    end_time?: string | null
    duration_value?: number | null
    duration_unit: 'hour' | 'day' | 'open'
    price: number
    paid_amount: number // Now computed
    status: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
    notes?: string | null
    created_at: string
    service?: { name: string }
    customer?: {
        id: number
        name: string
        phone: string
        email?: string
        notes?: string
        gender?: string
        date_of_birth?: string
    }
    branch?: { name: string }
    created_by?: { full_name: string }
    has_half_hour?: boolean
    half_hour_price?: number
}

async function getBusinessId(supabase: any, userId: string): Promise<number | null> {
    const { data: member } = await supabase
        .from('business_members')
        .select('business_id')
        .eq('user_id', userId)
        .single()

    if (member?.business_id) return member.business_id

    const { data: profile } = await supabase
        .from('profiles')
        .select('branch_id, role')
        .eq('id', userId)
        .single()

    if (!profile) return null

    if (profile.role === 'owner') {
        const { data: business } = await supabase
            .from('businesses')
            .select('id')
            .eq('owner_id', userId)
            .single()
        if (business) return business.id
    }

    if (profile.branch_id) {
        const { data: branch } = await supabase
            .from('branches')
            .select('business_id')
            .eq('id', profile.branch_id)
            .single()
        if (branch) return branch.business_id
    }

    return null
}

export async function getBookings(customerId?: number): Promise<Booking[]> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data: profile } = await supabase.from('profiles').select('role, branch_id, business_id').eq('id', user.id).single()

    let query = supabase
        .from('bookings')
        .select(`
            *,
            service:services(name),
            customer:customers(id, name, phone, email, notes, gender, date_of_birth),
            branch:branches(name),
            created_by:profiles(full_name),
            vouchers(amount, type, is_deleted)
        `)
        .eq('is_deleted', false)

    if (profile?.role === 'owner') {
        const businessId = await getBusinessId(supabase, user.id)
        if (businessId) {
            query = query.eq('business_id', businessId)
        } else {
            return []
        }
    } else if (profile?.branch_id) {
        query = query.eq('branch_id', profile.branch_id)
    } else {
        return []
    }

    if (customerId) {
        query = query.eq('customer_id', customerId)
    }

    const { data: bookings, error } = await query.order('start_time', { ascending: false })

    if (error) {
        console.error('Error fetching bookings:', error)
        return []
    }

    // Process bookings to calculate paid_amount from vouchers
    const processedBookings: Booking[] = bookings.map((booking: any) => {
        const vouchers = booking.vouchers || []
        const calculatedPaid = vouchers.reduce((acc: number, v: any) => {
            if (v.is_deleted) return acc
            if (v.type === 'receipt') return acc + Number(v.amount)
            if (v.type === 'refund') return acc - Number(v.amount)
            return acc
        }, 0)

        // Remove vouchers from the booking object to match type (optional, but cleaner)
        const { vouchers: _, ...bookingData } = booking

        return {
            ...bookingData,
            paid_amount: calculatedPaid
        }
    })

    return processedBookings
}

export async function createBooking(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { message: 'Unauthorized' }
    if (!user) return { message: 'Unauthorized' }

    const { data: profile } = await supabase.from('profiles').select('role, branch_id').eq('id', user.id).single()

    let businessId: number | null = null
    let branchId: number = 0

    if (profile?.role === 'owner') {
        businessId = await getBusinessId(supabase, user.id)
        branchId = Number(formData.get('branch_id'))
    } else if (profile?.branch_id) {
        branchId = profile.branch_id
        // Fetch business_id from branch
        const { data: branch } = await supabase.from('branches').select('business_id').eq('id', branchId).single()
        businessId = branch?.business_id || null
    }

    if (!businessId || !branchId) return { message: 'Business or Branch not found' }

    const service_id = formData.get('service_id')
    const customer_id = formData.get('customer_id')
    const start_time = formData.get('start_time') as string
    const end_time = formData.get('end_time') as string // optional
    const duration_value = formData.get('duration_value')
    const duration_unit = formData.get('duration_unit') as string
    const price = formData.get('price')
    // paid_amount removed
    const has_half_hour = formData.get('has_half_hour') === 'true'
    const half_hour_price = formData.get('half_hour_price')
    const status = formData.get('status')
    const notes = formData.get('notes') as string

    // Validation
    if (!branchId || !service_id || !customer_id || !start_time || !duration_unit || !price) {
        return { message: 'Missing required fields' }
    }

    const { error } = await supabase
        .from('bookings')
        .insert({
            business_id: businessId,
            branch_id: branchId,
            service_id: Number(service_id),
            customer_id: Number(customer_id),
            start_time,
            end_time: end_time || null,
            duration_value: duration_value ? Number(duration_value) : null,
            duration_unit,
            duration_unit,
            price: Number(price),
            has_half_hour,
            half_hour_price: half_hour_price ? Number(half_hour_price) : 0,
            // paid_amount: 0, // No longer set manually
            notes: notes || null,
            status: status ? String(status) : 'scheduled',
            created_by: user.id
        })

    if (error) {
        return { message: error.message }
    }

    revalidatePath('/dashboard/bookings')
    return { success: true }
}

export async function updateBookingStatus(id: number, status: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('bookings')
        .update({ status })
        .eq('id', id)

    if (error) return { message: error.message }
    revalidatePath('/dashboard/bookings')
    return { success: true }
}

export async function updateBooking(id: number, formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { message: 'Unauthorized' }

    // Validation
    const branch_id = formData.get('branch_id')
    const service_id = formData.get('service_id')
    const customer_id = formData.get('customer_id')
    const start_time = formData.get('start_time') as string
    const end_time = formData.get('end_time') as string // optional
    const duration_value = formData.get('duration_value')
    const duration_unit = formData.get('duration_unit') as string
    const price = formData.get('price')
    // paid_amount removed
    const has_half_hour = formData.get('has_half_hour') === 'true'
    const half_hour_price = formData.get('half_hour_price')
    const status = formData.get('status')
    const notes = formData.get('notes') as string

    if (!branch_id || !service_id || !customer_id || !start_time || !duration_unit || !price) {
        return { message: 'Missing required fields' }
    }

    const { error } = await supabase
        .from('bookings')
        .update({
            branch_id: Number(branch_id),
            service_id: Number(service_id),
            customer_id: Number(customer_id),
            start_time,
            end_time: end_time || null,
            duration_value: duration_value ? Number(duration_value) : null,
            duration_unit,
            duration_unit,
            price: Number(price),
            has_half_hour,
            half_hour_price: half_hour_price ? Number(half_hour_price) : 0,
            // paid_amount: 0, // No longer set manually
            notes: notes || null,
            status: status ? String(status) : 'scheduled'
        })
        .eq('id', id)

    if (error) return { message: error.message }
    revalidatePath('/dashboard/bookings')
    return { success: true }
}

export async function deleteBooking(id: number) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { message: 'Unauthorized' }

    // Fetch booking to check branch
    const { data: booking } = await supabase.from('bookings').select('branch_id').eq('id', id).single()

    // Permission Check
    const { data: profile } = await supabase.from('profiles').select('role, branch_id').eq('id', user.id).single()

    if (profile?.role !== 'owner') {
        if (profile?.role !== 'manager') {
            return { message: 'Permission denied: Only Managers can delete bookings' }
        }
        if (booking?.branch_id !== profile?.branch_id) {
            return { message: 'Permission denied: Cannot delete booking from another branch' }
        }
    }

    const { error } = await supabase
        .from('bookings')
        .update({ is_deleted: true })
        .eq('id', id)

    if (error) return { message: error.message }
    revalidatePath('/dashboard/bookings')
    return { success: true }
}
