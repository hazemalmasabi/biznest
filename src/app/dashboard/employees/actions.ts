'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

export async function createEmployee(formData: FormData) {
    const supabase = await createClient()

    // 1. Validate Session & Permissions
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data: currentUserProfile } = await supabase
        .from('profiles')
        .select('role, branch_id')
        .eq('id', user.id)
        .single()

    const name = formData.get('name') as string
    const phone = formData.get('phone') as string
    const username = formData.get('username') as string
    const password = formData.get('password') as string
    const role = formData.get('role') as string
    const branchId = formData.get('branch_id') as string

    // Validate Input
    if (!name || !username || !password || !role) {
        return { error: 'Missing required fields' }
    }

    // Check if Username Exists
    const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .single()

    if (existingUser) {
        return { fieldErrors: { username: 'USERNAME_EXISTS' } }
    }

    // Permission Check
    if (currentUserProfile?.role !== 'owner') {
        // Managers/Assistants can only add to their own branch
        if (currentUserProfile?.role === 'manager' || currentUserProfile?.role === 'assistant_manager') {
            // Check if branchId matches (and implicitly that they have a branch_id)
            if (!currentUserProfile.branch_id || currentUserProfile.branch_id.toString() !== branchId) {
                return { error: 'You can only add employees to your own branch' }
            }
        } else {
            return { error: 'Permission denied: Insufficient role' }
        }
    }

    // 2. Create Auth User (Email Proxy Strategy)
    // We use a service role client to create the user without email confirmation
    const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    )

    // Construct proxy email
    const emailProxy = `${username}@biznest.local`

    // Attempt to create user in Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: emailProxy,
        password: password,
        email_confirm: true,
        user_metadata: {
            full_name: name,
        }
    })

    if (authError) {
        console.error('Auth creation error:', authError)
        return { error: authError.message }
    }

    if (!authData.user) {
        return { error: 'Failed to create user' }
    }

    // 3. Update Profile with Extra Data (Role, Branch, Phone, Username)
    // We rely on the trigger to create the profile row, so we UPDATE it.
    // However, to be robust, we use upsert to handle cases where trigger might lag or fail slightly, though for ID PK it's safe.

    // Convert branchId to number if present
    const branchIdInt = branchId ? parseInt(branchId, 10) : null

    const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
            id: authData.user.id,
            full_name: name,
            username: username,
            phone: phone,
            role: role,
            branch_id: branchIdInt,
            updated_at: new Date().toISOString(),
        })

    if (profileError) {
        console.error('Profile update error:', profileError)
        // Rollback: Delete the auth user if profile creation failed to avoid orphans
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        return { error: `Profile creation failed: ${profileError.message}` }
    }

    revalidatePath('/dashboard/employees')
    return { success: true }
}

export async function deleteEmployee(employeeId: string) {
    const supabase = await createClient()

    // 1. Validate Session & Permissions
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data: currentUserProfile } = await supabase
        .from('profiles')
        .select('role, branch_id')
        .eq('id', user.id)
        .single()

    if (currentUserProfile?.role !== 'owner' && currentUserProfile?.role !== 'manager') {
        return { error: 'Permission denied: Insufficient privileges' }
    }

    if (currentUserProfile?.role === 'manager') {
        // Additional checks for managers:
        // 1. Can only delete in own branch
        // 2. Cannot delete Owner
        const { data: targetProfile } = await supabase
            .from('profiles')
            .select('branch_id, role')
            .eq('id', employeeId)
            .single()

        if (!targetProfile) {
            return { error: 'Employee not found' }
        }

        if (targetProfile.branch_id !== currentUserProfile.branch_id) {
            return { error: 'Permission denied: You can only delete employees in your branch' }
        }

        if (targetProfile.role === 'owner') {
            return { error: 'Permission denied: Cannot delete owner' }
        }
    }

    // 2. Soft Delete Profile (Update deleted_at)
    // We do NOT delete the Auth user to preserve history, but effectively "deactivate" them in the app.
    // Ideally, we should also ban/block the auth user, but for now we focus on the profile.

    // Check if we need admin client for this? Regular client might suffice if RLS allows owner to update.
    // However, existing code uses admin for robust operations. Let's start with regular client if possible, 
    // or keep admin if we decide to manipulate Auth later.
    // Current deleteEmployee uses valid session check.

    // Let's use the same admin client pattern for consistency and bypassing RLS if needed (though Owner should have access).
    const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    )

    const { error } = await supabaseAdmin
        .from('profiles')
        .update({
            is_deleted: true
        })
        .eq('id', employeeId)

    if (error) {
        console.error('Soft delete error:', error)
        return { error: error.message }
    }

    revalidatePath('/dashboard/employees')
    return { success: true }
}

export async function updateEmployee(id: string, formData: FormData) {
    const supabase = await createClient()

    // 1. Validate Session & Permissions
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data: currentUserProfile } = await supabase
        .from('profiles')
        .select('role, branch_id')
        .eq('id', user.id)
        .single()

    // Permission Check: Owner or Manager of same branch?
    // For simplicity, let's say only Owners can edit sensitive fields like username/role for now, 
    // or Managers can edit their own staff.
    // Existing check in create:
    // Manager/Assistant can add/edit to their own branch.
    // Let's replicate basic check.

    // We need to fetch the target employee to check their branch if the current user is not owner
    if (currentUserProfile?.role !== 'owner') {
        const { data: targetProfile } = await supabase.from('profiles').select('branch_id').eq('id', id).single()
        if (!targetProfile || targetProfile.branch_id !== currentUserProfile?.branch_id) {
            return { error: 'Permission denied' }
        }
    }

    const name = formData.get('name') as string
    const phone = formData.get('phone') as string
    const username = formData.get('username') as string
    const password = formData.get('password') as string
    const role = formData.get('role') as string
    const branchId = formData.get('branch_id') as string

    // Validate Input
    if (!name || !username || !role) {
        return { error: 'Missing required fields' }
    }

    // Check Username Uniqueness (if changed)
    // We skip this check for simplicity or implement it if critical. 
    // Ideally check if username exists AND id != current_id.
    const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .neq('id', id)
        .single()

    if (existingUser) {
        return { fieldErrors: { username: 'USERNAME_EXISTS' } }
    }

    const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 2. Update Auth User (Email/Password)
    const updates: any = {
        email: `${username}@biznest.local`,
        user_metadata: { full_name: name, role: role } // Sync metadata
    }
    if (password && password.length >= 8) {
        updates.password = password
    }

    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, updates)

    if (authError) {
        return { error: authError.message }
    }

    // 3. Update Profile
    const branchIdInt = branchId ? parseInt(branchId, 10) : null
    const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({
            full_name: name,
            username: username,
            phone: phone,
            role: role,
            branch_id: branchIdInt,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)

    if (profileError) {
        return { error: profileError.message }
    }

    revalidatePath('/dashboard/employees')
    return { success: true }
}
