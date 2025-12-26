'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type Branch = {
    id: number
    business_id: number
    name: string
    address: string | null
    phone: string | null
    is_main: boolean
    created_at: string
}

export async function getBranches() {
    const supabase = await createClient()

    // First get the user's business membership to know which business they belong to
    // In our simplified model, a user belongs to one business.
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return []

    let businessId: number | null = null

    // 1. Check Members
    const { data: member } = await supabase
        .from('business_members')
        .select('business_id')
        .eq('user_id', user.id)
        .single()

    if (member) {
        businessId = member.business_id
    } else {
        // 2. Check Owner
        const { data: business } = await supabase
            .from('businesses')
            .select('id')
            .eq('owner_id', user.id)
            .single()
        if (business) {
            businessId = business.id
        } else {
            // 3. Fallback: Check Profile Branch
            const { data: profile } = await supabase.from('profiles').select('branch_id').eq('id', user.id).single()
            if (profile?.branch_id) {
                const { data: branch } = await supabase.from('branches').select('business_id').eq('id', profile.branch_id).single()
                if (branch) businessId = branch.business_id
            }
        }
    }

    if (!businessId) return []

    const { data: branches, error } = await supabase
        .from('branches')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_deleted', false) // Use DISTINCT FROM true if NULL is posssible but default is FALSE so = false is fine
        .order('id', { ascending: true })

    if (error) {
        console.error('Error fetching branches:', error)
        return []
    }

    return branches as Branch[]
}

export async function getBranchesCount() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return 0

    const { data: member } = await supabase
        .from('business_members')
        .select('business_id')
        .eq('user_id', user.id)
        .single()

    if (!member) return 0

    const { count, error } = await supabase
        .from('branches')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', member.business_id)
        .eq('is_deleted', false)

    if (error) {
        console.error('Error fetching branches count:', error)
        return 0
    }

    return count || 0
}

export async function createBranch(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Unauthorized' }

    // Get business_id
    const { data: member } = await supabase
        .from('business_members')
        .select('business_id')
        .eq('user_id', user.id)
        .single()

    if (!member) return { error: 'No business found' }

    const name = formData.get('name') as string
    const address = formData.get('address') as string
    const phone = formData.get('phone') as string
    const isMain = formData.get('is_main') === 'on'

    // Server-side validation
    if (!name) return { error: 'Name is required' }
    if (!address) return { error: 'Address is required' }
    if (!phone || !/^\d+$/.test(phone)) return { error: 'Phone must contain numbers only' }

    // If setting as main, turn off others
    if (isMain) {
        await supabase
            .from('branches')
            .update({ is_main: false })
            .eq('business_id', member.business_id)
    }

    const { error } = await supabase
        .from('branches')
        .insert({
            business_id: member.business_id,
            name,
            address,
            phone,
            is_main: isMain
        })

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/dashboard/branches')
    return { success: true }
}

export async function updateBranch(id: number, formData: FormData) {
    const supabase = await createClient()

    const name = formData.get('name') as string
    const address = formData.get('address') as string
    const phone = formData.get('phone') as string
    const isMain = formData.get('is_main') === 'on'

    if (!name) return { error: 'Name is required' }
    if (!address) return { error: 'Address is required' }
    if (!phone || !/^\d+$/.test(phone)) return { error: 'Phone must contain numbers only' }

    if (isMain) {
        // Get business_id for this branch to unset others
        const { data: branch } = await supabase.from('branches').select('business_id').eq('id', id).single()
        if (branch) {
            await supabase
                .from('branches')
                .update({ is_main: false })
                .eq('business_id', branch.business_id)
        }
    }

    const { error } = await supabase
        .from('branches')
        .update({
            name,
            address: address || null,
            phone: phone || null,
            is_main: isMain,
            updated_at: new Date().toISOString()
        })
        .eq('id', id)

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/dashboard/branches')
    return { success: true }
}

export async function deleteBranch(id: number) {
    const supabase = await createClient()

    // SOFT DELETE: Update is_deleted to true instead of removing
    const { error } = await supabase
        .from('branches')
        .update({
            is_deleted: true,
            deleted_at: new Date().toISOString()
        })
        .eq('id', id)

    if (error) return { error: error.message }

    revalidatePath('/dashboard/branches')
    return { success: true }
}
