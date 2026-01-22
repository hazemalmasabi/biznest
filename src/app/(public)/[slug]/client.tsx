"use client"

import { useState, useMemo, useEffect } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, MapPin, Phone, Calendar as CalendarIcon, ChevronRight, ChevronLeft, Check, Info, AlertCircle } from 'lucide-react'
import { Calendar } from "@/components/ui/calendar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { format, addMinutes, isSameDay, parse, set, isAfter, isBefore, addDays } from "date-fns"
import { arSA, enUS } from "date-fns/locale"
import { useParams } from 'next/navigation'
import { Globe } from 'lucide-react'
import { publicDictionary } from '@/app/(public)/dictionaries'

import { getPublicBranchBookings, createPublicBooking, sendVerificationCode, verifyVerificationCode } from '@/app/(public)/actions'

// Helper Types
type Service = {
    id: number
    name: string
    description: string | null
    price: number
    duration: 'hour' | 'day' | 'open'
    image_url: string | null
    branch_id: number
}

type ServiceDuration = {
    id: number
    service_id: number
    duration_value: number
    duration_unit: 'minute' | 'hour' | 'day' | 'open'
    price: number
}

type Branch = {
    id: number
    name: string
    address: string | null
    phone: string | null
    business_id: number
    businesses: { name: string, logo_url: string | null } | null
    image_url?: string | null
    location_url?: string | null
}

type WorkingHour = {
    id?: number
    branch_id: number
    day_of_week: number
    start_time: string | null
    end_time: string | null
    is_closed: boolean
}

interface PublicBookingClientProps {
    branch: Branch
    services: Service[]
    durations: ServiceDuration[]
    workingHours: WorkingHour[]
}

