import { notFound } from "next/navigation"
import { getPublicBooking } from "../../actions"
import { BookingDetailsClient } from "./client"
import { createAdminClient } from "@/lib/supabase/server"

export default async function BookingDetailsPage({ params }: { params: Promise<{ slug: string, ref: string }> }) {
    const { slug, ref } = await params

    const { data: booking, error } = await getPublicBooking(ref)

    if (error || !booking) {
        return notFound()
    }

    // Fetch Status of Payment specific to Branch
    const supabase = await createAdminClient()
    const { data: paymentSettings } = await supabase
        .from('payment_settings')
        .select('*')
        .eq('branch_id', booking.branch_id)
        .single()

    return <BookingDetailsClient booking={booking} paymentSettings={paymentSettings} />
}
