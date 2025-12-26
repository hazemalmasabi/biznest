'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function updateBasicInfo(formData: FormData) {
    const supabase = await createClient()
    const fullName = formData.get('fullName') as string
    const phone = formData.get('phone') as string

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        redirect('/login')
    }

    // Update Auth Metadata (optional, but good for sync)
    await supabase.auth.updateUser({
        data: { full_name: fullName, phone: phone }
    })

    // Update Profile Table
    const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName, phone: phone })
        .eq('id', user.id)

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/dashboard/settings')
    return { success: true }
}

export async function updateAuthInfo(formData: FormData) {
    const supabase = await createClient()
    let emailInput = formData.get('email') as string
    const password = formData.get('password') as string

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const updates: any = {}
    let messageKey = ""

    // Email/Username Update Logic
    if (emailInput) {
        // If input has no '@', treat as username and append domain
        if (!emailInput.includes('@')) {
            emailInput = `${emailInput}@biznest.local`
        }

        if (emailInput !== user.email) {
            updates.email = emailInput
            messageKey = "email_update_notice"
        }
    }

    // Password Update Logic with Strict Validation
    if (password && password.trim() !== '') {
        if (password.length < 8) {
            return { error: 'password_min_length' } // We'll handle translation in the component
        }
        updates.password = password
        if (!messageKey) messageKey = "password_update_success"
        else messageKey = "auth_update_success" // Both updated
    }

    if (Object.keys(updates).length === 0) {
        return { success: true }
    }

    // Update Auth (Email, Password)
    const { error: updateError } = await supabase.auth.updateUser(updates)

    if (updateError) {
        console.error("Auth update error:", updateError)
        if (updateError.message.includes("registered") || updateError.message.includes("already exists") || updateError.status === 422) {
            return { error: 'email_exists' }
        }
        return { error: updateError.message }
    }

    revalidatePath('/dashboard/settings')
    return { success: true, message: messageKey }
}

export async function updateBusiness(formData: FormData) {
    const supabase = await createClient()
    const businessId = formData.get('businessId') as string
    const name = formData.get('businessName') as string

    // Verify ownership
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: membership } = await supabase
        .from('business_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('business_id', parseInt(businessId))
        .single()

    if (!membership || membership.role !== 'owner') {
        return { error: "Unauthorized: Only owners can update business details." }
    }

    const { error } = await supabase
        .from('businesses')
        .update({ name })
        .eq('id', parseInt(businessId))

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/settings')
    return { success: true }
}