export function PublicBookingClient({ branch, services, durations: rawDurations, workingHours }: PublicBookingClientProps) {
    const params = useParams()
    const slug = params.slug as string // Get slug from URL params
    // Sort durations by value ascending
    const durations = useMemo(() => {
        return [...rawDurations].sort((a, b) => a.duration_value - b.duration_value)
    }, [rawDurations])

    const [lang, setLang] = useState<'ar' | 'en'>('ar')
    const t = publicDictionary[lang]
    const dateLocale = lang === 'ar' ? arSA : enUS
    const dir = lang === 'ar' ? 'rtl' : 'ltr'

    const [selectedService, setSelectedService] = useState<Service | null>(null)
    const [infoDialogService, setInfoDialogService] = useState<Service | null>(null)
    const [selectedDurationOption, setSelectedDurationOption] = useState<ServiceDuration | null>(null)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [step, setStep] = useState<number>(1) // 1: Date, 2: Time, 3: Info
    const [dateError, setDateError] = useState<string | null>(null)

    // Booking Data
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
    const [selectedTime, setSelectedTime] = useState<string | null>(null)
    const [bookedSlots, setBookedSlots] = useState<{ start: Date, end: Date }[]>([])
    const [isLoadingSlots, setIsLoadingSlots] = useState(false)

    // Step 3 Data
    const [clientName, setClientName] = useState('')
    const [clientPhone, setClientPhone] = useState('')
    const [clientEmail, setClientEmail] = useState('')
    const [otp, setOtp] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isVerifying, setIsVerifying] = useState(false)

    const [successBooking, setSuccessBooking] = useState<{ id: string } | null>(null)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    // Handle nested business data
    const businessName = branch.businesses?.name || branch.name
    const businessLogo = branch.businesses?.logo_url

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(price)
    }

    const formatDurationUnit = (unit: string) => {
        const map: Record<string, string> = {
            'minute': t.common.minute,
            'hour': t.common.hour,
            'day': t.common.day,
            'open': t.common.open
        }
        return map[unit] || unit
    }

    const handleServiceClick = (service: Service) => {
        setSelectedService(service)

        // Default to shortest duration if available
        const serviceDurations = durations.filter(d => d.service_id === service.id)
        if (serviceDurations.length > 0) {
            setSelectedDurationOption(serviceDurations[0])
        } else {
            setSelectedDurationOption(null)
        }

        setIsDialogOpen(true)
        setStep(1)
        setSelectedDate(undefined)
        setSelectedTime(null)
        setClientName('')
        setClientPhone('')
        setClientEmail('')
        setOtp('')
        setStep(1)
        setDateError(null)
        setErrorMessage(null)
        setSuccessBooking(null)
    }

    // --- Format Display Helpers ---
    const getBookingDurationMinutes = () => {
        if (selectedDurationOption) {
            let mins = selectedDurationOption.duration_value
            if (selectedDurationOption.duration_unit === 'hour') mins *= 60
            if (selectedDurationOption.duration_unit === 'day') mins *= 1440 // Not really used for day logic
            return mins
        }
        if (selectedService?.duration === 'hour') return 60
        if (selectedService?.duration === 'day') return 1440
        return 60 // Default fallback
    }

    const getBookingPrice = () => {
        return selectedDurationOption ? selectedDurationOption.price : selectedService?.price || 0
    }

    // --- Fetch Slots on Date Change ---
    useEffect(() => {
        if (selectedDate && branch && step === 2) {
            setIsLoadingSlots(true)
            getPublicBranchBookings(branch.id, format(selectedDate, 'yyyy-MM-dd'))
                .then((data) => {

                    const slots = data.map((b: any) => {
                        // Ensure timestamps are treated as UTC if they lack offset
                        const startStr = b.start_time.endsWith('Z') || b.start_time.includes('+') ? b.start_time : `${b.start_time}Z`
                        const start = new Date(startStr)

                        let end: Date
                        if (b.end_time) {
                            const endStr = b.end_time.endsWith('Z') || b.end_time.includes('+') ? b.end_time : `${b.end_time}Z`
                            end = new Date(endStr)
                        } else {
                            // Fallback calculation
                            let mins = b.duration_value || 0
                            if (b.duration_unit === 'hour') mins = (b.duration_value || 0) * 60
                            else if (b.duration_unit === 'day') mins = (b.duration_value || 0) * 1440
                            end = addMinutes(start, mins)
                        }

                        return { start, end }
                    })
                    setBookedSlots(slots)
                })
                .finally(() => setIsLoadingSlots(false))
        }
    }, [selectedDate, branch, step])

    // --- Time Slot Generation Logic ---
    const availableSlots = useMemo(() => {
        if (!selectedDate || !branch || !workingHours) return []

        const dayOfWeek = selectedDate.getDay()
        const dayConfig = workingHours.find(wh => wh.day_of_week === dayOfWeek)

        if (!dayConfig || dayConfig.is_closed || !dayConfig.start_time || !dayConfig.end_time) {
            return []
        }

        const slots: { time: string, status: 'free' | 'busy' | 'past' }[] = []
        const today = new Date()
        const isToday = isSameDay(selectedDate, today)

        const parseTime = (timeStr: string) => {
            const [h, m] = timeStr.split(':').map(Number)
            return set(selectedDate, { hours: h, minutes: m, seconds: 0, milliseconds: 0 })
        }

        let current = parseTime(dayConfig.start_time)
        let endDay = parseTime(dayConfig.end_time)

        // Handle cross-midnight shifts (e.g., 9 PM to 4 AM)
        if (isBefore(endDay, current)) {
            endDay = addDays(endDay, 1)
        }

        const bookingMinutes = getBookingDurationMinutes()

        // Just list every 30 mins
        // We need to check if (current + bookingMinutes) overlaps any booked slot
        const interval = 30

        while (current < endDay) {
            const slotEnd = addMinutes(current, bookingMinutes)
            let status: 'free' | 'busy' | 'past' = 'free'

            // Check if past
            if (isToday && current < today) {
                status = 'past'
            } else {
                // Check overlap
                // Overlap condition: (StartA < EndB) and (EndA > StartB)
                const isOverlapping = bookedSlots.some(booked => {
                    return current < booked.end && slotEnd > booked.start
                })

                if (isOverlapping) {
                    status = 'busy'
                }

                // Also check if ends after working hours
                if (isAfter(slotEnd, endDay)) {
                    // Just strictly strictly prevent full overlap
                    status = 'busy'
                }
            }

            slots.push({
                time: format(current, 'HH:mm'),
                status
            })
            current = addMinutes(current, interval)
        }

        return slots
    }, [selectedDate, workingHours, branch, bookedSlots, selectedService, selectedDurationOption])


    const handleNextStep = () => {
        setErrorMessage(null)
        if (step === 1 && selectedDate) {
            setStep(2)
        } else if (step === 2 && selectedTime) {
            setStep(3)
        }
    }

    const handleSendOTP = async () => {
        setErrorMessage(null)
        if (!clientName || !clientPhone || !clientEmail) {
            setErrorMessage(t.booking.fill_all_fields)
            return
        }

        // Basic Validation
        const phoneRegex = /^[0-9]+$/
        if (!phoneRegex.test(clientPhone)) {
            setErrorMessage(t.booking.phone_invalid)
            return
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(clientEmail)) {
            setErrorMessage(t.booking.email_invalid)
            return
        }

        setIsSubmitting(true)
        try {
            const res = await sendVerificationCode(clientEmail)
            if (res.error) {
                setErrorMessage(res.error)
            } else {
                // Remove alert, just advance step
                // alert(`تم إرسال رمز التحقق إلى ${clientEmail}`)
                setStep(4)
            }
        } catch (error) {
            console.error(error)
            setErrorMessage(t.booking.verify_fail)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleVerifyAndSubmit = async () => {
        setErrorMessage(null)
        if (!otp || otp.length !== 4) {
            setErrorMessage(t.booking.otp_error)
            return
        }

        setIsVerifying(true)
        try {
            // 1. Verify OTP
            const verifyRes = await verifyVerificationCode(clientEmail, otp)
            if (verifyRes.error) {
                setErrorMessage(verifyRes.error)
                setIsVerifying(false)
                return
            }

            // 2. Create Booking
            // Determine actual date based on cross-midnight logic
            let finalDate = selectedDate
            if (!finalDate || !selectedTime) return

            const dayOfWeek = finalDate.getDay()
            const dayConfig = workingHours.find(wh => wh.day_of_week === dayOfWeek)

            if (dayConfig && dayConfig.start_time && dayConfig.end_time) {
                // Parse times to compare hours only
                const [startH] = dayConfig.start_time.split(':').map(Number)
                const [endH] = dayConfig.end_time.split(':').map(Number)
                const [selectedH] = selectedTime.split(':').map(Number)

                // If shift crosses midnight (Start > End) AND Selected Time is small (e.g. 1 AM)
                if (startH > endH && selectedH < startH) {
                    finalDate = addDays(finalDate, 1)
                }
            }

            const dateStr = format(finalDate, 'yyyy-MM-dd')
            // Construct a Date object from the local date and time string
            const localStartDateTime = new Date(`${dateStr}T${selectedTime}:00`)
            // Convert to ISO string for DB
            const startTimeIso = localStartDateTime.toISOString()

            const result = await createPublicBooking({
                branch_id: branch.id,
                service_id: selectedService!.id,
                start_time: startTimeIso,
                duration_minutes: getBookingDurationMinutes(),
                price: getBookingPrice(),
                customer_name: clientName,
                customer_phone: clientPhone,
                customer_email: clientEmail,
                duration_unit: selectedDurationOption?.duration_unit || selectedService?.duration || 'hour',
                duration_value: selectedDurationOption?.duration_value || 1 // Default fallback
            })

            if (result.error) {
                setErrorMessage(result.error)
            } else if (result.booking) {
                // Success State!
                setSuccessBooking(result.booking)
                setStep(5) // New Success Step
            }
        } catch (e) {
            console.error(e)
            setErrorMessage(t.booking.booking_error)
        } finally {
            setIsVerifying(false)
        }
    }

    // Summary Helper
    const BookingSummaryCard = () => {
        if (!selectedDate || !selectedTime || !selectedService) return null

        // Calculate Dates logic for display
        let d = selectedDate
        const dayOfWeek = selectedDate.getDay()
        const dayConfig = workingHours.find(wh => wh.day_of_week === dayOfWeek)
        if (dayConfig && dayConfig.start_time && dayConfig.end_time) {
            const [startH] = dayConfig.start_time.split(':').map(Number)
            const [endH] = dayConfig.end_time.split(':').map(Number)
            const [selectedH] = selectedTime.split(':').map(Number)
            if (startH > endH && selectedH < startH) {
                d = addDays(selectedDate, 1)
            }
        }

        const bookingDate = d
        const startDateTime = parse(selectedTime, 'HH:mm', bookingDate)
        const endDateTime = addMinutes(startDateTime, getBookingDurationMinutes())

        return (
            <div className="bg-gray-50 p-4 rounded-lg text-sm space-y-3 mb-6 border">
                <h4 className={`font-bold text-gray-900 mb-2 border-b pb-2 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.booking.details_title}</h4>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">{t.booking.service_label}</span>
                    <span className="font-semibold">{selectedService.name}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">{t.booking.duration_label}</span>
                    <span className="font-semibold" dir="ltr">
                        {selectedDurationOption
                            ? `${selectedDurationOption.duration_value} ${formatDurationUnit(selectedDurationOption.duration_unit)}`
                            : selectedService.duration === 'hour' ? t.services.OneHour : selectedService.duration === 'day' ? t.services.OneDay : t.services.OpenDuration
                        }
                    </span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">{t.booking.start_time_label}</span>
                    <span className="font-semibold" dir="ltr">
                        {bookingDate.toLocaleDateString(lang === 'ar' ? 'en-GB' : 'en-US')} {format(startDateTime, 'hh:mm a').replace(/AM/g, lang === 'ar' ? 'ص' : 'AM').replace(/PM/g, lang === 'ar' ? 'م' : 'PM')}
                    </span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">{t.booking.end_time_label}</span>
                    <span className="font-semibold" dir="ltr">
                        {endDateTime.toLocaleDateString(lang === 'ar' ? 'en-GB' : 'en-US')} {format(endDateTime, 'hh:mm a').replace(/AM/g, lang === 'ar' ? 'ص' : 'AM').replace(/PM/g, lang === 'ar' ? 'م' : 'PM')}
                    </span>
                </div>
                <div className="flex justify-between border-t pt-2 mt-2">
                    <span className="text-muted-foreground font-bold">{t.common.price}:</span>
                    <span className="font-bold text-primary text-lg">{formatPrice(getBookingPrice())} {t.common.currency}</span>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50/50 pb-10">
            {/* Branch Cover Image */}


            {/* Hero / Header */}
            <div className="bg-white border-b sticky top-0 z-30 shadow-sm">
                <div className="container mx-auto px-4 py-4 md:py-6 max-w-5xl">
                    <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-right" dir={dir}>
                        {/* Toggle Button */}
                        <div className={`absolute top-4 ${dir === 'rtl' ? 'left-4' : 'right-4'}`}>
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-2"
                                onClick={() => setLang(prev => prev === 'ar' ? 'en' : 'ar')}
                            >
                                <Globe className="w-4 h-4" />
                                {lang === 'ar' ? 'English' : 'عربي'}
                            </Button>
                        </div>

                        <div className="flex items-center gap-4">
                            {branch.image_url ? (
                                <div className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-full flex items-center justify-center border-4 border-white shadow-sm overflow-hidden shrink-0">
                                    <img
                                        src={branch.image_url}
                                        alt={branch.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            ) : businessLogo && (
                                <div className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-full flex items-center justify-center border-4 border-white shadow-sm overflow-hidden text-3xl font-bold text-primary shrink-0">
                                    <img
                                        src={businessLogo}
                                        alt={businessName}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="flex-1 space-y-1 md:space-y-2">
                            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">{branch.name}</h1>
                            <div className="flex flex-wrap justify-center md:justify-start gap-3 text-muted-foreground text-sm">
                                {branch.phone && (
                                    <div className="flex items-center gap-1">
                                        <Phone className="w-4 h-4" />
                                        <span dir="ltr">{branch.phone}</span>
                                    </div>
                                )}
                                {branch.address && (
                                    <div className="flex items-center gap-1">
                                        <MapPin className="w-4 h-4" />
                                        {branch.location_url ? (
                                            <a
                                                href={branch.location_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 underline hover:text-blue-800 transition-colors"
                                            >
                                                {branch.address}
                                            </a>
                                        ) : (
                                            <span>{branch.address}</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="container mx-auto px-4 py-8 max-w-7xl" dir={dir}>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {services.map(service => {
                        const serviceDurations = durations.filter(d => d.service_id === service.id)
                        const hasDurations = serviceDurations.length > 0
                        const systemPrice = service.price

                        // Filter out services that have NO durations AND NO default price
                        if (!hasDurations && !systemPrice) return null

                        // Determine display label for multiple options
                        let durationLabel = t.services.multiple_options
                        if (hasDurations) {
                            const uniqueUnits = Array.from(new Set(serviceDurations.map(d => d.duration_unit)))
                            if (uniqueUnits.length === 1) {
                                durationLabel = uniqueUnits[0] === 'hour' ? t.services.multi_hour :
                                    uniqueUnits[0] === 'day' ? t.services.multi_day :
                                        t.services.multiple_options
                            }
                        }

                        return (
                            <Card key={service.id} className="overflow-hidden hover:shadow-lg transition-shadow border-transparent hover:border-primary/20 flex flex-col h-full text-sm">
                                <div className="relative w-full aspect-[4/3] bg-gray-100 group">
                                    {service.image_url ? (
                                        <img
                                            src={service.image_url}
                                            alt={service.name}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-gray-300 bg-gray-50">
                                            <Clock className="w-8 h-8 opacity-20" />
                                        </div>
                                    )}
                                </div>

                                <CardHeader className="p-3 pb-0 flex-none">
                                    <div className="flex items-center gap-1">
                                        <CardTitle className="text-base font-bold line-clamp-1" title={service.name}>{service.name}</CardTitle>
                                        {service.description && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-5 w-5 rounded-full hover:bg-gray-100 shrink-0 text-muted-foreground"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setInfoDialogService(service)
                                                }}
                                            >
                                                <AlertCircle className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                </CardHeader>

                                <CardContent className="p-3 pt-2 flex-1 flex flex-col justify-end">
                                    <div className="space-y-2 mt-auto">
                                        {/* Pricing Logic */}
                                        {hasDurations ? (
                                            <div className="bg-gray-50 rounded-lg p-2 space-y-2">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-[10px] text-gray-500 font-medium">{durationLabel}</span>
                                                    <div className="flex items-baseline gap-1">
                                                        <span className="text-[10px] text-gray-400">{t.services.starts_from}</span>
                                                        <span className="text-lg font-bold text-primary">{formatPrice(serviceDurations[0].price)} <span className="text-[10px]">{t.common.currency}</span></span>
                                                    </div>
                                                </div>
                                                <Button size="sm" className="w-full h-8 text-xs font-bold" onClick={() => handleServiceClick(service)}>{t.common.book}</Button>
                                            </div>
                                        ) : (
                                            <div className="bg-gray-50 rounded-lg p-2 space-y-2">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-[10px] text-gray-500 font-medium">
                                                        {service.duration === 'hour' ? t.services.OneHour : service.duration === 'day' ? t.services.OneDay : t.services.OpenDuration}
                                                    </span>
                                                    <div className="flex items-baseline gap-1">
                                                        <span className="text-[10px] text-gray-400">{t.common.price}</span>
                                                        <span className="text-lg font-bold text-primary">{formatPrice(systemPrice)} <span className="text-[10px]">{t.common.currency}</span></span>
                                                    </div>
                                                </div>
                                                <Button size="sm" className="w-full h-8 text-xs font-bold" onClick={() => handleServiceClick(service)}>{t.common.book}</Button>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            </div>

            {/* Service Info Dialog */}
            <Dialog open={!!infoDialogService} onOpenChange={(open) => !open && setInfoDialogService(null)}>
                <DialogContent className="sm:max-w-md bg-white" dir={dir}>
                    <DialogHeader className="text-right">
                        <DialogTitle>{infoDialogService?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 text-gray-700 leading-relaxed">
                        {infoDialogService?.description}
                    </div>
                    <DialogFooter className="sm:justify-start">
                        <Button type="button" variant="secondary" onClick={() => setInfoDialogService(null)}>
                            {t.common.close}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Main Booking Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[500px] w-[95vw] max-h-[90vh] overflow-y-auto bg-white" dir={dir}>
                    <DialogHeader className={`border-b pb-4 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                        <DialogTitle>{t.booking.title}</DialogTitle>
                        <DialogDescription>
                            <DialogDescription>
                                {selectedService?.name}
                            </DialogDescription>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        {step === 1 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                <h3 className="text-sm font-medium text-muted-foreground mb-2">{t.booking.choose_day}</h3>
                                <div className="flex justify-center w-full">
                                    <div className="w-full max-w-[400px] space-y-2">
                                        <Label>{t.booking.date_label}</Label>
                                        <Input
                                            type="date"
                                            className="w-full bg-white text-lg h-12"
                                            min={new Date().toISOString().split('T')[0]}
                                            value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}
                                            onChange={(e) => {
                                                if (e.target.value) {
                                                    // Parse string as Local Date (00:00 Local)
                                                    const d = parse(e.target.value, 'yyyy-MM-dd', new Date())
                                                    const day = d.getDay()
                                                    const wh = workingHours.find(w => w.day_of_week === day)

                                                    if (!wh || wh.is_closed) {
                                                        setDateError(t.booking.branch_closed)
                                                        setSelectedDate(undefined)
                                                        return
                                                    }

                                                    setDateError(null)
                                                    setSelectedDate(d)
                                                } else {
                                                    setSelectedDate(undefined)
                                                    setDateError(null)
                                                }
                                            }}
                                        />
                                        {dateError && <p className="text-sm text-red-500 mt-1 font-medium animate-pulse">{dateError}</p>}
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-medium text-muted-foreground">{t.booking.choose_time}</h3>
                                    <span className="text-xs text-muted-foreground">{selectedDate ? `${format(selectedDate, 'EEEE', { locale: dateLocale })}, ${format(selectedDate, 'd')} ${format(selectedDate, 'MMMM', { locale: dateLocale })}` : ''}</span>
                                </div>

                                {/* Duration Selector */}
                                {selectedService && durations.filter(d => d.service_id === selectedService.id).length > 0 && (
                                    <div className="mb-4 space-y-2">
                                        <Label>{t.booking.duration_label}</Label>
                                        <div className="flex flex-wrap gap-2">
                                            {durations.filter(d => d.service_id === selectedService.id).map(d => (
                                                <div
                                                    key={d.id}
                                                    onClick={() => setSelectedDurationOption(d)}
                                                    className={cn(
                                                        "cursor-pointer px-4 py-3 rounded-lg border text-sm font-medium transition-all flex items-center justify-between gap-4 w-full sm:w-auto", // Full width on mobile for easier tapping
                                                        selectedDurationOption?.id === d.id
                                                            ? "bg-black text-white border-black shadow-md"
                                                            : "bg-white text-gray-700 border-gray-200 hover:border-black/50"
                                                    )}
                                                >
                                                    <span>{d.duration_value} {formatDurationUnit(d.duration_unit)}</span>
                                                    <div className="flex items-center gap-1">
                                                        <span className={cn(
                                                            "text-xs font-normal opacity-80",
                                                            selectedDurationOption?.id === d.id ? "text-white" : "text-muted-foreground"
                                                        )}>{t.common.price}:</span>
                                                        <span className={cn(
                                                            "text-sm font-bold",
                                                            selectedDurationOption?.id === d.id ? "text-white" : "text-black"
                                                        )}>{formatPrice(d.price)}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {isLoadingSlots ? (
                                    <div className="h-60 flex items-center justify-center text-muted-foreground">
                                        {t.booking.searching_slots}
                                    </div>
                                ) : (
                                    <ScrollArea className="h-[300px] pr-4 border rounded-md p-2">
                                        <div className="grid grid-cols-4 gap-2">
                                            {availableSlots.length > 0 ? availableSlots.map((slot, i) => (
                                                <Button
                                                    key={i}
                                                    variant={slot.status === 'free' ? (selectedTime === slot.time ? 'default' : 'outline') : 'ghost'}
                                                    disabled={slot.status !== 'free'}
                                                    className={cn(
                                                        "text-xs h-10 w-full",
                                                        slot.status === 'busy' && "bg-gray-100 text-gray-400 hover:bg-gray-100 hover:text-gray-400 opacity-50 cursor-not-allowed",
                                                        slot.status === 'past' && "opacity-30 cursor-not-allowed",
                                                        selectedTime === slot.time && "bg-black text-white ring-2 ring-black ring-offset-2"
                                                    )}
                                                    onClick={() => setSelectedTime(slot.time)}
                                                >
                                                    {format(parse(slot.time, 'HH:mm', new Date()), 'hh:mm a').replace(/AM/g, lang === 'ar' ? 'ص' : 'AM').replace(/PM/g, lang === 'ar' ? 'م' : 'PM')}
                                                </Button>
                                            )) : (
                                                <div className="col-span-4 text-center py-10 text-muted-foreground">
                                                    {t.booking.no_slots}
                                                </div>
                                            )}
                                        </div>
                                    </ScrollArea>
                                )}
                                <div className="flex items-center gap-4 text-xs text-muted-foreground justify-center">
                                    <div className="flex items-center gap-1"><div className="w-3 h-3 border rounded"></div> {t.booking.available}</div>
                                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-gray-100 rounded"></div> {t.booking.unavailable}</div>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                <BookingSummaryCard />

                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <Label>{t.booking.full_name}</Label>
                                        <Input
                                            placeholder={t.booking.name_placeholder}
                                            value={clientName}
                                            onChange={(e) => setClientName(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>{t.booking.phone_label}</Label>
                                        <Input
                                            placeholder={t.booking.phone_placeholder}
                                            value={clientPhone}
                                            onChange={(e) => {
                                                const val = e.target.value
                                                if (/^[0-9]*$/.test(val)) {
                                                    setClientPhone(val)
                                                }
                                            }}
                                            type="tel"
                                            inputMode="numeric"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>{t.booking.email_label} <span className="text-red-500">*</span> {t.booking.email_required_hint}</Label>
                                        <Input
                                            placeholder={t.booking.email_placeholder}
                                            value={clientEmail}
                                            onChange={(e) => {
                                                setClientEmail(e.target.value)
                                                // Clear error if format becomes valid
                                                if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.target.value)) {
                                                    setErrorMessage(null)
                                                }
                                            }}
                                            type="email"
                                            className={cn(
                                                errorMessage && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail) ? "border-red-500 bg-red-50 focus-visible:ring-red-500" : ""
                                            )}
                                        />
                                        {errorMessage && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail) && (
                                            <p className="text-xs text-red-500">{t.booking.email_invalid}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 4 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                <h3 className="text-sm font-medium text-muted-foreground mb-4">{t.booking.otp_sent_title}</h3>
                                <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700 mb-4 flex items-start gap-2">
                                    <Info className="w-4 h-4 shrink-0 mt-0.5 ml-2" />
                                    <div>
                                        {t.booking.otp_hint}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <Label>{t.booking.enter_otp_label}</Label>
                                    <div className="flex justify-center" dir="ltr">
                                        <Input
                                            type="text"
                                            maxLength={4}
                                            className="text-center text-3xl tracking-[0.5em] w-48 h-16 font-mono"
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value)}
                                            placeholder="0000"
                                        />
                                    </div>
                                </div>

                                {errorMessage && (
                                    <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-100 flex items-center gap-2" role="alert">
                                        <Info className="w-4 h-4" />
                                        {errorMessage}
                                    </div>
                                )}
                            </div>
                        )}

                        {step === 5 && successBooking && (
                            <div className="space-y-6 py-6 text-center animate-in fade-in zoom-in duration-300">
                                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Check className="w-8 h-8" />
                                </div>
                                <div className="space-y-2">
                                    <h2 className="text-2xl font-bold text-gray-900">{t.booking.success_title}</h2>
                                    <p className="text-gray-500 text-sm">
                                        {t.booking.success_msg}
                                        <br />
                                        <span className="text-xs text-muted-foreground">{t.booking.spam_hint}</span>
                                    </p>
                                </div>

                                <div className="p-4 bg-gray-50 rounded-lg border text-right text-sm space-y-2">
                                    <div className="font-semibold text-gray-900 mb-2">{t.booking.link_label}</div>
                                    <div className="flex items-center gap-2 bg-white border rounded p-2 text-xs text-muted-foreground break-all" dir="ltr">
                                        <Info className="w-3 h-3 shrink-0" />
                                        {/* Use token here assuming successBooking contains token */}
                                        {`${window.location.origin}/${slug}/${(successBooking as any).token}`}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-2">
                                        {t.booking.keep_link_hint}
                                    </div>
                                </div>

                                <Button className="w-full" onClick={() => {
                                    window.open(`${window.location.origin}/${slug}/${(successBooking as any).token}`, '_blank')
                                }}>
                                    {t.booking.view_details_btn}
                                </Button>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="gap-2 sm:justify-end border-t pt-4 flex flex-col-reverse sm:flex-row">
                        {step === 1 && (
                            <Button className="w-full sm:w-auto" disabled={!selectedDate} onClick={handleNextStep}>
                                {t.common.next} <ChevronLeft className={`w-4 h-4 ${dir === 'rtl' ? 'mr-2' : 'ml-2 rotate-180'}`} />
                            </Button>
                        )}
                        {step === 2 && (
                            <>
                                <Button variant="outline" className="w-full sm:w-auto" onClick={() => setStep(1)}>
                                    {t.common.back}
                                </Button>
                                <Button className="w-full sm:w-auto" disabled={!selectedTime} onClick={handleNextStep}>
                                    {t.common.next} <ChevronLeft className={`w-4 h-4 ${dir === 'rtl' ? 'mr-2' : 'ml-2 rotate-180'}`} />
                                </Button>
                            </>
                        )}
                        {step === 3 && (
                            <>
                                <Button variant="outline" className="w-full sm:w-auto" onClick={() => setStep(2)}>
                                    {t.common.back}
                                </Button>
                                <Button
                                    className="w-full sm:w-auto"
                                    disabled={!clientName || !clientPhone || !clientEmail || isSubmitting}
                                    onClick={handleSendOTP}
                                >
                                    {isSubmitting ? t.booking.sending_btn : t.booking.send_otp_btn}
                                </Button>
                            </>
                        )}
                        {step === 4 && (
                            <>
                                <Button variant="ghost" className="w-full sm:w-auto" onClick={() => setStep(3)} disabled={isVerifying}>
                                    {t.booking.change_email}
                                </Button>
                                <Button
                                    className="w-full sm:w-auto"
                                    disabled={otp.length !== 4 || isVerifying}
                                    onClick={handleVerifyAndSubmit}
                                >
                                    {isVerifying ? t.booking.confirming_btn : t.booking.confirm_btn}
                                </Button>
                            </>
                        )}
                        {step === 5 && (
                            <Button variant="outline" className="w-full" onClick={() => {
                                setIsDialogOpen(false)
                                setStep(1)
                                setSuccessBooking(null)
                            }}>
                                {t.common.close}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
