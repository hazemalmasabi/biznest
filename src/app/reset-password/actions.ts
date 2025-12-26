'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function updatePassword(prevState: any, formData: FormData) {
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string
    const errors: { [key: string]: string } = {}
    const payload = { password, confirmPassword }

    if (!password) {
        errors.password = 'required_field'
    }
    if (!confirmPassword) {
        errors.confirmPassword = 'required_field'
    }

    // Check Mismatch
    if (password && confirmPassword && password !== confirmPassword) {
        errors.confirmPassword = 'password_mismatch'
    }

    // Check Password Rules
    if (password) {
        if (password.length < 8) {
            errors.password = 'password_length'
        } else if (!/^[\x20-\x7E]*$/.test(password)) {
            errors.password = 'english_only'
        }
    }

    if (Object.keys(errors).length > 0) {
        return { errors, payload }
    }

    const supabase = await createClient()

    const { error } = await supabase.auth.updateUser({
        password: password
    })

    if (error) {
        return { message: error.message, payload } // General error
    }

    return { success: true }
}
