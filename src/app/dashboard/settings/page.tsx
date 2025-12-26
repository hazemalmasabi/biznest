import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AuthSettingsForm } from './auth-form'
import { BasicSettingsForm, BusinessSettingsForm } from './client-forms'
import { cookies } from "next/headers"
import { dictionaries, Locale } from "@/lib/dictionaries"

export default async function SettingsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const cookieStore = await cookies()
    const lang = (cookieStore.get('NEXT_LOCALE')?.value || 'en') as Locale
    const dict = dictionaries[lang]

    if (!user) redirect('/login')

    // Fetch Profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    // Fetch Business 
    const { data: membership } = await supabase
        .from('business_members')
        .select('*, businesses(*)')
        .eq('user_id', user.id)
        .single()

    const isOwner = membership?.role === 'owner'

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold">{dict.dashboard.nav.settings}</h1>

            {/* Basic Data Settings - Client Component */}
            <Card>
                <CardHeader>
                    <CardTitle>{dict.dashboard.common.basic_data}</CardTitle>
                    <CardDescription>{dict.dashboard.common.update_profile_desc}</CardDescription>
                </CardHeader>
                <BasicSettingsForm
                    fullName={profile?.full_name || user.user_metadata?.full_name}
                    phone={profile?.phone || user.user_metadata?.phone}
                    dict={dict}
                />
            </Card>

            {/* Registration Data Settings - Client Component */}
            <Card>
                <CardHeader>
                    <CardTitle>{dict.dashboard.common.registration_data}</CardTitle>
                    <CardDescription>{dict.dashboard.common.update_registration_desc}</CardDescription>
                </CardHeader>
                <AuthSettingsForm
                    userEmail={user.email?.endsWith('@biznest.local')
                        ? user.email.replace('@biznest.local', '')
                        : (user.email || '')}
                    dict={dict}
                />
            </Card>

            {/* Business Settings - Client Component */}
            {isOwner && membership?.businesses && (
                <Card>
                    <CardHeader>
                        <CardTitle>{dict.onboarding.business_name_label}</CardTitle>
                        <CardDescription>{dict.dashboard.common.update_business_desc}</CardDescription>
                    </CardHeader>
                    <BusinessSettingsForm
                        businessId={membership.business_id}
                        businessName={membership.businesses.name}
                        dict={dict}
                    />
                </Card>
            )}
        </div>
    )
}
