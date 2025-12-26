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



    const { data: membership } = await supabase
        .from('business_members')
        .select('role')
        .eq('user_id', user.id)
        .single()

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            <SessionGuard userId={user.id} />
            <Sidebar dict={dict} lang={lang} role={membership?.role} />
            <main className="flex-1 overflow-y-auto p-8 relative scroll-smooth">
                {children}
            </main>
        </div>
    )
}
