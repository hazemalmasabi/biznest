'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { createBooking, updateBooking } from './actions'
import { getCustomers } from '../customers/actions'
import { CustomerDialog } from '../customers/customer-dialog'
import { Loader2, Search, Plus, Calendar, Clock, User, X, Edit2, Trash2, FileText, List } from 'lucide-react'
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { VoucherDialog } from '../vouchers/voucher-dialog'
import { BookingVouchersList } from './booking-vouchers-list'
import { getVouchers } from '../vouchers/actions'

interface BookingDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    branches: any[]
    services: any[]
    dict: any
    lang: string
    bookingToEdit?: any
    userRole?: string
    userBranchId?: number | null
}

export function BookingDialog({ open, onOpenChange, branches, services, dict, lang, bookingToEdit, userRole, userBranchId }: BookingDialogProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [bookingData, setBookingData] = useState({
        branch_id: '',
        service_id: '',
        customer_id: '',
        start_time: '',
        duration_value: '',
        duration_unit: 'hour',
        price: '',
        paid_amount: '0',
        status: 'scheduled',
        notes: '',
        has_half_hour: false,
        half_hour_price: '0'
    })

    // Sub-states
    const [filteredServices, setFilteredServices] = useState<any[]>([])
    const [selectedService, setSelectedService] = useState<any>(null)
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null)

    // Customer Search
    const [showCustomerSearch, setShowCustomerSearch] = useState(false)
    const [phoneSearch, setPhoneSearch] = useState('')
    const [customerSearchResult, setCustomerSearchResult] = useState<any>(null)
    const [customerSearchStatus, setCustomerSearchStatus] = useState<'idle' | 'searching' | 'found' | 'not_found'>('idle')
    const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false)
    const [isEditCustomerOpen, setIsEditCustomerOpen] = useState(false)
    // Voucher Dialogs
    const [isVoucherDialogOpen, setIsVoucherDialogOpen] = useState(false)
    const [isVoucherListOpen, setIsVoucherListOpen] = useState(false)
    const [voucherToEdit, setVoucherToEdit] = useState<any>(undefined)

    const [allCustomers, setAllCustomers] = useState<any[]>([])
    const [bookingVouchers, setBookingVouchers] = useState<any[]>([])

    // Helper to refresh vouchers and update paid amount
    const refreshVouchers = () => {
        if (bookingToEdit && bookingToEdit.id) {
            getVouchers(bookingToEdit.id).then(res => {
                if (res.vouchers) {
                    setBookingVouchers(res.vouchers)
                    // Calculate Total Paid
                    const totalPaid = res.vouchers.reduce((acc: number, v: any) => {
                        if (v.type === 'receipt') return acc + Number(v.amount)
                        if (v.type === 'refund') return acc - Number(v.amount)
                        return acc
                    }, 0)
                    setBookingData(prev => ({ ...prev, paid_amount: totalPaid.toString() }))
                }
            })
        }
    }

    // Unit Price State for Dynamic Calculation
    const [unitPrice, setUnitPrice] = useState('')

    const [dateOption, setDateOption] = useState<'now' | 'custom'>('now')
    const [customDate, setCustomDate] = useState({
        date: new Date().toISOString().split('T')[0], // Today YYYY-MM-DD
        time: '12:00'
    })


    // Load customers
    useEffect(() => {
        if (open) {
            getCustomers().then(setAllCustomers)

            if (bookingToEdit && open) {
                // Edit Mode Setup
                const startDate = new Date(bookingToEdit.start_time)
                const dateStr = startDate.toLocaleDateString('en-CA')
                // HH:mm for input
                const timeStr = startDate.toTimeString().slice(0, 5)

                setBookingData({
                    branch_id: bookingToEdit.branch_id.toString(),
                    service_id: bookingToEdit.service_id.toString(),
                    customer_id: bookingToEdit.customer_id.toString(),
                    start_time: bookingToEdit.start_time,
                    duration_value: bookingToEdit.duration_value?.toString() || '',
                    duration_unit: bookingToEdit.duration_unit || 'hour',
                    price: bookingToEdit.price.toString(),
                    paid_amount: bookingToEdit.paid_amount?.toString() || '0',
                    status: bookingToEdit.status,
                    notes: bookingToEdit.notes || '',
                    has_half_hour: bookingToEdit.has_half_hour || false,
                    half_hour_price: bookingToEdit.half_hour_price?.toString() || '0'
                })

                // Set initial selections
                setSelectedCustomer(bookingToEdit.customer)

                // Calculate Unit Price
                const total = parseFloat(bookingToEdit.price) || 0
                const dur = parseFloat(bookingToEdit.duration_value) || 1
                const half = bookingToEdit.has_half_hour ? (parseFloat(bookingToEdit.half_hour_price) || 0) : 0
                setUnitPrice(dur > 0 ? ((total - half) / dur).toString() : '0')

                // Service will be set by branch effect or we need to look it up
                // We rely on branch effect to load services, then we might need to find the specific service
                // But filteredServices relies on bookingData.branch_id which we just set.
                // However, filteredServices might not be ready immediately.

                // Set Date
                setDateOption('custom')
                setCustomDate({
                    date: dateStr,
                    time: timeStr
                })
            } else {
                // Reset (Create Mode)
                setBookingData({
                    branch_id: (userRole !== 'owner' && userBranchId) ? userBranchId.toString() : '',
                    service_id: '',
                    customer_id: '',
                    start_time: '',
                    duration_value: '',
                    duration_unit: 'hour',
                    price: '',
                    paid_amount: '0',
                    status: 'scheduled',
                    notes: '',
                    has_half_hour: false,
                    half_hour_price: '0'
                })
                setUnitPrice('')
                setSelectedCustomer(null)
                setPhoneSearch('')
                setCustomerSearchResult(null)
                setCustomerSearchStatus('idle')
                setDateOption('now')
            }
        }
    }, [open, bookingToEdit, userRole, userBranchId])

    // Filter services by branch
    useEffect(() => {
        if (bookingData.branch_id) {
            const foundServices = services.filter(s => s.branch_id.toString() === bookingData.branch_id && s.status === 'active')
            setFilteredServices(foundServices)

            // If editing, try to find the service to set name/props if needed
            if (bookingToEdit && bookingData.service_id && !selectedService) {
                const svc = foundServices.find(s => s.id.toString() === bookingData.service_id)
                if (svc) setSelectedService(svc)
            }

            // Reset service if branch changes AND we are NOT in initial edit load (simple check: if service_id is set but invalid for this branch)
            // If user changes branch while editing, we should clear service.
            if (selectedService && selectedService.branch_id.toString() !== bookingData.branch_id) {
                setBookingData(prev => ({ ...prev, service_id: '', price: '', duration_unit: 'hour', duration_value: '' }))
                setSelectedService(null)
            }
        } else {
            setFilteredServices([])
        }
    }, [bookingData.branch_id, services, bookingToEdit, selectedService, bookingData.service_id])

    const handleServiceSelect = (serviceId: string) => {
        const service = services.find(s => s.id.toString() === serviceId)
        if (service) {
            setSelectedService(service)
            setUnitPrice(service.price.toString())
            const total = parseFloat(service.price) * 1
            setBookingData(prev => ({
                ...prev,
                service_id: serviceId,
                price: total.toString(),
                duration_unit: service.duration,
                duration_value: '1' // Default min
            }))
        }
    }

    const handleCustomerSearch = () => {
        if (!phoneSearch) return
        setCustomerSearchStatus('searching')
        const found = allCustomers.find(c => c.phone.includes(phoneSearch))
        if (found) {
            setCustomerSearchResult(found)
            setCustomerSearchStatus('found')
        } else {
            setCustomerSearchResult(null)
            setCustomerSearchStatus('not_found')
        }
    }

    const confirmCustomerSelection = (customer: any) => {
        setSelectedCustomer(customer)
        setBookingData(prev => ({ ...prev, customer_id: customer.id.toString() }))
        setShowCustomerSearch(false)
        setPhoneSearch('')
        setCustomerSearchStatus('idle')
        setCustomerSearchResult(null)
        if (errors.customer_id) setErrors({ ...errors, customer_id: '' }) // Clear customer error
    }

    // Validation State
    const [errors, setErrors] = useState<Record<string, string>>({})

    const validate = () => {
        const newErrors: Record<string, string> = {}
        if (!bookingData.branch_id) newErrors.branch_id = dict.dashboard.bookings.errors.select_branch || 'Required'
        if (!bookingData.service_id) newErrors.service_id = dict.dashboard.bookings.errors.select_service || 'Required'
        if (!bookingData.customer_id) newErrors.customer_id = dict.dashboard.bookings.errors.select_customer || 'Required'

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    // Submit Handler
    const handleSubmit = async () => {
        if (!validate()) return

        setIsLoading(true)

        let startTimeISO = ''
        if (dateOption === 'now') {
            startTimeISO = new Date().toISOString()
        } else {
            startTimeISO = new Date(`${customDate.date}T${customDate.time}:00`).toISOString()
        }

        let endTimeISO = null
        if (bookingData.duration_unit !== 'open' && bookingData.duration_value) {
            const startDate = new Date(startTimeISO)
            const duration = parseFloat(bookingData.duration_value)

            if (bookingData.duration_unit === 'hour') {
                startDate.setTime(startDate.getTime() + (duration * 60 * 60 * 1000))
                if (bookingData.has_half_hour) {
                    startDate.setTime(startDate.getTime() + (30 * 60 * 1000))
                }
            } else if (bookingData.duration_unit === 'day') {
                startDate.setDate(startDate.getDate() + duration)
            }
            endTimeISO = startDate.toISOString()
        }

        const formData = new FormData()
        formData.append('branch_id', bookingData.branch_id)
        formData.append('service_id', bookingData.service_id)
        formData.append('customer_id', bookingData.customer_id)
        formData.append('start_time', startTimeISO)
        if (endTimeISO) formData.append('end_time', endTimeISO)
        formData.append('duration_value', bookingData.duration_value)
        formData.append('duration_unit', bookingData.duration_unit)
        formData.append('price', bookingData.price)
        formData.append('paid_amount', bookingData.paid_amount || '0')
        formData.append('status', bookingData.status)
        formData.append('has_half_hour', String(bookingData.has_half_hour))
        if (bookingData.has_half_hour) {
            formData.append('half_hour_price', bookingData.half_hour_price)
        }
        if (bookingData.notes) formData.append('notes', bookingData.notes)

        const result = bookingToEdit
            ? await updateBooking(bookingToEdit.id, formData)
            : await createBooking(formData)

        if (result.success) {
            onOpenChange(false)
        } else {
            alert(result.message)
        }
        setIsLoading(false)
    }

    // Date constraints
    const today = new Date().toISOString().split('T')[0]
    const maxDate = new Date()
    maxDate.setFullYear(maxDate.getFullYear() + 1)
    const maxDateStr = maxDate.toISOString().split('T')[0]

    // Calculate Remaining for Colors
    const remainingAmount = (parseFloat(bookingData.price || '0') - parseFloat(bookingData.paid_amount || '0'))
    let remainingColorClass = "bg-slate-50 font-medium"
    if (remainingAmount > 0) remainingColorClass += " text-red-600" // Positive remainder (Owes money)
    else if (remainingAmount < 0) remainingColorClass += " text-yellow-600" // Negative remainder (Overpaid)
    else remainingColorClass += " text-black" // Zero

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[600px] bg-white text-slate-900 max-h-[90vh] overflow-y-auto" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                    <DialogHeader>
                        <DialogTitle>{bookingToEdit ? dict.dashboard.bookings.edit_booking : dict.dashboard.bookings.new_booking}</DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-6 py-4">
                        {/* Branch & Service */}
                        <div className="grid gap-4">
                            <div className="flex gap-4">
                                <div className="flex-1 grid gap-2">
                                    <Label className={errors.branch_id ? "text-red-500" : ""}>{dict.dashboard.bookings.select_branch}</Label>
                                    <Select
                                        value={bookingData.branch_id}
                                        onValueChange={(v) => {
                                            setBookingData({ ...bookingData, branch_id: v })
                                            if (errors.branch_id) setErrors({ ...errors, branch_id: '' })
                                        }}
                                        disabled={userRole !== 'owner'}
                                    >
                                        <SelectTrigger className={errors.branch_id ? "border-red-500" : ""}>
                                            <SelectValue placeholder={dict.dashboard.bookings.select_branch} />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white">
                                            {branches.map(b => (
                                                <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.branch_id && <p className="text-xs text-red-500">{errors.branch_id}</p>}
                                </div>
                                <div className="flex-1 grid gap-2">
                                    <Label className={errors.service_id ? "text-red-500" : ""}>{dict.dashboard.bookings.select_service}</Label>
                                    <Select
                                        value={bookingData.service_id}
                                        onValueChange={(v) => {
                                            handleServiceSelect(v)
                                            if (errors.service_id) setErrors({ ...errors, service_id: '' })
                                        }}
                                        disabled={!bookingData.branch_id}
                                    >
                                        <SelectTrigger className={errors.service_id ? "border-red-500" : ""}>
                                            <SelectValue placeholder={dict.dashboard.bookings.select_service} />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white">
                                            {filteredServices.map(s => (
                                                <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.service_id && <p className="text-xs text-red-500">{errors.service_id}</p>}
                                </div>
                            </div>

                            {bookingToEdit && bookingToEdit.created_by && (
                                <div className="grid gap-2">
                                    <Label>{dict.dashboard.bookings.steps?.created_by || "Created By"}</Label>
                                    <Input
                                        value={bookingToEdit.created_by.full_name}
                                        readOnly
                                        disabled
                                        className="bg-slate-50"
                                    />
                                </div>
                            )}

                        </div>

                        {/* Customer Selection */}
                        <div className="grid gap-2">
                            <Label className={errors.customer_id ? "text-red-500" : ""}>{dict.dashboard.bookings.steps.customer}</Label>
                            {selectedCustomer ? (
                                <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex justify-between items-center group">
                                    <div>
                                        <p className="font-bold text-green-900">{selectedCustomer.name}</p>
                                        <p className="text-sm text-green-700" dir="ltr">{selectedCustomer.phone}</p>
                                        <p className="text-xs text-green-600 mt-1">
                                            {selectedCustomer.notes || dict.dashboard.customers.notes_label + ": " + (dict.dashboard.bookings.no_notes || "-")}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-green-700 hover:text-green-900 hover:bg-green-100"
                                            onClick={() => setIsEditCustomerOpen(true)}
                                            title={dict.dashboard.common.edit}
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-red-600 hover:text-red-800 hover:bg-red-100"
                                            onClick={() => {
                                                setSelectedCustomer(null)
                                                setBookingData(prev => ({ ...prev, customer_id: '' }))
                                                if (errors.customer_id) setErrors({ ...errors, customer_id: dict.dashboard.bookings.errors.select_customer || 'Required' })
                                            }}
                                            title={dict.dashboard.common.delete}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <Button
                                        onClick={() => setShowCustomerSearch(true)}
                                        variant="outline"
                                        className={`w-full justify-start text-muted-foreground dashed border-2 ${errors.customer_id ? "border-red-500 bg-red-50" : ""}`}
                                    >
                                        <User className="mr-2 h-4 w-4" />
                                        {dict.dashboard.bookings.select_customer}...
                                    </Button>
                                    {errors.customer_id && <p className="text-xs text-red-500">{errors.customer_id}</p>}
                                </>
                            )}
                        </div>

                        {/* Date & Time */}
                        {/* Date & Time */}
                        <div className={`grid gap-4 ${!bookingData.service_id ? 'opacity-50 pointer-events-none' : ''}`}>
                            <Label>{dict.dashboard.bookings.steps.time}</Label>
                            <div className="grid grid-cols-2 gap-4">
                                <div
                                    className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all hover:bg-slate-50 ${dateOption === 'now' ? 'border-primary bg-primary/5' : 'border-slate-100'}`}
                                    onClick={() => setDateOption('now')}
                                >
                                    <Clock className={`h-5 w-5 mb-2 ${dateOption === 'now' ? 'text-primary' : 'text-slate-400'}`} />
                                    <span className={`font-medium text-sm ${dateOption === 'now' ? 'text-primary' : 'text-slate-600'}`}>{dict.dashboard.bookings.start_now}</span>
                                </div>
                                <div
                                    className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all hover:bg-slate-50 ${dateOption === 'custom' ? 'border-primary bg-primary/5' : 'border-slate-100'}`}
                                    onClick={() => setDateOption('custom')}
                                >
                                    <Calendar className={`h-5 w-5 mb-2 ${dateOption === 'custom' ? 'text-primary' : 'text-slate-400'}`} />
                                    <span className={`font-medium text-sm ${dateOption === 'custom' ? 'text-primary' : 'text-slate-600'}`}>{dict.dashboard.bookings.select_time}</span>
                                </div>
                            </div>

                            {dateOption === 'custom' && (
                                <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-slate-50 animate-in fade-in-0 slide-in-from-top-1">
                                    <div className="grid gap-2">
                                        <Label className="text-xs">{dict.dashboard.bookings.steps.date}</Label>
                                        <Input
                                            type="date"
                                            min={today}
                                            max={maxDateStr}
                                            value={customDate.date}
                                            onChange={(e) => setCustomDate({ ...customDate, date: e.target.value })}
                                            className="bg-white"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="text-xs">{dict.dashboard.bookings.steps.time}</Label>
                                        <Input
                                            type="time"
                                            value={customDate.time}
                                            onChange={(e) => setCustomDate({ ...customDate, time: e.target.value })}
                                            className="bg-white"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Details: Price, Duration, Status */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="grid gap-2">
                                <Label>{dict.dashboard.bookings.price}</Label>
                                <Input
                                    type="text"
                                    inputMode="decimal"
                                    value={unitPrice}
                                    onChange={(e) => {
                                        const val = e.target.value
                                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                            setUnitPrice(val)
                                            const unit = parseFloat(val) || 0
                                            const dur = parseFloat(bookingData.duration_value) || 0
                                            const half = bookingData.has_half_hour ? (parseFloat(bookingData.half_hour_price) || 0) : 0
                                            setBookingData(prev => ({ ...prev, price: ((unit * dur) + half).toString() }))
                                        }
                                    }}
                                    dir="ltr"
                                    disabled={!bookingData.service_id}
                                    className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:bg-slate-100 disabled:opacity-100"
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label>{dict.dashboard.bookings.duration} <span className="text-xs text-muted-foreground">({bookingData.duration_unit === 'hour' ? dict.dashboard.services.duration_hour : bookingData.duration_unit === 'day' ? dict.dashboard.services.duration_day : 'Open'})</span></Label>
                                {bookingData.duration_unit !== 'open' ? (
                                    <Input
                                        type="text"
                                        inputMode="numeric"
                                        value={bookingData.duration_value}
                                        onChange={(e) => {
                                            const val = e.target.value
                                            // Allow only digits
                                            if (val === '' || /^\d*$/.test(val)) {
                                                const dur = parseFloat(val) || 0
                                                const unit = parseFloat(unitPrice) || 0
                                                const half = bookingData.has_half_hour ? (parseFloat(bookingData.half_hour_price) || 0) : 0
                                                setBookingData(prev => ({ ...prev, duration_value: val, price: ((unit * dur) + half).toString() }))
                                            }
                                        }}
                                        onBlur={(e) => {
                                            if (Number(e.target.value) < 1 && e.target.value !== '') {
                                                setBookingData({ ...bookingData, duration_value: '1' })
                                            }
                                        }}
                                        dir="ltr"
                                        disabled={!bookingData.service_id}
                                        className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:bg-slate-100 disabled:opacity-100"
                                    />
                                ) : (
                                    <div className="p-2 border rounded bg-slate-50 text-sm text-center text-muted-foreground h-10 flex items-center justify-center">
                                        Open
                                    </div>
                                )}
                            </div>

                            {/* Half Hour Toggle */}
                            {bookingData.duration_unit === 'hour' && (
                                <div className="grid gap-2">
                                    <Label>{lang === 'ar' ? "إضافة نصف ساعة" : "Add Half Hour"}</Label>
                                    <div className="flex items-center gap-2 h-10">
                                        <Switch
                                            className="border-2 border-slate-300 data-[state=unchecked]:bg-slate-300 data-[state=checked]:border-black data-[state=checked]:bg-black"
                                            checked={bookingData.has_half_hour}
                                            onCheckedChange={(checked) => {
                                                setBookingData(prev => {
                                                    const unit = parseFloat(unitPrice) || 0
                                                    const dur = parseFloat(prev.duration_value) || 0
                                                    // If checking, add half price. If unchecking, remove it (or add 0).
                                                    // Note: We use the EXISTING half_hour_price if checking, or 0 if unchecking.
                                                    // But wait, if we uncheck, we keep half_hour_price in state but don't add it.
                                                    // The logic below:
                                                    const halfPrice = checked ? (parseFloat(prev.half_hour_price) || 0) : 0
                                                    const total = (unit * dur) + halfPrice

                                                    return {
                                                        ...prev,
                                                        has_half_hour: checked,
                                                        // half_hour_price: checked ? prev.half_hour_price : '0', // Don't reset price to 0 on uncheck, keep it in memory? Or reset?
                                                        // User logic was: checked ? prev : '0'. Let's stick to that but be careful.
                                                        // Actually if I reset to '0', when I toggle back ON, it will be 0.
                                                        // Better to keep it? The previous code was: checked ? prev.half_hour_price : '0'
                                                        // This means if I uncheck, it becomes 0. If I check again, it stays 0. 
                                                        // That might be annoying. Let's JUST toggle flag and recalc total.
                                                        // But previous code was resetting it. Let's assume user wants to retain if possible?
                                                        // Or maybe just follow the requested "update Total" logic.
                                                        // Let's keep the existing logic of half_hour_price for now but fix Total.
                                                        half_hour_price: checked ? prev.half_hour_price : prev.half_hour_price, // Changed: Don't lose the value on toggle off?
                                                        // Actually, if I uncheck, Total should decrease.
                                                        price: total.toString()
                                                    }
                                                })
                                            }}
                                        />
                                        <span className="text-sm font-medium">{bookingData.has_half_hour ? (lang === 'ar' ? "مفعل" : "Enabled") : (lang === 'ar' ? "غير مفعل" : "Disabled")}</span>
                                    </div>
                                </div>
                            )}

                            {/* Half Hour Price */}
                            {bookingData.has_half_hour && bookingData.duration_unit === 'hour' && (
                                <div className="grid gap-2 animate-in fade-in slide-in-from-top-1">
                                    <Label>{lang === 'ar' ? "سعر النصف ساعة" : "Half Hour Price"}</Label>
                                    <Input
                                        type="text"
                                        inputMode="decimal"
                                        value={bookingData.half_hour_price}
                                        onChange={(e) => {
                                            const val = e.target.value
                                            if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                                // Recalc total
                                                const unit = parseFloat(unitPrice) || 0
                                                const dur = parseFloat(bookingData.duration_value) || 0
                                                const half = parseFloat(val) || 0
                                                const total = (unit * dur) + half
                                                setBookingData(prev => ({ ...prev, half_hour_price: val, price: total.toString() }))
                                            }
                                        }}
                                        dir="ltr"
                                        className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                </div>
                            )}

                            <div className="grid gap-2">
                                <Label>{dict.dashboard.bookings.status}</Label>
                                <Select
                                    value={bookingData.status || 'scheduled'}
                                    onValueChange={(v) => setBookingData({ ...bookingData, status: v })}
                                    dir={lang === 'ar' ? 'rtl' : 'ltr'}
                                    disabled={!bookingData.branch_id || !bookingData.service_id}
                                >
                                    <SelectTrigger className="disabled:opacity-50 disabled:cursor-not-allowed bg-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white">
                                        <SelectItem value="scheduled">{dict.dashboard.bookings.statuses.scheduled}</SelectItem>
                                        <SelectItem value="completed">{dict.dashboard.bookings.statuses.completed}</SelectItem>
                                        <SelectItem value="cancelled">{dict.dashboard.bookings.statuses.cancelled}</SelectItem>
                                        <SelectItem value="no_show">{dict.dashboard.bookings.statuses.no_show}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>


                        </div>

                        {/* Dynamic End Time Display */}
                        {bookingData.service_id && bookingData.duration_value && (
                            <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded border border-blue-100 flex items-center justify-between">
                                <span>{dict.dashboard.bookings.end_time || (lang === 'ar' ? 'وقت انتهاء الحجز:' : 'End Time:')}</span>
                                <span className="font-bold" dir="ltr">
                                    {(() => {
                                        let startTime = new Date()
                                        if (dateOption === 'custom') {
                                            startTime = new Date(`${customDate.date}T${customDate.time}:00`)
                                        }

                                        const duration = parseFloat(bookingData.duration_value) || 0
                                        if (bookingData.duration_unit === 'hour') {
                                            startTime.setTime(startTime.getTime() + (duration * 60 * 60 * 1000))
                                            if (bookingData.has_half_hour) {
                                                startTime.setTime(startTime.getTime() + (30 * 60 * 1000))
                                            }
                                        } else if (bookingData.duration_unit === 'day') {
                                            startTime.setDate(startTime.getDate() + duration)
                                        }

                                        const timeStr = startTime.toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            hour12: true
                                        })

                                        const dateStr = startTime.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
                                            day: 'numeric',
                                            month: 'numeric',
                                            year: 'numeric'
                                        })

                                        return `${timeStr} - ${dateStr}`
                                    })()}
                                </span>
                            </div>
                        )}

                        {/* Payment Summary */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="grid gap-2">
                                <Label>{dict.dashboard.bookings.total_price}</Label>
                                <Input
                                    value={bookingData.price || '0'}
                                    readOnly
                                    className="bg-slate-50 font-medium"
                                    dir="ltr"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>{dict.dashboard.bookings.paid}</Label>
                                <Input
                                    value={bookingData.paid_amount || '0'}
                                    readOnly
                                    className="bg-slate-50 font-medium"
                                    dir="ltr"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>{dict.dashboard.bookings.remaining}</Label>
                                <Input
                                    value={remainingAmount.toString()}
                                    readOnly
                                    className={remainingColorClass}
                                    dir="ltr"
                                />
                            </div>
                        </div>

                        {bookingToEdit && (
                            <div className="flex gap-4 w-full mb-6">
                                <Button type="button" variant="outline" onClick={() => { setVoucherToEdit(undefined); setIsVoucherDialogOpen(true) }} className="flex-1 gap-2 border-dashed border-2 hover:border-solid hover:bg-slate-50">
                                    <Plus className="h-5 w-5" />
                                    {dict.dashboard.vouchers?.new_voucher || "Add Voucher"}
                                </Button>
                                <Button type="button" variant="outline" onClick={() => setIsVoucherListOpen(true)} className="flex-1 gap-2 border-dashed border-2 hover:border-solid hover:bg-slate-50">
                                    <List className="h-5 w-5" />
                                    {dict.dashboard.vouchers?.title || "View Vouchers"}
                                </Button>
                            </div>
                        )}

                        <div className="grid gap-2">
                            <Label>{dict.dashboard.bookings.notes} <span className="text-muted-foreground font-normal text-xs">{dict.dashboard.customers.optional || '(Optional)'}</span></Label>
                            <Input
                                value={bookingData.notes}
                                onChange={(e) => setBookingData({ ...bookingData, notes: e.target.value })}
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:justify-start">

                        <div className="flex gap-2 ms-auto">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                {dict.dashboard.common.cancel}
                            </Button>
                            <Button onClick={handleSubmit} disabled={isLoading}>
                                {isLoading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                                {bookingToEdit ? dict.dashboard.bookings.edit_booking : dict.dashboard.bookings.new_booking}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog >

            {/* Customer Search Dialog */}
            < Dialog open={showCustomerSearch} onOpenChange={setShowCustomerSearch} >
                <DialogContent className="sm:max-w-[400px] bg-white" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                    <DialogHeader>
                        <DialogTitle>{dict.dashboard.bookings.search_customer}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="flex gap-2">
                            <Input
                                placeholder="050..."
                                value={phoneSearch}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '')
                                    setPhoneSearch(val)
                                }}
                                dir="ltr"
                                autoFocus
                                className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <Button onClick={handleCustomerSearch}>
                                <Search className="h-4 w-4" />
                            </Button>
                        </div>

                        {customerSearchStatus === 'found' && customerSearchResult && (
                            <div
                                className="p-3 border rounded cursor-pointer hover:bg-slate-50 flex justify-between items-center bg-green-50 border-green-100"
                                onClick={() => confirmCustomerSelection(customerSearchResult)}
                            >
                                <div>
                                    <p className="font-medium text-green-900">{customerSearchResult.name}</p>
                                    <p className="text-xs text-green-700" dir="ltr">{customerSearchResult.phone}</p>
                                    <p className="text-xs text-green-600 mt-1">
                                        {customerSearchResult.notes || dict.dashboard.customers.notes_label + ": " + (dict.dashboard.bookings.no_notes || "-")}
                                    </p>
                                </div>
                                <Plus className="h-4 w-4 text-green-600" />
                            </div>
                        )}

                        {customerSearchStatus === 'not_found' && (
                            <div className="text-center py-4">
                                <p className="text-muted-foreground mb-4 text-sm">{dict.dashboard.bookings.customer_not_found}</p>
                                <Button onClick={() => setIsAddCustomerOpen(true)} className="w-full">
                                    <Plus className="mr-2 h-4 w-4" />
                                    {dict.dashboard.bookings.add_new_customer}
                                </Button>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog >

            {/* Add New Customer Dialog */}
            {
                isAddCustomerOpen && (
                    <CustomerDialog
                        open={isAddCustomerOpen}
                        onOpenChange={setIsAddCustomerOpen}
                        customer={null}
                        dict={dict}
                        lang={lang}
                        onSuccess={(newCustomer) => {
                            confirmCustomerSelection(newCustomer)
                            getCustomers().then(setAllCustomers) // Refresh list
                        }}
                    />
                )
            }

            {/* Edit Customer Dialog */}
            {
                isEditCustomerOpen && selectedCustomer && (
                    <CustomerDialog
                        open={isEditCustomerOpen}
                        onOpenChange={setIsEditCustomerOpen}
                        customer={selectedCustomer}
                        dict={dict}
                        lang={lang}
                        onSuccess={(updatedCustomer) => {
                            setSelectedCustomer(updatedCustomer) // Update local selected state
                            setBookingData(prev => ({ ...prev, customer_id: updatedCustomer.id.toString() }))
                            getCustomers().then(setAllCustomers) // Refresh list
                        }}
                    />
                )
            }
            {/* Sub-Dialogs for Vouchers */}
            {
                bookingToEdit && (
                    <>
                        <VoucherDialog
                            open={isVoucherDialogOpen}
                            onOpenChange={setIsVoucherDialogOpen}
                            branches={branches}
                            dict={dict}
                            lang={lang}
                            bookingId={bookingToEdit.id}
                            voucherToEdit={voucherToEdit}
                            onSuccess={() => {
                                refreshVouchers()
                                // Refresh vouchers in list if open
                                // The list component fetches its own data, but we might want to force it?
                                // Actually, if we just close the list and reopen, it fetches.
                                // But if list is open, we might want to tell it to refresh.
                            }}
                        />

                        <Dialog open={isVoucherListOpen} onOpenChange={setIsVoucherListOpen}>
                            <DialogContent className="sm:max-w-[700px] bg-white text-slate-900" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                                <DialogHeader>
                                    <DialogTitle>{dict.dashboard.vouchers?.title || "Vouchers"}</DialogTitle>
                                </DialogHeader>
                                <BookingVouchersList
                                    bookingId={bookingToEdit?.id}
                                    lang={lang}
                                    dict={dict}
                                    onEdit={(v) => {
                                        setVoucherToEdit(v)
                                        setIsVoucherListOpen(false) // Close list
                                        setIsVoucherDialogOpen(true) // Open edit dialog
                                        setIsVoucherDialogOpen(true) // Open edit dialog
                                    }}
                                />
                            </DialogContent>
                        </Dialog>
                    </>
                )
            }

        </>
    )
}
