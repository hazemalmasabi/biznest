'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type Voucher = {
    id: number
    business_id: number // BigInt
    branch_id: number
    type: 'receipt' | 'payment' | 'refund'
    amount: number
    payment_method: 'cash' | 'card' | 'transfer' | 'other'
    notes?: string
    booking_id?: number
    created_by?: { full_name: string }
    branch?: { name: string }
    created_at: string
}

async function getBusinessId(supabase: any, userId: string): Promise<number | null> {
    // 1. Check business_members (most reliable for owners/admins)
    const { data: member } = await supabase
        .from('business_members')
        .select('business_id')
        .eq('user_id', userId)
        .single()

    if (member?.business_id) return member.business_id

    // 2. Check profile for role and branch_id
    const { data: profile } = await supabase
        .from('profiles')
        .select('business_id, role, branch_id')
        .eq('id', userId)
        .single()

    if (profile?.business_id) return profile.business_id

    // 3. Fallback: If has branch_id, get business_id from branch
    if (profile?.branch_id) {
        const { data: branch } = await supabase
            .from('branches')
            .select('business_id')
            .eq('id', profile.branch_id)
            .single()
        if (branch?.business_id) return branch.business_id
    }

    return null
}

async function syncBookingPaidAmount(bookingId: number) {
    const supabase = await createClient()

    // Fetch all active vouchers for this booking
    const { data: vouchers } = await supabase
        .from('vouchers')
        .select('amount, type')
        .eq('booking_id', bookingId)
        .eq('is_deleted', false)

    if (!vouchers) return

    const totalPaid = vouchers.reduce((acc, v) => {
        if (v.type === 'receipt') return acc + Number(v.amount)
        if (v.type === 'refund') return acc - Number(v.amount)
        return acc
    }, 0)

    await supabase
        .from('bookings')
        .update({ paid_amount: totalPaid })
        .eq('id', bookingId)
}

export async function getVouchers(bookingId?: number) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { vouchers: [] }

    const { data: profile } = await supabase.from('profiles').select('role, branch_id, business_id').eq('id', user.id).single()

    let query = supabase
        .from('vouchers')
        .select('*, branch:branches(name), created_by:profiles(full_name)')
        .eq('is_deleted', false)

    if (profile?.role === 'owner') {
        const businessId = await getBusinessId(supabase, user.id)
        if (businessId) {
            query = query.eq('business_id', businessId)
        } else {
            return { vouchers: [] }
        }
    } else if (profile?.branch_id) {
        query = query.eq('branch_id', profile.branch_id)
    } else {
        return { vouchers: [] }
    }

    if (bookingId) {
        query = query.eq('booking_id', bookingId)
    }

    const { data: vouchers, error } = await query.order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching vouchers:', JSON.stringify(error, null, 2))
        return { vouchers: [] }
    }

    return { vouchers: vouchers as Voucher[] }
}

export async function createVoucher(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

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

    if (!businessId || !branchId) return { error: 'Business or Branch not found' }

    const type = formData.get('type')
    const amount = formData.get('amount')
    const payment_method = formData.get('payment_method')
    const booking_id = formData.get('booking_id')
    const notes = formData.get('notes')

    if (!type || !amount || !payment_method) {
        return { error: 'Missing required fields' }
    }

    const { error } = await supabase
        .from('vouchers')
        .insert({
            business_id: businessId,
            branch_id: branchId,
            type: String(type),
            amount: Number(amount),
            payment_method: String(payment_method),
            booking_id: booking_id ? Number(booking_id) : null,
            notes: notes ? String(notes) : null,
            created_by: user.id
        })

    if (error) {
        console.error('Error creating voucher:', error)
        return { error: 'Failed to create voucher' + error.message }
    }

    if (booking_id) {
        await syncBookingPaidAmount(Number(booking_id))
        revalidatePath('/dashboard/bookings')
    }

    revalidatePath('/dashboard/vouchers')
    return { success: true }
}

export async function updateVoucher(id: number, formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser() // Basic check

    // Validate Owner/Manager role? RLS handles it usually, but let's be safe if needed.
    // For now, rely on RLS update policy.

    const branch_id = formData.get('branch_id')
    const type = formData.get('type')
    const amount = formData.get('amount')
    const payment_method = formData.get('payment_method')
    const booking_id = formData.get('booking_id')
    const notes = formData.get('notes')

    const branchIdInt = Number(branch_id)

    // Permission Check
    const { data: profile } = await supabase.from('profiles').select('role, branch_id').eq('id', user.id).single()

    if (profile?.role !== 'owner') {
        const allowed = ['manager', 'assistant_manager']
        if (!allowed.includes(profile?.role)) {
            return { error: 'Permission denied' }
        }
        if (profile?.branch_id !== branchIdInt) {
            return { error: 'Permission denied: restricted to your branch' }
        }
        // Check existing voucher branch
        const { data: existing } = await supabase.from('vouchers').select('branch_id').eq('id', id).single()
        if (existing?.branch_id !== profile?.branch_id) {
            return { error: 'Permission denied: Cannot edit voucher from another branch' }
        }
    }

    const { error } = await supabase
        .from('vouchers')
        .update({
            branch_id: Number(branch_id),
            type: String(type),
            amount: Number(amount),
            payment_method: String(payment_method),
            booking_id: booking_id ? Number(booking_id) : null,
            notes: notes ? String(notes) : null
        })
        .eq('id', id)

    if (error) {
        console.error('Error updating voucher:', error)
        return { error: 'Failed to update voucher' }
    }

    if (booking_id) {
        await syncBookingPaidAmount(Number(booking_id))
        revalidatePath('/dashboard/bookings')
    }

    revalidatePath('/dashboard/vouchers')
    return { success: true }
}

export async function deleteVoucher(id: number) {
    const supabase = await createClient()

    // Fetch voucher to check for booking_id before deletion
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data: voucher } = await supabase.from('vouchers').select('booking_id, branch_id').eq('id', id).single()

    // Permission Check
    const { data: profile } = await supabase.from('profiles').select('role, branch_id').eq('id', user.id).single()

    if (profile?.role !== 'owner') {
        if (profile?.role !== 'manager') {
            return { error: 'Permission denied: Only Managers can delete vouchers' }
        }
        if (voucher?.branch_id !== profile?.branch_id) {
            return { error: 'Permission denied: Cannot delete voucher from another branch' }
        }
    }

    const { error } = await supabase
        .from('vouchers')
        .update({ is_deleted: true })
        .eq('id', id)

    if (error) {
        console.error('Error deleting voucher:', error)
        return { error: 'Failed to delete voucher' }
    }

    if (voucher?.booking_id) {
        await syncBookingPaidAmount(voucher.booking_id)
        revalidatePath('/dashboard/bookings')
    }

    revalidatePath('/dashboard/vouchers')
    return { success: true }
}
