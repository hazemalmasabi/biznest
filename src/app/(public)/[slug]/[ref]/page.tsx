import { notFound } from "next/navigation"
import { getPublicBooking } from "../../actions"
import { BookingDetailsClient } from "./client"

export default async function BookingDetailsPage({ params }: { params: Promise<{ slug: string, ref: string }> }) {
    const { slug, ref } = await params

    const { data: booking, error } = await getPublicBooking(ref)

    if (error || !booking) {
        return notFound()
    }

    return <BookingDetailsClient booking={booking} />
}
