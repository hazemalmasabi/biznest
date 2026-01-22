import { Sidebar } from "@/components/dashboard/sidebar"
import { cookies } from "next/headers"
import { dictionaries, Locale } from "@/lib/dictionaries"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { SessionGuard } from "@/components/dashboard/session-guard"

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const cookieStore = await cookies()
    const lang = (cookieStore.get('NEXT_LOCALE')?.value || 'en') as Locale
    const dict = dictionaries[lang]
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // 1. Get Profile to know if Owner or Staff
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    // 2. If Owner, Ensure Business Exists
    // 2. If Owner, Ensure Business Exists
    if (profile?.role === 'owner') {
        const { data: membership } = await supabase
            .from('business_members')
            .select('business_id')
            .eq('user_id', user.id)
            .eq('role', 'owner')
            .single()

        if (!membership) {
            redirect('/onboarding')
        }
    }

    // 3. Determine Sidebar Role
    let sidebarRole = profile?.role
    if (profile?.role !== 'owner') {
        const { data: membership } = await supabase
            .from('business_members')
            .select('role')
            .eq('user_id', user.id)
            .single()
        if (membership) {
            sidebarRole = membership.role
        }
    }

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            <SessionGuard userId={user.id} />
            <Sidebar dict={dict} lang={lang} role={sidebarRole} />
            <main className="flex-1 overflow-y-auto p-8 relative scroll-smooth">
                {children}
            </main>
        </div>
    )
}
