'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  let inputEmail = formData.get('email') as string
  const password = formData.get('password') as string

  // Check if input is a valid email
  const isEmail = inputEmail.includes('@')

  // If not email, assume username and append domain
  if (!isEmail) {
    inputEmail = `${inputEmail}@biznest.local`
  }

  const data = {
    email: inputEmail,
    password: password,
  }

  const { data: { user }, error } = await supabase.auth.signInWithPassword(data)

  if (error || !user) {
    redirect('/login?error=Invalid login credentials')
  }

  // Check if soft deleted
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_deleted, branch_id')
    .eq('id', user.id)
    .single()

  if (profile?.is_deleted) {
    await supabase.auth.signOut()
    redirect('/login?error=account_disabled')
  }

  // Check if branch is deleted
  if (profile?.branch_id) {
    const { data: branch } = await supabase
      .from('branches')
      .select('is_deleted')
      .eq('id', profile.branch_id)
      .single()

    if (branch?.is_deleted) {
      await supabase.auth.signOut()
      redirect('/login?error=branch_deleted')
    }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()
  const supabaseAdmin = await createAdminClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string
  const fullName = formData.get('fullName') as string
  const phone = formData.get('phone') as string

  // Check if email already exists using Admin Client (bypassing RLS)
  // Assumes 'profiles' table has 'email' column populated via trigger/migration
  const { data: existingUser } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single()

  if (existingUser) {
    redirect('/login?signup=true&error=email_exists')
  }

  if (password.length < 8) {
    redirect('/login?signup=true&error=Password must be at least 8 characters')
  }

  if (password !== confirmPassword) {
    redirect('/login?signup=true&error=Passwords do not match')
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone: phone,
      }
    }
  })

  if (error) {
    console.error("Signup error:", error)
    if (error.message.includes("registered") || error.message.includes("already exists") || error.status === 422) {
      redirect('/login?signup=true&error=email_exists')
    }
    redirect(`/login?signup=true&error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath('/', 'layout')
  redirect('/login?message=Check email to continue sign in process')
}
