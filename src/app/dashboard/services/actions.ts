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
    image_url?: string | null
    description?: string | null
    branches?: { name: string } | { name: string }[] | null
}

export type ServiceDuration = {
    id?: number
    service_id?: number
    duration_value: number
    duration_unit: 'minute' | 'hour' | 'day' | 'open'
    price: number
}

// Helper to fetch durations
export async function getServiceDurations(serviceId: number) {
    const supabase = await createClient()
    const { data } = await supabase
        .from('service_durations')
        .select('*')
        .eq('service_id', serviceId)
    return (data as ServiceDuration[]) || []
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
            image_url,
            created_at,
            branches!inner (name, business_id)
        `)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })

    if (profile?.role === 'owner') {
        const { data: membership } = await supabase.from('business_members').select('business_id').eq('user_id', user.id).single()
        if (membership?.business_id) {
            query = query.eq('branches.business_id', membership.business_id)
        }
    } else {
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

// Helper to upload file
async function uploadServiceImage(file: File, userId: string): Promise<string | null> {
    if (!file || file.size === 0) return null

    // Create bucket if not exists usually done manually, assuming 'services' exists or 'public'
    // Let's try 'services' bucket
    const supabase = await createClient()
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}/${Date.now()}.${fileExt}`

    // We need to convert File to ArrayBuffer for upload if it's node environment, 
    // but supabase-js handles File object in some envs. 
    // In server actions, 'file' is a File object.

    const { data, error } = await supabase.storage
        .from('services')
        .upload(fileName, file)

    if (error) {
        console.error('Upload Error:', error)
        return null
    }

    const { data: { publicUrl } } = supabase.storage
        .from('services')
        .getPublicUrl(fileName)

    return publicUrl
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
    const description = formData.get('description') as string
    const durationsJson = formData.get('durations') as string
    const imageFile = formData.get('image') as File

    // Validate
    if (!name || !branchId || !duration || !status) {
        return { error: 'All fields are required' }
    }

    // Price optional if duration is open
    if (duration !== 'open' && !priceStr) {
        return { error: 'All fields are required' }
    }

    const price = priceStr ? parseFloat(priceStr) : 0
    const branchIdInt = parseInt(branchId, 10)

    // Permission Check: Owner or Manager of THAT branch
    const { data: profile } = await supabase
        .from('profiles')
        .select('role, branch_id')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'owner') {
        const allowedRoles = ['manager', 'assistant_manager']
        if (!allowedRoles.includes(profile?.role)) {
            return { error: 'Permission denied: Only Managers and Assistant Managers can create services' }
        }
        if (!profile?.branch_id || profile.branch_id !== branchIdInt) {
            return { error: 'Permission denied: Cannot add service to this branch' }
        }
    }

    // Upload Image
    let imageUrl: string | null = null
    if (imageFile && imageFile.size > 0) {
        imageUrl = await uploadServiceImage(imageFile, user.id)
    }

    const { data: newService, error } = await supabase
        .from('services')
        .insert({
            name,
            branch_id: branchIdInt,
            price,
            duration,
            status,
            image_url: imageUrl,
            description: description || null
        })
        .select()
        .single()

    if (error) {
        return { error: error.message }
    }

    // Insert Durations if any
    if (durationsJson) {
        try {
            const durations: ServiceDuration[] = JSON.parse(durationsJson)
            if (durations.length > 0) {
                const rows = durations.map(d => ({
                    service_id: newService.id,
                    duration_value: d.duration_value,
                    duration_unit: d.duration_unit,
                    price: d.price
                }))
                const { error: durError } = await supabase.from('service_durations').insert(rows)
                if (durError) console.error("Create Durations Error:", durError)
            }
        } catch (e) {
            console.error("Error parsing durations JSON", e)
        }
    }

    revalidatePath('/dashboard/services')
    return { success: true }
}

export async function updateService(id: number, formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser() // Need user for upload path

    if (!user) return { error: 'Unauthorized' }

    const name = formData.get('name') as string
    const branchId = formData.get('branch_id') as string
    const priceStr = formData.get('price') as string
    const duration = formData.get('duration') as string
    const status = formData.get('status') as string
    const description = formData.get('description') as string
    const durationsJson = formData.get('durations') as string
    const imageFile = formData.get('image') as File

    // Validate
    if (!name || !branchId || !duration || !status) {
        return { error: 'All fields are required' }
    }

    if (duration !== 'open' && !priceStr) {
        return { error: 'All fields are required' }
    }

    const price = priceStr ? parseFloat(priceStr) : 0
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

    // Handle Image Upload
    let imageUrl: string | undefined = undefined
    if (imageFile && imageFile.size > 0) {
        const url = await uploadServiceImage(imageFile, user.id)
        if (url) imageUrl = url
    }

    // Build update object
    const updatePayload: any = {
        name,
        branch_id: branchIdInt,
        price,
        duration,
        status,
        description: description || null,
        updated_at: new Date().toISOString()
    }

    if (imageUrl) {
        updatePayload.image_url = imageUrl
    }

    const { error } = await supabase
        .from('services')
        .update(updatePayload)
        .eq('id', id)

    if (error) {
        return { error: error.message }
    }

    // Handle Durations: Delete all old, insert new (simple replace strategy)
    // Clear if mode is open OR if durations field is sent
    if (duration === 'open' || durationsJson) {
        try {
            // 1. Delete existing records for this service
            await supabase.from('service_durations').delete().eq('service_id', id)

            // 2. Insert new ones if provided (only if mode is not open)
            if (duration !== 'open' && durationsJson) {
                const durations: ServiceDuration[] = JSON.parse(durationsJson)
                if (durations.length > 0) {
                    const rows = durations.map(d => ({
                        service_id: id,
                        duration_value: d.duration_value,
                        duration_unit: d.duration_unit,
                        price: d.price
                    }))
                    const { error: durError } = await supabase.from('service_durations').insert(rows)
                    if (durError) console.error("Update Durations Error:", durError)
                }
            }
        } catch (e) {
            console.error("Error parsing/saving durations:", e)
        }
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
        const allowedRoles = ['manager', 'assistant_manager']
        if (!allowedRoles.includes(profile?.role)) {
            return { error: 'Permission denied: Only Managers and Assistant Managers can delete services' }
        }
        // Fetch service to check branch
        const { data: service } = await supabase.from('services').select('branch_id').eq('id', id).single()
        if (!service || !profile?.branch_id || service.branch_id !== profile.branch_id) {
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
