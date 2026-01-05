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
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, ArrowLeft, ArrowRight } from "lucide-react"
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

    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 25

    useEffect(() => {
        if (open && customerId) {
            setIsLoading(true)
            getBookings(customerId).then(data => {
                setBookings(data)
                setIsLoading(false)
            })
        }
        setCurrentPage(1)
    }, [open, customerId])

    const totalPages = Math.ceil(bookings.length / itemsPerPage)
    const paginatedBookings = bookings.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

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
            date.setHours(date.getHours() + durationVal)
            // Note: End time calc here is a helper. We can't easily see 'has_half_hour' unless passed.
            // But we can just add 30 mins in the render if needed, or update this helper usage below.
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

    const calculateStat = (status?: string) => {
        const list = status ? bookings.filter(b => b.status === status) : bookings
        return {
            count: list.length,
            value: list.reduce((sum, b) => sum + (Number(b.price) || 0), 0),
            remaining: list.reduce((sum, b) => sum + (Number(b.price) - (Number(b.paid_amount) || 0)), 0)
        }
    }

    const stats = {
        total: calculateStat(),
        scheduled: calculateStat('scheduled'),
        completed: calculateStat('completed'),
        cancelled: calculateStat('cancelled'),
        no_show: calculateStat('no_show'),
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[1200px] bg-white text-slate-900" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
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
                    <div className="space-y-4">
                        {/* Stats Cards */}
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                            <Card>
                                <CardContent className="p-4 flex flex-col items-center justify-center">
                                    <p className="text-sm font-medium text-muted-foreground">{dict.dashboard.bookings.stats.total_bookings}</p>
                                    <p className="text-2xl font-bold mb-2">{stats.total.count}</p>
                                    <div className="flex w-full justify-around items-center text-xs sm:text-sm border-t pt-2">
                                        <div className="flex flex-col items-center">
                                            <span className="text-muted-foreground">{lang === 'ar' ? 'القيمة' : 'Value'}</span>
                                            <span className="font-medium text-foreground">{stats.total.value.toLocaleString('en-US')}</span>
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <span className="text-muted-foreground">{lang === 'ar' ? 'المتبقي' : 'Remaining'}</span>
                                            <span className={`font-medium ${stats.total.remaining > 0 ? 'text-red-600' : stats.total.remaining < 0 ? 'text-yellow-600' : 'text-foreground'}`}>
                                                {stats.total.remaining.toLocaleString('en-US')}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4 flex flex-col items-center justify-center border-l-4 border-l-blue-500">
                                    <p className="text-sm font-medium text-muted-foreground">{dict.dashboard.bookings.stats.scheduled}</p>
                                    <p className="text-2xl font-bold text-blue-600 mb-2">{stats.scheduled.count}</p>
                                    <div className="flex w-full justify-around items-center text-xs sm:text-sm border-t pt-2">
                                        <div className="flex flex-col items-center">
                                            <span className="text-muted-foreground">{lang === 'ar' ? 'القيمة' : 'Value'}</span>
                                            <span className="font-medium text-foreground">{stats.scheduled.value.toLocaleString('en-US')}</span>
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <span className="text-muted-foreground">{lang === 'ar' ? 'المتبقي' : 'Remaining'}</span>
                                            <span className={`font-medium ${stats.scheduled.remaining > 0 ? 'text-red-600' : stats.scheduled.remaining < 0 ? 'text-yellow-600' : 'text-foreground'}`}>
                                                {stats.scheduled.remaining.toLocaleString('en-US')}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4 flex flex-col items-center justify-center border-l-4 border-l-green-500">
                                    <p className="text-sm font-medium text-muted-foreground">{dict.dashboard.bookings.stats.completed}</p>
                                    <p className="text-2xl font-bold text-green-600 mb-2">{stats.completed.count}</p>
                                    <div className="flex w-full justify-around items-center text-xs sm:text-sm border-t pt-2">
                                        <div className="flex flex-col items-center">
                                            <span className="text-muted-foreground">{lang === 'ar' ? 'القيمة' : 'Value'}</span>
                                            <span className="font-medium text-foreground">{stats.completed.value.toLocaleString('en-US')}</span>
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <span className="text-muted-foreground">{lang === 'ar' ? 'المتبقي' : 'Remaining'}</span>
                                            <span className={`font-medium ${stats.completed.remaining > 0 ? 'text-red-600' : stats.completed.remaining < 0 ? 'text-yellow-600' : 'text-foreground'}`}>
                                                {stats.completed.remaining.toLocaleString('en-US')}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4 flex flex-col items-center justify-center border-l-4 border-l-red-500">
                                    <p className="text-sm font-medium text-muted-foreground">{dict.dashboard.bookings.stats.cancelled}</p>
                                    <p className="text-2xl font-bold text-red-600 mb-2">{stats.cancelled.count}</p>
                                    <div className="flex w-full justify-around items-center text-xs sm:text-sm border-t pt-2">
                                        <div className="flex flex-col items-center">
                                            <span className="text-muted-foreground">{lang === 'ar' ? 'القيمة' : 'Value'}</span>
                                            <span className="font-medium text-foreground">{stats.cancelled.value.toLocaleString('en-US')}</span>
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <span className="text-muted-foreground">{lang === 'ar' ? 'المتبقي' : 'Remaining'}</span>
                                            <span className={`font-medium ${stats.cancelled.remaining > 0 ? 'text-red-600' : stats.cancelled.remaining < 0 ? 'text-yellow-600' : 'text-foreground'}`}>
                                                {stats.cancelled.remaining.toLocaleString('en-US')}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4 flex flex-col items-center justify-center border-l-4 border-l-orange-500">
                                    <p className="text-sm font-medium text-muted-foreground">{dict.dashboard.bookings.stats.no_show || (lang === 'ar' ? "لا يوجد عرض" : "No Show")}</p>
                                    <p className="text-2xl font-bold text-orange-600 mb-2">{stats.no_show.count}</p>
                                    <div className="flex w-full justify-around items-center text-xs sm:text-sm border-t pt-2">
                                        <div className="flex flex-col items-center">
                                            <span className="text-muted-foreground">{lang === 'ar' ? 'القيمة' : 'Value'}</span>
                                            <span className="font-medium text-foreground">{stats.no_show.value.toLocaleString('en-US')}</span>
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <span className="text-muted-foreground">{lang === 'ar' ? 'المتبقي' : 'Remaining'}</span>
                                            <span className={`font-medium ${stats.no_show.remaining > 0 ? 'text-red-600' : stats.no_show.remaining < 0 ? 'text-yellow-600' : 'text-foreground'}`}>
                                                {stats.no_show.remaining.toLocaleString('en-US')}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                        <div className="overflow-x-auto max-h-[600px] overflow-y-auto border rounded-md">
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
                                    {paginatedBookings.length > 0 ? (
                                        paginatedBookings.map((booking) => {
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
                                                    <TableCell className="text-center font-bold">
                                                        {booking.price}
                                                    </TableCell>
                                                    <TableCell className="text-center text-sm">
                                                        {(() => {
                                                            const serviceDict = dict.services || {}
                                                            const labelHour = serviceDict.duration_hour || (lang === 'ar' ? "بالساعة" : "Hourly")
                                                            const labelDay = serviceDict.duration_day || (lang === 'ar' ? "باليوم" : "Daily")
                                                            const labelOpen = serviceDict.duration_open || (lang === 'ar' ? "مدة مفتوحة" : "Open Duration")

                                                            if (booking.duration_unit === 'day') return `${booking.duration_value} ${labelDay}`
                                                            if (booking.duration_unit === 'open') return labelOpen

                                                            let label = `${booking.duration_value} ${booking.duration_unit}`
                                                            if (booking.duration_unit === 'hour' && booking.has_half_hour) {
                                                                const halfHourText = lang === 'ar' ? "نصف ساعة" : "Half Hour"
                                                                return (
                                                                    <div className="flex flex-col items-center gap-0 leading-tight">
                                                                        <span>{booking.duration_value} {labelHour}</span>
                                                                        <span className="font-bold text-muted-foreground">+</span>
                                                                        <span className="text-blue-600 font-bold">{halfHourText}</span>
                                                                    </div>
                                                                )
                                                            }
                                                            return label
                                                        })()}
                                                    </TableCell>
                                                    <TableCell className="text-center text-sm">
                                                        <div className="flex flex-col">
                                                            {(() => {
                                                                let { dateStr, timeStr } = calculateEndDateTime(booking.start_time, booking.duration_value, booking.duration_unit)
                                                                // Manual patch for end time display in this dialog since helper is generic
                                                                if (booking.has_half_hour && booking.duration_unit === 'hour') {
                                                                    const start = new Date(booking.start_time)
                                                                    const end = new Date(start)
                                                                    end.setHours(end.getHours() + (booking.duration_value || 0))
                                                                    end.setMinutes(end.getMinutes() + 30)
                                                                    dateStr = end.toLocaleDateString('en-GB')
                                                                    timeStr = formatTime(end.toISOString())
                                                                }
                                                                return (
                                                                    <>
                                                                        <span>{dateStr}</span>
                                                                        <span className="text-xs text-muted-foreground">{timeStr}</span>
                                                                    </>
                                                                )
                                                            })()}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center font-bold">
                                                        {booking.price}
                                                    </TableCell>
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
                        {totalPages > 1 && (
                            <div className="flex items-center justify-end space-x-2 rtl:space-x-reverse py-4">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                >
                                    {lang === 'ar' ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
                                </Button>
                                <span className="text-sm text-slate-600 mx-2">
                                    {currentPage} / {totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    {lang === 'ar' ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
