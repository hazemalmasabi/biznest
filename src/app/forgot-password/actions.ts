'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

export async function requestReset(prevState: any, formData: FormData) {
    const email = formData.get('email') as string

    if (!email) {
        return { error: 'required_field', success: false } // Let UI handle exact text
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
        return { error: 'invalid_email_format', success: false }
    }

    // 1. Check if email exists in profiles using Admin Client to bypass RLS
    // Anonymous users cannot read profiles table due to RLS policies
    const supabaseAdmin = await createAdminClient()
    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single()

    if (!profile) {
        // Also check if user exists in Auth users primarily?
        // Actually, if profile sync is working, it should be in profiles.
        // If not in profiles, we block.
        return { error: 'email_not_found', success: false }
    }

    const supabase = await createClient()

    // 2. Request Reset
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
    const origin = `${protocol}://${host}`

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/callback?next=/reset-password`,
    })

    if (error) {
        return { error: error.message, success: false }
    }

    return { success: true, error: '' }
}
