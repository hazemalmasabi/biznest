'use client'

import { useState } from 'react'
import { Booking, updateBookingStatus, deleteBooking } from './actions'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { MoreHorizontal, Plus, Search, Calendar, Clock, User, CheckCircle, XCircle, ArrowLeft, ArrowRight, Pencil, Trash2, Share2, Copy } from 'lucide-react'
import { BookingDialog } from './booking-dialog'
import { Badge } from "@/components/ui/badge"
import { format } from 'date-fns'
import { ar, enUS } from 'date-fns/locale'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Card, CardContent } from "@/components/ui/card"
import { useEffect } from 'react'

interface BookingListProps {
    initialBookings: Booking[]
    branches: any[]
    services: any[]
    dict: any
    lang: 'en' | 'ar'
    userRole?: string
    userBranchId?: number | null
}

export function BookingList({ initialBookings, branches, services, dict, lang, userRole, userBranchId }: BookingListProps) {
    const [bookings, setBookings] = useState<Booking[]>(initialBookings)
    const [search, setSearch] = useState('')
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [bookingToEdit, setBookingToEdit] = useState<Booking | undefined>(undefined)
    const [isLoading, setIsLoading] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [deleteId, setDeleteId] = useState<number | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const [isShareOpen, setIsShareOpen] = useState(false)
    const [shareUrl, setShareUrl] = useState('')

    // Filters State
    // Set default date range to today (Local Time)
    const today = new Date().toLocaleDateString('en-CA');
    const [dateFrom, setDateFrom] = useState(today)
    const [dateTo, setDateTo] = useState(today)
    const [selectedBranch, setSelectedBranch] = useState<string>(userRole !== 'owner' && userBranchId ? userBranchId.toString() : 'all')
    const [selectedService, setSelectedService] = useState<string>('all')
    const [selectedStatus, setSelectedStatus] = useState<string>('all')
    const [selectedEmployee, setSelectedEmployee] = useState<string>('all')

    const itemsPerPage = 25

    useEffect(() => {
        setBookings(initialBookings)
    }, [initialBookings])

    // Derive unique employees based on selected branch
    const employees = Array.from(new Set(
        initialBookings
            .filter(b => selectedBranch === 'all' || b.branch_id.toString() === selectedBranch)
            .filter(b => selectedBranch === 'all' || b.branch_id.toString() === selectedBranch)
            .map(b => b.created_by?.full_name || 'online_booking')
    ))

    // Filter bookings
    const filteredBookings = bookings.filter(booking => {
        const matchesSearch = booking.customer?.name.toLowerCase().includes(search.toLowerCase()) ||
            booking.customer?.phone.includes(search) ||
            booking.service?.name.toLowerCase().includes(search.toLowerCase()) ||
            booking.id.toString().includes(search)

        const matchesBranch = selectedBranch === 'all' || booking.branch_id.toString() === selectedBranch
        const matchesService = selectedService === 'all' || booking.service_id.toString() === selectedService
        const matchesStatus = selectedStatus === 'all' || booking.status === selectedStatus
        const matchesEmployee = selectedEmployee === 'all' ||
            (selectedEmployee === 'online_booking' ? !booking.created_by : booking.created_by?.full_name === selectedEmployee)


        const bookingDate = new Date(booking.start_time).toLocaleDateString('en-CA')
        const matchesDateFrom = !dateFrom || bookingDate >= dateFrom
        const matchesDateTo = !dateTo || bookingDate <= dateTo

        return matchesSearch && matchesBranch && matchesService && matchesStatus && matchesEmployee && matchesDateFrom && matchesDateTo
    })

    // Calculate pagination
    const totalPages = Math.ceil(filteredBookings.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const paginatedBookings = filteredBookings.slice(startIndex, startIndex + itemsPerPage)

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value)
        setCurrentPage(1)
    }

    const handleStatusUpdate = async (id: number, status: string) => {
        setIsLoading(true)
        const result = await updateBookingStatus(id, status)
        if (result.success) {
            setBookings(prev => prev.map(b => b.id === id ? { ...b, status: status as any } : b))
        }
        setIsLoading(false)
    }

    const confirmDelete = async () => {
        if (!deleteId) return
        setIsDeleting(true)
        const result = await deleteBooking(deleteId)
        if (result.success) {
            setBookings(prev => prev.filter(b => b.id !== deleteId))
        }
        setIsDeleting(false)
        setDeleteId(null)
    }

    const handleDelete = (id: number) => {
        setDeleteId(id)
    }

    const handleShare = (booking: Booking) => {
        if (!booking.token || !booking.branch) return
        // Assuming branch has slug. If type doesn't have it, we cast or update type.
        // We need to ensure the type has it.
        const url = `${window.location.origin}/${(booking.branch as any).slug}/${booking.token}`
        setShareUrl(url)
        setIsShareOpen(true)
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'scheduled':
                return <Badge variant="outline" className="text-blue-600 border-blue-600">{dict.dashboard.bookings?.statuses?.scheduled || (lang === 'ar' ? "مجدول" : "Scheduled")}</Badge>
            case 'completed':
                return <Badge variant="outline" className="text-green-600 border-green-600">{dict.dashboard.bookings?.statuses?.completed || (lang === 'ar' ? "مكتمل" : "Completed")}</Badge>
            case 'cancelled':
                return <Badge variant="outline" className="text-red-600 border-red-600">{dict.dashboard.bookings?.statuses?.cancelled || (lang === 'ar' ? "ملغي" : "Cancelled")}</Badge>
            case 'under_review':
                return <Badge variant="outline" className="text-amber-600 border-amber-600 font-medium bg-amber-50">{dict.dashboard.bookings?.statuses?.under_review || (lang === 'ar' ? "قيد المراجعة" : "Under Review")}</Badge>
            default:
                return <Badge variant="outline">{status}</Badge>
        }
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return format(date, 'dd/MM/yyyy hh:mm a', { locale: lang === 'ar' ? ar : enUS })
    }

    const calculateStat = (status?: string) => {
        const list = status ? filteredBookings.filter(b => b.status === status) : filteredBookings
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
        under_review: calculateStat('under_review'),
    }

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">{dict.dashboard.bookings.title}</h2>
                <p className="text-muted-foreground">{dict.dashboard.bookings.description}</p>
                <p className="text-sm text-muted-foreground mt-1 text-right" dir="rtl">إدارة ومتابعة جميع الحجوزات</p>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <Card>
                    <CardContent className="p-4 flex flex-col items-center justify-center border-l-4 border-l-slate-300">
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
                    <CardContent className="p-4 flex flex-col items-center justify-center border-l-4 border-l-amber-500">
                        <p className="text-sm font-medium text-muted-foreground">{dict.dashboard.bookings?.statuses?.under_review || (lang === 'ar' ? "قيد المراجعة" : "Under Review")}</p>
                        <p className="text-2xl font-bold text-amber-600 mb-2">{stats.under_review.count}</p>
                        <div className="flex w-full justify-around items-center text-xs sm:text-sm border-t pt-2">
                            <div className="flex flex-col items-center">
                                <span className="text-muted-foreground">{lang === 'ar' ? 'القيمة' : 'Value'}</span>
                                <span className="font-medium text-foreground">{stats.under_review.value.toLocaleString('en-US')}</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-muted-foreground">{lang === 'ar' ? 'المتبقي' : 'Remaining'}</span>
                                <span className={`font-medium ${stats.under_review.remaining > 0 ? 'text-red-600' : stats.under_review.remaining < 0 ? 'text-yellow-600' : 'text-foreground'}`}>
                                    {stats.under_review.remaining.toLocaleString('en-US')}
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
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-[250px]">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={dict.dashboard.bookings.search_placeholder}
                        value={search}
                        onChange={handleSearch}
                        className="pl-8"
                    />
                </div>

                {/* Date From */}
                <div className="flex items-center gap-2 bg-white border rounded-md px-3 py-2">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">{dict.dashboard.bookings.filters?.date_from || "From"}:</span>
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => {
                            const newFrom = e.target.value
                            setDateFrom(newFrom)
                            if (newFrom > dateTo) setDateTo(newFrom)
                        }}
                        className="bg-transparent outline-none text-sm w-full"
                    />
                </div>

                {/* Date To */}
                <div className="flex items-center gap-2 bg-white border rounded-md px-3 py-2">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">{dict.dashboard.bookings.filters?.date_to || "To"}:</span>
                    <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => {
                            const newTo = e.target.value
                            setDateTo(newTo)
                            if (newTo < dateFrom) setDateFrom(newTo)
                        }}
                        className="bg-transparent outline-none text-sm w-full"
                    />
                </div>

                {/* Status Filter */}
                <Select value={selectedStatus} onValueChange={setSelectedStatus} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                    <SelectTrigger className="w-[110px] bg-white">
                        <SelectValue placeholder={dict.dashboard.bookings.filters?.all_statuses || "All Statuses"} />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                        <SelectItem value="all">{dict.dashboard.bookings.filters?.all_statuses || "All Statuses"}</SelectItem>
                        <SelectItem value="scheduled">{dict.dashboard.bookings.statuses.scheduled}</SelectItem>
                        <SelectItem value="under_review">{dict.dashboard.bookings?.statuses?.under_review || (lang === 'ar' ? "قيد المراجعة" : "Under Review")}</SelectItem>
                        <SelectItem value="completed">{dict.dashboard.bookings.statuses.completed}</SelectItem>
                        <SelectItem value="cancelled">{dict.dashboard.bookings.statuses.cancelled}</SelectItem>
                    </SelectContent>
                </Select>

                {/* Branch Filter */}
                <div className="w-[110px]">
                    <Select
                        value={selectedBranch}
                        onValueChange={setSelectedBranch}
                        dir={lang === 'ar' ? 'rtl' : 'ltr'}
                        disabled={userRole !== 'owner'}
                    >
                        <SelectTrigger className="w-full bg-white text-start">
                            <SelectValue placeholder={dict.dashboard.bookings.filters.all_branches} />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                            {userRole === 'owner' && <SelectItem value="all">{dict.dashboard.bookings.filters.all_branches}</SelectItem>}
                            {branches.map(b => (
                                <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                {/* Service Filter */}
                <Select
                    value={selectedService}
                    onValueChange={setSelectedService}
                    dir={lang === 'ar' ? 'rtl' : 'ltr'}
                    disabled={selectedBranch === 'all'}
                >
                    <SelectTrigger className="w-[110px] bg-white">
                        <SelectValue placeholder={dict.dashboard.bookings.filters?.all_services || "All Services"} />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                        <SelectItem value="all">{dict.dashboard.bookings.filters?.all_services || "All Services"}</SelectItem>
                        {services
                            .filter(service => selectedBranch === 'all' || service.branch_id.toString() === selectedBranch)
                            .map(service => (
                                <SelectItem key={service.id} value={service.id.toString()}>{service.name}</SelectItem>
                            ))}
                    </SelectContent>
                </Select>

                {/* Employee Filter */}
                <Select
                    value={selectedEmployee}
                    onValueChange={setSelectedEmployee}
                    dir={lang === 'ar' ? 'rtl' : 'ltr'}
                    disabled={selectedBranch === 'all'}
                >
                    <SelectTrigger className="w-[110px] bg-white">
                        <SelectValue placeholder={dict.dashboard.bookings.filters?.all_employees || "All Employees"} />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                        <SelectItem value="all">{dict.dashboard.bookings.filters?.all_employees || "All Employees"}</SelectItem>
                        {employees.map(employee => (
                            <SelectItem key={employee as string} value={employee as string}>
                                {employee === 'online_booking' ? (lang === 'ar' ? "حجز من الموقع" : "Online Booking") : employee as string}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Button onClick={() => setIsDialogOpen(true)} className="gap-2 w-[150px]">
                    <Plus className="h-4 w-4" />
                    {dict.dashboard.bookings.new_booking}
                </Button>
            </div>

            <div className="rounded-md border bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="text-center">{dict.dashboard.bookings.steps.booking_id}</TableHead>
                            <TableHead className="text-center">{dict.dashboard.customers.name_label}</TableHead>
                            <TableHead className="text-center">{dict.dashboard.bookings.steps.branch}</TableHead>
                            <TableHead className="text-center">{dict.dashboard.bookings.steps.service}</TableHead>
                            <TableHead className="text-center">{dict.dashboard.bookings.steps.start_time}</TableHead>
                            <TableHead className="text-center">{dict.dashboard.bookings.price}</TableHead>
                            <TableHead className="text-center">{dict.dashboard.bookings.duration}</TableHead>
                            <TableHead className="text-center">{dict.dashboard.bookings.steps.end_time}</TableHead>
                            <TableHead className="text-center">{dict.dashboard.bookings.total_price}</TableHead>
                            <TableHead className="text-center">{dict.dashboard.bookings.paid}</TableHead>
                            <TableHead className="text-center">{dict.dashboard.bookings.remaining}</TableHead>
                            <TableHead className="text-center">{dict.dashboard.bookings.status}</TableHead>
                            <TableHead className="text-center">{dict.dashboard.bookings.steps.created_by || "Created By"}</TableHead>
                            <TableHead className="w-[100px] text-center">{dict.dashboard.common.actions}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedBookings.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={14} className="h-24 text-center">
                                    {dict.dashboard.bookings.errors?.no_bookings || "No bookings found"}
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedBookings.map((booking) => {
                                // Calculate End Time
                                let endTime = null
                                let durationLabel = '-'
                                if (booking.duration_value && booking.duration_unit) {
                                    const start = new Date(booking.start_time)
                                    // Clone date
                                    const end = new Date(start.getTime())

                                    const duration = booking.duration_value

                                    // Safer dictionary access with language fallback
                                    const serviceDict = dict.services || {}
                                    const labelHour = serviceDict.duration_hour || (lang === 'ar' ? "بالساعة" : "Hourly")
                                    const labelDay = serviceDict.duration_day || (lang === 'ar' ? "باليوم" : "Daily")
                                    const labelOpen = serviceDict.duration_open || (lang === 'ar' ? "مدة مفتوحة" : "Open Duration")

                                    if (booking.duration_unit === 'hour') {
                                        end.setHours(end.getHours() + duration)
                                        if (booking.has_half_hour) {
                                            end.setMinutes(end.getMinutes() + 30)
                                        }
                                        endTime = end
                                        durationLabel = `${duration} ${labelHour}`
                                    } else if (booking.duration_unit === 'day') {
                                        end.setDate(end.getDate() + duration)
                                        endTime = end
                                        durationLabel = `${duration} ${labelDay}`
                                    } else if (booking.duration_unit === 'open') {
                                        // For open duration, we don't show the number
                                        durationLabel = labelOpen
                                        // End time is likely not applicable or same as start for "open" unless specified otherwise
                                        endTime = null
                                    } else {
                                        durationLabel = `${duration} ${booking.duration_unit}`
                                    }

                                    if (booking.has_half_hour && booking.duration_unit === 'hour') {
                                        // Request: "1 بالساعة" then "+" then "نصف ساعة" vertically
                                        const halfHourText = lang === 'ar' ? "نصف ساعة" : "Half Hour"
                                        durationLabel = (
                                            <div className="flex flex-col items-center gap-0 leading-tight">
                                                <span>{duration} {labelHour}</span>
                                                <span className="font-bold text-muted-foreground">+</span>
                                                <span className="text-blue-600 font-bold">{halfHourText}</span>
                                            </div>
                                        ) as any
                                        // Let's change how we store it.
                                    }
                                }

                                return (
                                    <TableRow key={booking.id}>
                                        <TableCell className="text-center">
                                            <span className="font-medium text-muted-foreground">{booking.id}</span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className="font-medium">{booking.customer?.name}</span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className="text-sm">{booking.branch?.name}</span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className="text-sm">{booking.service?.name}</span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex flex-col text-xs text-muted-foreground whitespace-nowrap items-center">
                                                <span>{formatDate(booking.start_time)}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {/* Price (Breakdown now requested here) */}
                                            {booking.duration_value && booking.price ? (
                                                booking.has_half_hour && booking.half_hour_price ? (
                                                    <div className="flex flex-col items-center">
                                                        <span className="font-medium">{parseFloat(((Number(booking.price) - Number(booking.half_hour_price)) / Number(booking.duration_value)).toFixed(2))}</span>
                                                        <span className="text-xs text-blue-600 font-bold" dir="ltr">+ {parseFloat(Number(booking.half_hour_price).toFixed(2))}</span>
                                                    </div>
                                                ) : (
                                                    parseFloat((Number(booking.price) / Number(booking.duration_value)).toFixed(2))
                                                )
                                            ) : '-'}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className="text-sm">{durationLabel}</span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex flex-col text-xs text-muted-foreground whitespace-nowrap items-center">
                                                {endTime ? formatDate(endTime.toISOString()) : '-'}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {/* Total Price (Sum now requested here) */}
                                            {booking.price}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {booking.paid_amount}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {(() => {
                                                const remaining = Number(booking.price) - Number(booking.paid_amount)
                                                let colorClass = "text-black"
                                                if (remaining > 0) colorClass = "text-red-600 font-medium"
                                                if (remaining < 0) colorClass = "text-yellow-600 font-medium"

                                                return <span className={colorClass}>{remaining.toFixed(2)}</span>
                                            })()}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {getStatusBadge(booking.status)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className="text-sm text-muted-foreground">
                                                {booking.created_by?.full_name || (lang === 'ar' ? "حجز من الموقع" : "Online Booking")}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => { setBookingToEdit(booking); setIsDialogOpen(true) }}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleShare(booking)}
                                                    title={lang === 'ar' ? "مشاركة" : "Share"}
                                                >
                                                    <Share2 className="h-4 w-4 text-blue-600" />
                                                </Button>
                                                {(userRole === 'owner' || userRole === 'manager') && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setDeleteId(booking.id)}
                                                        className="h-8 w-8 text-red-600 hover:text-red-800 hover:bg-red-50"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {
                totalPages > 1 && (
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
                )
            }

            <Dialog open={isShareOpen} onOpenChange={setIsShareOpen}>
                <DialogContent className="sm:max-w-md bg-white text-slate-900" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                    <DialogHeader>
                        <DialogTitle>{lang === 'ar' ? 'مشاركة الحجز' : 'Share Booking'}</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col items-center space-y-4 py-4">
                        <div className="border p-2 rounded-lg bg-white shadow-sm">
                            {/* QR Code using external API for simplicity without installing new packages */}
                            <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`}
                                alt="Booking QR Code"
                                className="w-48 h-48 object-contain"
                            />
                        </div>
                        <div className="flex items-center space-x-2 w-full gap-2">
                            <div className="grid flex-1 gap-2">
                                <Label htmlFor="link" className="sr-only">
                                    Link
                                </Label>
                                <Input
                                    id="link"
                                    defaultValue={shareUrl}
                                    readOnly
                                    className="h-9 text-xs"
                                />
                            </div>
                            <Button type="submit" size="sm" className="px-3" onClick={() => {
                                navigator.clipboard.writeText(shareUrl)
                                alert(lang === 'ar' ? "تم النسخ!" : "Copied!")
                            }}>
                                <span className="sr-only">Copy</span>
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <BookingDialog
                open={isDialogOpen}
                onOpenChange={(open) => {
                    setIsDialogOpen(open)
                    if (!open) setBookingToEdit(undefined)
                }}
                branches={branches}
                services={services}
                dict={dict}
                lang={lang}
                bookingToEdit={bookingToEdit}
                userRole={userRole}
                userBranchId={userBranchId}
            />

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent className="bg-white text-slate-900" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{dict.dashboard.common.delete || "Delete"}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {dict.dashboard.common.delete_booking_confirmation}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className={lang === 'ar' ? "gap-2 sm:justify-end" : "gap-2"}>
                        <AlertDialogCancel disabled={isDeleting} className="mt-0">{dict.dashboard.common.cancel}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : (dict.dashboard.common.delete || "Delete")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div >
    )
}

// Helper component for Loader2 since it wasn't imported in BookingList
function Loader2({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
    )
}
