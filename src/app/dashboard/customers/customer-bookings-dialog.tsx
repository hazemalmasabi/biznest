'use client'

import { useState, useEffect } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import { getBookings, Booking } from '@/app/dashboard/bookings/actions'

interface CustomerBookingsDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    customerId: number | null
    customerName: string
    lang: string
    dict: any
}

export function CustomerBookingsDialog({ open, onOpenChange, customerId, customerName, lang, dict }: CustomerBookingsDialogProps) {
    const [bookings, setBookings] = useState<Booking[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        if (open && customerId) {
            setIsLoading(true)
            getBookings(customerId).then(data => {
                setBookings(data)
                setIsLoading(false)
            })
        }
    }, [open, customerId])

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'scheduled':
                return <Badge variant="outline" className="text-blue-600 border-blue-600">{dict.dashboard.bookings?.status_options?.scheduled || (lang === 'ar' ? "مجدول" : "Scheduled")}</Badge>
            case 'completed':
                return <Badge variant="outline" className="text-green-600 border-green-600">{dict.dashboard.bookings?.status_options?.completed || (lang === 'ar' ? "مكتمل" : "Completed")}</Badge>
            case 'cancelled':
                return <Badge variant="outline" className="text-red-600 border-red-600">{dict.dashboard.bookings?.status_options?.cancelled || (lang === 'ar' ? "ملغي" : "Cancelled")}</Badge>
            case 'no_show':
                return <Badge variant="outline" className="text-orange-600 border-orange-600">{dict.dashboard.bookings?.status_options?.no_show || (lang === 'ar' ? "لا يوجد عرض" : "No Show")}</Badge> // Fixed Typo no_show
            default:
                return <Badge variant="outline">{status}</Badge>
        }
    }

    const formatTime = (time: string) => {
        return new Date(time).toLocaleTimeString(lang === 'ar' ? 'ar-SA' : 'en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        })
    }

    const calculateEndDateTime = (start: string, durationVal?: number | null, unit?: string) => {
        if (!durationVal) return { dateStr: '-', timeStr: '' }
        const date = new Date(start)
        if (unit === 'hour') {
            date.setMinutes(date.getMinutes() + durationVal * 60)
        } else if (unit === 'day') {
            date.setDate(date.getDate() + durationVal)
        }
        return {
            dateStr: date.toLocaleDateString('en-GB'),
            timeStr: formatTime(date.toISOString())
        }
    }

    // Reuse color logic from booking list
    const getRemainingColorClass = (remaining: number) => {
        if (remaining === 0) return "text-black font-medium"
        if (remaining > 0) return "text-red-600 font-bold" // Owes
        return "text-yellow-600 font-bold" // Overpaid
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[1000px] bg-white text-slate-900" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                <DialogHeader>
                    <DialogTitle>
                        {dict.dashboard.customers.booking_history || (lang === 'ar' ? "سجل الحجوزات" : "Booking History")}: {customerName}
                    </DialogTitle>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : (
                    <div className="max-h-[60vh] overflow-y-auto border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-center w-[100px]">{dict.dashboard.bookings?.fields?.id || (lang === 'ar' ? "رقم الحجز" : "Booking No")}</TableHead>
                                    <TableHead className="text-center">{dict.dashboard.bookings?.fields?.branch || (lang === 'ar' ? "الفرع" : "Branch")}</TableHead>
                                    <TableHead className="text-center">{dict.dashboard.bookings?.fields?.service || (lang === 'ar' ? "الخدمة" : "Service")}</TableHead>
                                    <TableHead className="text-center">{dict.dashboard.bookings?.fields?.start_time || (lang === 'ar' ? "وقت البدء" : "Start")}</TableHead>
                                    <TableHead className="text-center">{dict.dashboard.services?.price_label || (lang === 'ar' ? "السعر" : "Price")}</TableHead>
                                    <TableHead className="text-center">{dict.dashboard.bookings?.fields?.duration || (lang === 'ar' ? "المدة" : "Duration")}</TableHead>
                                    <TableHead className="text-center">{dict.dashboard.bookings?.fields?.end_time || (lang === 'ar' ? "وقت الانتهاء" : "End")}</TableHead>
                                    <TableHead className="text-center">{dict.dashboard.bookings?.fields?.total_price || (lang === 'ar' ? "الإجمالي" : "Total")}</TableHead>
                                    <TableHead className="text-center">{dict.dashboard.bookings?.fields?.paid_amount || (lang === 'ar' ? "مدفوع" : "Paid")}</TableHead>
                                    <TableHead className="text-center">{dict.dashboard.bookings?.fields?.remaining_amount || (lang === 'ar' ? "متبقي" : "Remaining")}</TableHead>
                                    <TableHead className="text-center">{dict.dashboard.bookings?.fields?.status || (lang === 'ar' ? "الحالة" : "Status")}</TableHead>
                                    <TableHead className="text-center">{dict.dashboard.bookings?.fields?.employee || (lang === 'ar' ? "الموظف" : "Employee")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {bookings.length > 0 ? (
                                    bookings.map((booking) => {
                                        const remaining = booking.price - (booking.paid_amount || 0)
                                        return (
                                            <TableRow key={booking.id}>
                                                <TableCell className="text-center font-bold">{booking.id}</TableCell>
                                                <TableCell className="text-center text-sm">{booking.branch?.name}</TableCell>
                                                <TableCell className="text-center font-medium">{booking.service?.name}</TableCell>
                                                <TableCell className="text-center text-sm">
                                                    <div className="flex flex-col">
                                                        <span>{new Date(booking.start_time).toLocaleDateString('en-GB')}</span>
                                                        <span className="text-xs text-muted-foreground">{formatTime(booking.start_time)}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">{booking.price}</TableCell>
                                                <TableCell className="text-center text-sm">
                                                    {(() => {
                                                        const serviceDict = dict.services || {}
                                                        const labelHour = serviceDict.duration_hour || (lang === 'ar' ? "بالساعة" : "Hourly")
                                                        const labelDay = serviceDict.duration_day || (lang === 'ar' ? "باليوم" : "Daily")
                                                        const labelOpen = serviceDict.duration_open || (lang === 'ar' ? "مدة مفتوحة" : "Open Duration")

                                                        if (booking.duration_unit === 'hour') return `${booking.duration_value} ${labelHour}`
                                                        if (booking.duration_unit === 'day') return `${booking.duration_value} ${labelDay}`
                                                        if (booking.duration_unit === 'open') return labelOpen
                                                        return `${booking.duration_value} ${booking.duration_unit}`
                                                    })()}
                                                </TableCell>
                                                <TableCell className="text-center text-sm">
                                                    <div className="flex flex-col">
                                                        {(() => {
                                                            const { dateStr, timeStr } = calculateEndDateTime(booking.start_time, booking.duration_value, booking.duration_unit)
                                                            return (
                                                                <>
                                                                    <span>{dateStr}</span>
                                                                    <span className="text-xs text-muted-foreground">{timeStr}</span>
                                                                </>
                                                            )
                                                        })()}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center font-bold">{booking.price}</TableCell>
                                                <TableCell className="text-center font-medium">{booking.paid_amount || 0}</TableCell>
                                                <TableCell className={`text-center ${getRemainingColorClass(remaining)}`}>
                                                    {remaining}
                                                </TableCell>
                                                <TableCell className="text-center">{getStatusBadge(booking.status)}</TableCell>
                                                <TableCell className="text-center text-sm text-muted-foreground">{booking.created_by?.full_name || "-"}</TableCell>
                                            </TableRow>
                                        )
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                                            {dict.dashboard.bookings?.errors?.no_bookings || "No bookings found"}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
