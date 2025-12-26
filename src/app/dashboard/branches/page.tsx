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

    const { data: membership } = await supabase
        .from('business_members')
        .select('role')
        .eq('user_id', user.id)
        .single()

    if (membership?.role !== 'owner') {
        redirect('/dashboard')
    }

    const cookieStore = await cookies()
    const lang = (cookieStore.get('NEXT_LOCALE')?.value || 'en') as Locale
    const dict = dictionaries[lang]

    const [branches, totalBranches] = await Promise.all([
        getBranches(),
        getBranchesCount()
    ])

    return (
        <BranchList
            initialBranches={branches}
            totalBranches={totalBranches}
            dict={dict}
            lang={lang}
        />
    )
}
