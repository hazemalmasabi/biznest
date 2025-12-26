'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'

export type Customer = {
    id: number
    business_id: number
    name: string
    phone: string
    email?: string | null
    date_of_birth?: string | null
    gender?: 'male' | 'female' | null
    notes?: string | null
    created_at: string
    bookings_count?: number
}

// Helper to get business ID
async function getBusinessId(supabase: any, userId: string): Promise<number | null> {
    // Strategy A: Check business_members (Primary source of truth for membership)
    const { data: member } = await supabase
        .from('business_members')
        .select('business_id')
        .eq('user_id', userId)
        .single()

    if (member?.business_id) return member.business_id

    // 1. Check profile for role and branch_id
    const { data: profile } = await supabase
        .from('profiles')
        .select('branch_id, role')
        .eq('id', userId)
        .single()

    if (!profile) return null

    // Strategy B: Owner lookup in businesses table (Fallback for older schema support)
    if (profile.role === 'owner') {
        const { data: business } = await supabase
            .from('businesses')
            .select('id')
            .eq('owner_id', userId)
            .single()
        if (business) return business.id
    }

    // Strategy C: Branch lookup (manager/staff)
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

export async function getCustomers(): Promise<Customer[]> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const businessId = await getBusinessId(supabase, user.id)
    if (!businessId) return []

    const { data: customers, error } = await supabase
        .from('customers')
        .select('*, bookings(count)')
        .eq('business_id', businessId)
        .eq('is_deleted', false)
        .eq('bookings.is_deleted', false) // Count only active bookings
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching customers:', error)
        return []
    }

    // Transform result to lift count
    return customers.map((c: any) => ({
        ...c,
        bookings_count: c.bookings ? c.bookings[0].count : 0
    })) as Customer[]
}

export async function createCustomer(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { message: 'Unauthorized' }

    const businessId = await getBusinessId(supabase, user.id)
    if (!businessId) return { message: 'Business not found' }

    const name = formData.get('name') as string
    const phone = formData.get('phone') as string
    const email = formData.get('email') as string
    const gender = formData.get('gender') as string
    const date_of_birth = formData.get('date_of_birth') as string
    const notes = formData.get('notes') as string

    const errors: Record<string, string> = {}

    if (!name || name.trim() === '') {
        errors.name = 'Name is required'
    }

    if (!phone || phone.trim() === '') {
        errors.phone = 'Phone is required'
    } else if (!/^\d+$/.test(phone)) {
        errors.phone = 'Phone must contain only numbers'
    }

    if (email && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
        errors.email = 'Email must contain only English characters, numbers, and symbols'
    }

    if (Object.keys(errors).length > 0) {
        return { errors }
    }

    // Check for duplicate phone
    const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('business_id', businessId)
        .eq('phone', phone)
        .eq('is_deleted', false) // Check active customers only? Or all? User said "prevent adding". Usually implies checking against active. If deleted, they can optionally restore. Let's stick to active for now to avoid blocking reuse of numbers from deleted records, OR safer: check all. User context implies active management. I'll check active first. If phone is unique constraint, it would be all. Let's assume unique for active.
        .maybeSingle()

    if (existingCustomer) {
        const cookieStore = await cookies()
        const lang = cookieStore.get('NEXT_LOCALE')?.value || 'en'
        return { errors: { phone: lang === 'ar' ? 'رقم الهاتف مسجل مسبقاً' : 'Customer with this phone number already exists' } }
    }

    const { data: newCustomer, error } = await supabase
        .from('customers')
        .insert({
            business_id: businessId,
            name,
            phone,
            email: email || null,
            gender: gender || null,
            date_of_birth: date_of_birth || null,
            notes: notes || null,
        })
        .select()
        .single()

    if (error) {
        return { message: error.message }
    }

    revalidatePath('/dashboard/customers')
    return { success: true, customer: newCustomer }
}

export async function updateCustomer(id: number, formData: FormData) {
    const supabase = await createClient()

    const name = formData.get('name') as string
    const phone = formData.get('phone') as string
    const email = formData.get('email') as string
    const gender = formData.get('gender') as string
    const date_of_birth = formData.get('date_of_birth') as string
    const notes = formData.get('notes') as string

    const errors: Record<string, string> = {}

    if (!name || name.trim() === '') {
        errors.name = 'Name is required'
    }

    if (!phone || phone.trim() === '') {
        errors.phone = 'Phone is required'
    } else if (!/^\d+$/.test(phone)) {
        errors.phone = 'Phone must contain only numbers'
    }

    if (email && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
        errors.email = 'Email must contain only English characters, numbers, and symbols'
    }

    if (Object.keys(errors).length > 0) {
        return { errors }
    }

    // Check for duplicate phone (excluding self)
    // We need business_id here. 
    // We can query by phone directly within the scope of user's access (RLS)
    const { data: existing } = await supabase
        .from('customers')
        .select('id')
        .eq('phone', phone)
        .eq('is_deleted', false)
        .neq('id', id)
        .maybeSingle()

    if (existing) {
        // Double check business_id match? RLS ensures we only see our business's customers.
        const cookieStore = await cookies()
        const lang = cookieStore.get('NEXT_LOCALE')?.value || 'en'
        return { errors: { phone: lang === 'ar' ? 'رقم الهاتف مسجل مسبقاً' : 'Customer with this phone number already exists' } }
    }

    const { error } = await supabase
        .from('customers')
        .update({
            name,
            phone,
            email: email || null,
            gender: gender || null,
            date_of_birth: date_of_birth || null,
            notes: notes || null,
            updated_at: new Date().toISOString()
        })
        .eq('id', id)

    if (error) {
        return { message: error.message }
    }

    revalidatePath('/dashboard/customers')
    revalidatePath('/dashboard/bookings')

    // Fetch updated customer to return
    const { data: updatedCustomer } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single()

    return { success: true, customer: updatedCustomer }
}

export async function deleteCustomer(id: number) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { message: 'Unauthorized' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'owner' && profile?.role !== 'manager') {
        return { message: 'Permission denied: Only Managers can delete customers' }
    }

    const { error } = await supabase
        .from('customers')
        .update({
            is_deleted: true
        })
        .eq('id', id)

    if (error) {
        return { message: error.message }
    }

    revalidatePath('/dashboard/customers')
    revalidatePath('/dashboard/bookings')
    return { success: true }
}
