'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function createBusiness(formData: FormData) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/login')
    }

    const name = formData.get('businessName') as string

    // 1. Create Business
    const { data: business, error: businessError } = await supabase
        .from('businesses')
        .insert({ name })
        .select()
        .single()

    if (businessError) {
        redirect(`/onboarding?step=business&error=${encodeURIComponent(businessError.message)}`)
    }

    // 2. Add User as Owner
    const { error: memberError } = await supabase
        .from('business_members')
        .insert({
            business_id: business.id,
            user_id: user.id,
            role: 'owner'
        })

    if (memberError) {
        redirect(`/onboarding?step=business&error=${encodeURIComponent(memberError.message)}`)
    }

    redirect(`/onboarding?step=branch&businessId=${business.id}`)
}

export async function createBranch(formData: FormData) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/login')
    }

    const businessId = formData.get('businessId') as string
    const name = formData.get('branchName') as string
    const address = formData.get('branchAddress') as string
    const phone = formData.get('branchPhone') as string

    // 1. Create Branch
    const { error: branchError } = await supabase
        .from('branches')
        .insert({
            business_id: businessId,
            name,
            address,
            phone,
            is_main: true
        })

    if (branchError) {
        redirect(`/onboarding?step=branch&businessId=${businessId}&error=${encodeURIComponent(branchError.message)}`)
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard')
}
