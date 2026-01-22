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
    slug: string | null
    image_url?: string | null
    location_url?: string | null
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
        .order('is_main', { ascending: false })
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

// Helper to upload file
async function uploadBranchImage(file: File, userId: string): Promise<string | null> {
    if (!file || file.size === 0) return null

    const supabase = await createClient()
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}/${Date.now()}.${fileExt}`

    const { data, error } = await supabase.storage
        .from('branches')
        .upload(fileName, file)

    if (error) {
        console.error('Upload Error:', error)
        return null
    }

    const { data: { publicUrl } } = supabase.storage
        .from('branches')
        .getPublicUrl(fileName)

    return publicUrl
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
    const slug = formData.get('slug') as string
    const locationUrl = formData.get('location_url') as string
    const imageFile = formData.get('image') as File

    // Server-side validation
    if (!name) return { error: 'Name is required' }
    if (!address) return { error: 'Address is required' }
    if (!phone || !/^\d+$/.test(phone)) return { error: 'Phone must contain numbers only' }

    // Slug validation
    if (slug) {
        if (slug.length < 4) return { error: 'Slug must be at least 4 characters long' }
        if (!/^[a-zA-Z0-9]+$/.test(slug)) return { error: 'Slug must contain only English letters and numbers' }
        if (!/[a-zA-Z]/.test(slug)) return { error: 'Slug must contain at least one letter' }
    }

    // If setting as main, turn off others
    if (isMain) {
        await supabase
            .from('branches')
            .update({ is_main: false })
            .eq('business_id', member.business_id)
    }

    // Upload Image
    let imageUrl: string | null = null
    if (imageFile && imageFile.size > 0) {
        imageUrl = await uploadBranchImage(imageFile, user.id)
    }

    const { data: newBranch, error } = await supabase
        .from('branches')
        .insert({
            business_id: member.business_id,
            name,
            address,
            phone,
            is_main: isMain,
            slug: slug || null,
            location_url: locationUrl || null,
            image_url: imageUrl
        })
        .select()
        .single()

    if (error) {
        if (error.code === '23505') {
            return { error: 'هذا الرابط المختصر مستخدم بالفعل، يرجى اختيار رابط آخر.' }
        }
        return { error: error.message }
    }

    revalidatePath('/dashboard/branches')
    return { success: true, branch: newBranch }
}

export async function updateBranch(id: number, formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // We need user for upload path, even if we don't strictly enforce auth check logic beyond standard (which assumes middleware/getUser handles it but let's be safe if we use userId)
    if (!user) return { error: 'Unauthorized' }

    const name = formData.get('name') as string
    const address = formData.get('address') as string
    const phone = formData.get('phone') as string
    const isMain = formData.get('is_main') === 'on'
    const slug = formData.get('slug') as string
    const locationUrl = formData.get('location_url') as string
    const imageFile = formData.get('image') as File

    if (!name) return { error: 'Name is required' }
    if (!address) return { error: 'Address is required' }
    if (!phone || !/^\d+$/.test(phone)) return { error: 'Phone must contain numbers only' }

    // Slug validation
    if (slug) {
        if (slug.length < 4) return { error: 'Slug must be at least 4 characters long' }
        if (!/^[a-zA-Z0-9]+$/.test(slug)) return { error: 'Slug must contain only English letters and numbers' }
        if (!/[a-zA-Z]/.test(slug)) return { error: 'Slug must contain at least one letter' }
    }

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

    // Handle Image Upload
    let imageUrl: string | undefined = undefined
    if (imageFile && imageFile.size > 0) {
        const url = await uploadBranchImage(imageFile, user.id)
        if (url) imageUrl = url
    }

    const updatePayload: any = {
        name,
        address: address || null,
        phone: phone || null,
        is_main: isMain,
        slug: slug || null,
        location_url: locationUrl || null,
        updated_at: new Date().toISOString()
    }

    if (imageUrl) {
        updatePayload.image_url = imageUrl
    }

    const { error } = await supabase
        .from('branches')
        .update(updatePayload)
        .eq('id', id)

    if (error) {
        console.error('Error updating branch:', error)
        if (error.code === '23505') {
            return { error: 'هذا الرابط المختصر مستخدم بالفعل، يرجى اختيار رابط آخر.' }
        }
        return { error: 'Failed to update branch' }
    }

    revalidatePath('/dashboard/branches')
    return { success: true }
}

export type WorkingHour = {
    id?: number
    branch_id: number
    day_of_week: number
    start_time: string | null
    end_time: string | null
    is_closed: boolean
}

export async function getBranchWorkingHours(branchId: number) {
    const supabase = await createClient()
    const { data: hours, error } = await supabase
        .from('branch_working_hours')
        .select('*')
        .eq('branch_id', branchId)
        .order('day_of_week')

    if (error) {
        console.error('Error fetching working hours:', error)
        return []
    }
    return hours as WorkingHour[]
}

export async function updateBranchWorkingHours(branchId: number, hours: WorkingHour[]) {
    const supabase = await createClient()

    // Upsert logic
    const { error } = await supabase
        .from('branch_working_hours')
        .upsert(
            hours.map(h => ({
                branch_id: branchId,
                day_of_week: h.day_of_week,
                start_time: h.start_time,
                end_time: h.end_time,
                is_closed: h.is_closed
                // id is optional, upsert constraint is (branch_id, day_of_week)
            })),
            { onConflict: 'branch_id, day_of_week' }
        )

    if (error) {
        console.error('Error updating working hours:', error)
        return { error: 'Failed to update working hours' }
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
            is_deleted: true
        })
        .eq('id', id)

    if (error) return { error: error.message }

    revalidatePath('/dashboard/branches')
    return { success: true }
}
