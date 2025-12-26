import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { dictionaries, Locale } from '@/lib/dictionaries'
import { CustomerList } from './customer-list'
import { getCustomers } from './actions'

export default async function CustomersPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const cookieStore = await cookies()
    const lang = (cookieStore.get('NEXT_LOCALE')?.value || 'en') as Locale
    const dict = dictionaries[lang]

    if (!user) return null

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    const customers = await getCustomers()

    return (
        <CustomerList
            initialCustomers={customers}
            dict={dict}
            lang={lang}
            userRole={profile?.role}
        />
    )
}
