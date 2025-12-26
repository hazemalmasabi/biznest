import { createClient } from '@/lib/supabase/server' // ADD IMPORT
import { getBookings } from './actions'
import { getBranches } from '../branches/actions'
import { getServices } from '../services/actions'
import { BookingList } from './booking-list'
import { getDictionary } from '@/lib/dictionaries'
import { cookies } from 'next/headers'

export default async function BookingsPage() {
    const supabase = await createClient() // ADD CLIENT
    const { data: { user } } = await supabase.auth.getUser()

    // Fetch Profile
    const { data: profile } = await supabase.from('profiles').select('role, branch_id').eq('id', user?.id).single()
    const userRole = profile?.role || 'staff'
    const userBranchId = profile?.branch_id

    const cookieStore = await cookies()
    const lang = (cookieStore.get('NEXT_LOCALE')?.value || 'en') as 'ar' | 'en'
    const dict = await getDictionary(lang)

    const [bookings, allBranches, services] = await Promise.all([
        getBookings(),
        getBranches(), // We fetch all first, then filter locally to save an API variant if simplest
        getServices()
    ])

    // Filter Branches
    const branches = userRole === 'owner'
        ? allBranches
        : allBranches.filter((b: any) => b.id === userBranchId)

    return (
        <BookingList
            initialBookings={bookings}
            branches={branches}
            services={services}
            dict={dict}
            lang={lang}
            userRole={userRole}
            userBranchId={userBranchId}
        />
    )
}
