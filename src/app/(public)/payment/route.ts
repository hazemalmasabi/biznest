import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { GeideaService } from '@/lib/geidea'
import { sendBookingConfirmationEmail } from '@/lib/mail'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    // Geidea returns 'orderId' usually. Paylink returns 'transactionNo'.
    // We check for Geidea's orderId.
    const orderId = searchParams.get('orderId')
    const branchId = searchParams.get('branchId')
    const bookingId = searchParams.get('bookingId')

    if (!orderId || !branchId || !bookingId) {
        console.error("Missing Params:", { orderId, branchId, bookingId })
        return redirect('/')
    }

    const supabase = await createClient()

    // 1. Get Payment Settings
    const { data: settings, error: settingsError } = await supabase
        .from('payment_settings')
        .select('*')
        .eq('branch_id', branchId)
        .single()

    if (settingsError || !settings) {
        console.error('Payment Callback: Settings not found', settingsError)
        return redirect('/')
    }

    // 2. Verify Payment with Geidea
    const geidea = new GeideaService({
        app_id: settings.app_id,
        secret_key: settings.secret_key,
        is_production: settings.is_production
    })

    try {
        const order = await geidea.getOrder(orderId)

        // Geidea Order Status: 'Success', 'Authorized', 'Captured'?
        // Check documentation or assume 'Success' based on standard.
        // Log it to be sure.
        console.log(`[Geidea Callback] Order Status: ${order.status}`)

        if (order.status === 'Success' || order.status === 'Captured' || order.status === 'Authorized') {
            const paidAmount = Number(order.amount || 0)

            // 3. Update Booking Status & Paid Amount
            const { data: booking, error: bookingError } = await supabase
                .from('bookings')
                .select('*, customer:customers!customer_id(*), branch:branches!branch_id(*), service:services!service_id(*)')
                .eq('id', bookingId)
                .single()

            if (bookingError || !booking) {
                console.error('Payment Callback: Booking not found', bookingError)
                return redirect('/')
            }

            // Check duplicate
            const { data: existingPayment } = await supabase
                .from('payments')
                .select('id')
                .eq('transaction_id', orderId)
                .single()

            if (!existingPayment) {
                // Log Payment
                await supabase.from('payments').insert({
                    booking_id: parseInt(bookingId),
                    transaction_id: orderId,
                    amount: paidAmount,
                    status: 'paid',
                    type: paidAmount >= booking.price ? 'full' : 'deposit',
                    payment_method: 'geidea',
                })

                const newPaidAmount = (booking.paid_amount || 0) + paidAmount

                await supabase
                    .from('bookings')
                    .update({
                        status: 'scheduled',
                        paid_amount: newPaidAmount
                    })
                    .eq('id', parseInt(bookingId))

                // Create Voucher
                // Ensure vouchers table exists or skip/log error if not needed yet.
                // Assuming it exists based on previous Paylink logic.
                try {
                    await supabase.from('vouchers').insert({
                        branch_id: settings.branch_id,
                        type: 'receipt',
                        amount: paidAmount,
                        payment_method: 'card',
                        booking_id: parseInt(bookingId),
                        created_by: null,
                        notes: `Online Payment (Geidea) for Booking #${booking.id}`,
                        business_id: booking.business_id
                    })
                } catch (vErr) {
                    console.error("Voucher Creation Error", vErr)
                }

                // Send Email
                if (booking.status === 'pending' || newPaidAmount === paidAmount) {
                    const updatedBooking = { ...booking, paid_amount: newPaidAmount }
                    await sendBookingConfirmationEmail(updatedBooking)
                }
            }

            // Redirect to tracking page
            const { data: businessData } = await supabase
                .from('businesses')
                .select('slug')
                .eq('id', booking?.business_id || settings.branch_id)
                .single()

            if (businessData && booking?.token) {
                return redirect(`/${businessData.slug}/${booking.token}`)
            }
        }

    } catch (error) {
        console.error('Payment Verification Failed', error)
    }

    return redirect('/')
}
