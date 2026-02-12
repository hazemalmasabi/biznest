import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { dictionaries, Locale } from '@/lib/dictionaries'
import { ServiceList } from './service-list'
import { getServices } from './actions'

export default async function ServicesPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const cookieStore = await cookies()
    const lang = (cookieStore.get('NEXT_LOCALE')?.value || 'en') as Locale
    const dict = dictionaries[lang]

    if (!user) return null

    // Fetch branches for the select inputs
    // Fetch user profile for branch_id and role
    const { data: profile } = await supabase
        .from('profiles')
        .select('branch_id, role')
        .eq('id', user.id)
        .single()

    let allBranches: any[] = []

    if (profile?.role === 'owner') {
        const { data: branchesData } = await supabase
            .from('business_members')
            .select('businesses(branches(id, name, is_deleted))')
            .eq('user_id', user.id)
            .single()
        // Filter out deleted branches
        const branches = (branchesData?.businesses as any)?.branches || []
        allBranches = branches.filter((b: any) => !b.is_deleted)
    } else if (profile?.branch_id) {
        const { data: branch } = await supabase
            .from('branches')
            .select('id, name, is_deleted')
            .eq('id', profile.branch_id)
            .eq('is_deleted', false)
            .single()
        if (branch) allBranches = [branch]
    }

    const services = await getServices()

    return (
        <ServiceList
            initialServices={services}
            branches={allBranches}
            dict={dict}
            lang={lang}
            userRole={profile?.role}
            userBranchId={profile?.branch_id}
        />
    )
}
