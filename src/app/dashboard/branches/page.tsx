import { cookies } from "next/headers"
import { dictionaries, Locale } from "@/lib/dictionaries"
import { getBranches, getBranchesCount } from "./actions"
import { BranchList } from "./branch-list"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function BranchesPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, branch_id')
        .eq('id', user.id)
        .single()

    // Redirect if not owner or manager
    if (profile?.role !== 'owner' && profile?.role !== 'manager') {
        redirect('/dashboard')
    }

    const cookieStore = await cookies()
    const lang = (cookieStore.get('NEXT_LOCALE')?.value || 'en') as Locale
    const dict = dictionaries[lang]

    let [branches, totalBranches] = await Promise.all([
        getBranches(),
        getBranchesCount()
    ])

    // Filter for Managers: Only show their branch
    if (profile?.role === 'manager' && profile.branch_id) {
        branches = branches.filter(b => b.id === profile.branch_id)
        totalBranches = branches.length
    }

    return (
        <BranchList
            initialBranches={branches}
            totalBranches={totalBranches}
            dict={dict}
            lang={lang}
            userRole={profile?.role}
        />
    )
}
