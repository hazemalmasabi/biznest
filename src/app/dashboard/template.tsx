
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function DashboardTemplate({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('profiles')
        .select('is_deleted, branch_id')
        .eq('id', user.id)
        .single()

    if (profile?.is_deleted) {
        await supabase.auth.signOut()
        redirect('/login?error=account_disabled')
    }

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

    return (
        <>
            {children}
        </>
    )
}
