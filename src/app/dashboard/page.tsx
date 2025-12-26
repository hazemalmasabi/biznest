import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getDictionary } from '@/lib/dictionaries'
import { cookies } from 'next/headers'
import { getBranches } from './branches/actions'
import { getDashboardStats, getUserProfile } from './actions'
import { DashboardClient } from './dashboard-client'

export default async function Dashboard() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const cookieStore = await cookies()
    const lang = (cookieStore.get('NEXT_LOCALE')?.value || 'en') as 'ar' | 'en'
    const dict = await getDictionary(lang)

    // Initial load: Today's stats
    const today = new Date().toLocaleDateString('en-CA')

    // Fetch Profile
    const { data: profile } = await supabase.from('profiles').select('role, branch_id').eq('id', user.id).single()
    const userRole = profile?.role || 'staff'
    const userBranchId = profile?.branch_id

    // Fetch all data in parallel
    const [stats, allBranches, userProfile] = await Promise.all([
        getDashboardStats(today, today),
        getBranches(),
        getUserProfile()
    ])

    // Filter Branches
    const branches = userRole === 'owner'
        ? allBranches
        : allBranches.filter((b: any) => b.id === userBranchId)

    return (
        <DashboardClient
            initialStats={stats}
            branches={branches}
            userProfile={userProfile}
            dict={dict}
            lang={lang}
            userRole={userRole}
            userBranchId={userBranchId}
        />
    )
}
