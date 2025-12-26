'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type Service = {
    id: number
    branch_id: number
    name: string
    price: number
    duration: 'hour' | 'day' | 'open'
    status: 'active' | 'maintenance' | 'closed'
    created_at: string
    branches?: { name: string } | { name: string }[] | null
}

export async function getServices() {
    const supabase = await createClient()

    // 1. Get Current User Scope
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    // Get currentUser role & branch
    const { data: profile } = await supabase
        .from('profiles')
        .select('role, branch_id')
        .eq('id', user.id)
        .single()

    // 2. Fetch Services
    // If Owner: Fetch all.
    // If Manager/Assistant/Receptionist: Fetch only for their branch.

    let query = supabase
        .from('services')
        .select(`
            id,
            name,
            price,
            duration,
            status,
            branch_id,
            created_at,
            branches (name)
        `)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })

    if (profile?.role !== 'owner') {
        if (profile?.branch_id) {
            query = query.eq('branch_id', profile.branch_id)
        } else {
            // Fallback for edge case: non-owner has no branch
            return []
        }
    }

    const { data: services, error } = await query

    if (error) {
        console.error('Error fetching services:', error)
        return []
    }

    return services as Service[]
}

export async function createService(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Unauthorized' }

    const name = formData.get('name') as string
    const branchId = formData.get('branch_id') as string // ID from select
    const priceStr = formData.get('price') as string
    const duration = formData.get('duration') as string
    const status = formData.get('status') as string

    // Validate
    if (!name || !branchId || !priceStr || !duration || !status) {
        return { error: 'All fields are required' }
    }

    const price = parseFloat(priceStr)
    const branchIdInt = parseInt(branchId, 10)

    // Permission Check: Owner or Manager of THAT branch
    const { data: profile } = await supabase
        .from('profiles')
        .select('role, branch_id')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'owner') {
        if (profile?.role !== 'manager') {
            return { error: 'Permission denied: Only Managers can create services' }
        }
        if (!profile?.branch_id || profile.branch_id !== branchIdInt) {
            return { error: 'Permission denied: Cannot add service to this branch' }
        }
    }

    const { error } = await supabase
        .from('services')
        .insert({
            name,
            branch_id: branchIdInt,
            price,
            duration,
            status,
        })

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/dashboard/services')
    return { success: true }
}

export async function updateService(id: number, formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const name = formData.get('name') as string
    const branchId = formData.get('branch_id') as string
    const priceStr = formData.get('price') as string
    const duration = formData.get('duration') as string
    const status = formData.get('status') as string

    // Validate
    if (!name || !branchId || !priceStr || !duration || !status) {
        return { error: 'All fields are required' }
    }

    const price = parseFloat(priceStr)
    const branchIdInt = parseInt(branchId, 10)

    // Permission Check
    const { data: profile } = await supabase
        .from('profiles')
        .select('role, branch_id')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'owner') {
        const allowedRoles = ['manager', 'assistant_manager']
        if (!allowedRoles.includes(profile?.role)) {
            return { error: 'Permission denied' }
        }
        if (profile?.branch_id !== branchIdInt) {
            return { error: 'Permission denied: functionality restricted to your branch' }
        }
        // Verify target service belongs to user's branch (prevent editing cross-branch by ID hacking)
        const { data: currentService } = await supabase.from('services').select('branch_id').eq('id', id).single()
        if (currentService?.branch_id !== profile?.branch_id) {
            return { error: 'Permission denied: Cannot edit service from another branch' }
        }
    }

    const { error } = await supabase
        .from('services')
        .update({
            name,
            branch_id: branchIdInt,
            price,
            duration,
            status,
            updated_at: new Date().toISOString()
        })
        .eq('id', id)

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/dashboard/services')
    return { success: true }
}

export async function deleteService(id: number) {
    const supabase = await createClient()

    // Soft Delete
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, branch_id')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'owner') {
        if (profile?.role !== 'manager') {
            return { error: 'Permission denied: Only Managers can delete services' }
        }
        // Fetch service to check branch
        const { data: service } = await supabase.from('services').select('branch_id').eq('id', id).single()
        if (!service || service.branch_id !== profile.branch_id) {
            return { error: 'Permission denied: Cannot delete service from another branch' }
        }
    }

    const { error } = await supabase
        .from('services')
        .update({
            is_deleted: true
        })
        .eq('id', id)

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/dashboard/services')
    return { success: true }
}
