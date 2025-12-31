'use server'

import { createClient } from '@/lib/supabase/server'
import { getBranches } from './branches/actions'

export type StatItem = {
    count: number
    value: number
    remaining: number
}

export type DashboardStats = {
    bookings: {
        total: StatItem
        scheduled: StatItem
        completed: StatItem
        cancelled: StatItem
        no_show: StatItem
    }
    vouchers: {
        total_receipts: number
        total_payments: number
        total_refunds: number
        net: number
    }
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

export async function getUserProfile() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // Try to get full name from profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()

    return {
        id: user.id,
        email: user.email,
        full_name: profile?.full_name || user.email?.split('@')[0] || 'User'
    }
}

export async function getDashboardStats(dateFrom: string, dateTo: string, branchId?: string): Promise<DashboardStats> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return {
        bookings: {
            total: { count: 0, value: 0, remaining: 0 },
            scheduled: { count: 0, value: 0, remaining: 0 },
            completed: { count: 0, value: 0, remaining: 0 },
            cancelled: { count: 0, value: 0, remaining: 0 },
            no_show: { count: 0, value: 0, remaining: 0 }
        },
        vouchers: { total_receipts: 0, total_payments: 0, total_refunds: 0, net: 0 }
    }

    const businessId = await getBusinessId(supabase, user.id)
    if (!businessId) return {
        bookings: {
            total: { count: 0, value: 0, remaining: 0 },
            scheduled: { count: 0, value: 0, remaining: 0 },
            completed: { count: 0, value: 0, remaining: 0 },
            cancelled: { count: 0, value: 0, remaining: 0 },
            no_show: { count: 0, value: 0, remaining: 0 }
        },
        vouchers: { total_receipts: 0, total_payments: 0, total_refunds: 0, net: 0 }
    }


    // --- Bookings Query ---
    let bookingsQuery = supabase
        .from('bookings')
        .select('id, status, price')
        .eq('business_id', businessId)
        .eq('is_deleted', false)
        .gte('start_time', dateFrom)
        .lte('start_time', dateTo)

    if (branchId && branchId !== 'all') {
        bookingsQuery = bookingsQuery.eq('branch_id', branchId)
    }

    const { data: bookingsData } = await bookingsQuery

    // Fetch vouchers linked to these bookings to calculate remaining amount
    const bookingIds = bookingsData?.map((b: any) => b.id) || []
    let bookingVouchers: any[] = []

    if (bookingIds.length > 0) {
        const { data } = await supabase
            .from('vouchers')
            .select('booking_id, amount, type')
            .in('booking_id', bookingIds)
            .eq('is_deleted', false)
        bookingVouchers = data || []
    }

    const calculateStat = (status?: string) => {
        const filtered = status
            ? bookingsData?.filter((b: any) => b.status === status)
            : bookingsData

        if (!filtered || filtered.length === 0) return { count: 0, value: 0, remaining: 0 }

        const totalValue = filtered.reduce((sum: number, b: any) => sum + (Number(b.price) || 0), 0)

        // Calculate remaining for these bookings
        const totalRemaining = filtered.reduce((sum: number, b: any) => {
            // Get vouchers for this booking
            const vouchers = bookingVouchers.filter((v: any) => v.booking_id === b.id)
            const paid = vouchers.reduce((pSum: number, v: any) => {
                if (v.type === 'receipt') return pSum + Number(v.amount)
                if (v.type === 'refund') return pSum - Number(v.amount)
                return pSum
            }, 0)
            return sum + (Number(b.price) - paid)
        }, 0)

        return {
            count: filtered.length,
            value: totalValue,
            remaining: totalRemaining
        }
    }

    const bookingsStats = {
        total: calculateStat(),
        scheduled: calculateStat('scheduled'),
        completed: calculateStat('completed'),
        cancelled: calculateStat('cancelled'),
        no_show: calculateStat('no_show'),
    }

    // --- Vouchers Query ---
    let vouchersQuery = supabase
        .from('vouchers')
        .select('amount, type')
        .eq('business_id', businessId)
        .eq('is_deleted', false)
        .gte('created_at', dateFrom)
        .lte('created_at', dateTo)

    if (branchId && branchId !== 'all') {
        vouchersQuery = vouchersQuery.eq('branch_id', branchId)
    }

    const { data: vouchersData } = await vouchersQuery

    const total_receipts = vouchersData
        ?.filter((v: any) => v.type === 'receipt')
        .reduce((sum: number, v: any) => sum + Number(v.amount), 0) || 0

    const total_payments = vouchersData
        ?.filter((v: any) => v.type === 'payment')
        .reduce((sum: number, v: any) => sum + Number(v.amount), 0) || 0

    const total_refunds = vouchersData
        ?.filter((v: any) => v.type === 'refund')
        .reduce((sum: number, v: any) => sum + Number(v.amount), 0) || 0

    const vouchersStats = {
        total_receipts,
        total_payments,
        total_refunds,
        net: total_receipts - (total_payments + total_refunds)
    }

    return {
        bookings: bookingsStats,
        vouchers: vouchersStats
    }
}
