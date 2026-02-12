import { getDictionary } from '@/lib/dictionaries'

import { getVouchers } from './actions'
import { VoucherList } from './voucher-list'


import { cookies } from 'next/headers'

import { createClient } from '@/lib/supabase/server'

export default async function VouchersPage() {
    const cookieStore = await cookies()
    const lang = (cookieStore.get('NEXT_LOCALE')?.value || 'en') as 'ar' | 'en'
    const dict = await getDictionary(lang)

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, branch_id')
        .eq('id', user.id)
        .single()

    let branchesList: any[] = []

    if (profile?.role === 'owner') {
        const { data: branchesData } = await supabase
            .from('business_members')
            .select('businesses(branches(id, name, is_deleted))')
            .eq('user_id', user.id)
            .single()
        // Filter out deleted branches
        const allBranches = (branchesData?.businesses as any)?.branches || []
        branchesList = allBranches.filter((b: any) => !b.is_deleted)
    } else if (profile?.branch_id) {
        const { data: branch } = await supabase
            .from('branches')
            .select('id, name, is_deleted')
            .eq('id', profile.branch_id)
            .eq('is_deleted', false)
            .single()
        if (branch) branchesList = [branch]
    }

    // Fetch Data
    const { vouchers } = await getVouchers()

    return (
        <div className="container mx-auto py-6 space-y-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{dict.dashboard.vouchers.title}</h1>
                    <p className="text-muted-foreground">
                        {dict.dashboard.vouchers.description || "Manage financial records"}
                    </p>
                </div>
            </div>

            <VoucherList
                initialVouchers={vouchers || []}
                branches={branchesList}
                dict={dict}
                lang={lang}
                userRole={profile?.role}
                userBranchId={profile?.branch_id}
            />
        </div>
    )
}
