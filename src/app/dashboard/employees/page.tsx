import { createClient } from '@/lib/supabase/server'
import { dictionaries, Locale } from '@/lib/dictionaries'
import { EmployeeList } from './employee-list'
import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export default async function EmployeesPage() {
    const cookieStore = await cookies()
    const lang = (cookieStore.get('NEXT_LOCALE')?.value || 'en') as Locale
    const dict = dictionaries[lang]

    const supabase = await createClient()

    // 1. Get Current User & Profile
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        // middleware handles redirect
        return <div>Unauthorized</div>
    }

    const { data: userProfile } = await supabase
        .from('profiles')
        .select('role, branch_id')
        .eq('id', user.id)
        .single()

    // 2. Fetch Employees (Profiles with join branches)
    // Only fetch employees that belong to visible scope
    let query = supabase
        .from('profiles')
        .select(`
            id, 
            full_name, 
            username, 
            role, 
            branch_id,
            phone,
            created_at,
            branches!inner (name, business_id)
        `)
        .order('role', { ascending: true })
        .order('created_at', { ascending: false })
        .neq('role', 'owner')
        .eq('is_deleted', false)

    // If Owner: Filter by Business. If Employee: Filter by Branch.
    if (userProfile?.role === 'owner') {
        const { data: membership } = await supabase.from('business_members').select('business_id').eq('user_id', user.id).single()
        if (membership?.business_id) {
            query = query.eq('branches.business_id', membership.business_id)
        }
    } else {
        if (userProfile?.branch_id) {
            query = query.eq('branch_id', userProfile.branch_id)
        } else {
            // Manager without branch? Should not happen ideally
            query = query.eq('id', user.id)
        }
    }

    const { data: employees, error } = await query

    if (error) {
        console.error('Error fetching employees:', error)
    }

    // 3. Fetch Branches (For the dialog dropdown)
    // Same logic: Owner sees all IN BUSINESS, Manager sees own branch (as only option)
    let branchQuery = supabase
        .from('branches')
        .select('id, name')
        .eq('is_deleted', false) // Use soft delete filter

    if (userProfile?.role === 'owner') {
        const { data: membership } = await supabase.from('business_members').select('business_id').eq('user_id', user.id).single()
        if (membership?.business_id) {
            branchQuery = branchQuery.eq('business_id', membership.business_id)
        }
    } else if (userProfile?.branch_id) {
        branchQuery = branchQuery.eq('id', userProfile.branch_id)
    }

    const { data: branches } = await branchQuery

    return (
        <EmployeeList
            // Type assertion for employees to avoid strict type checks on joined data for now
            initialEmployees={(employees || []) as any[]}
            totalEmployees={employees?.length || 0}
            branches={branches || []}
            dict={dict}
            lang={lang}
            userRole={userProfile?.role}
            userBranchId={userProfile?.branch_id}
            userId={user.id}
        />
    )
}
