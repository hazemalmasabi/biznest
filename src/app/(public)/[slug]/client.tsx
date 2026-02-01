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
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Facebook, Instagram, Twitter, Youtube, Ghost, Send, Phone as PhoneIcon, MessageCircle } from 'lucide-react'
import { format, addMinutes, isSameDay, parse, set, isAfter, isBefore, addDays } from "date-fns"
import { arSA, enUS } from "date-fns/locale"
import { useParams } from 'next/navigation'
import { Globe } from 'lucide-react'
import { publicDictionary } from '@/app/(public)/dictionaries'

import { getPublicBranchBookings, createPublicBooking, sendVerificationCode, verifyVerificationCode, initiatePayment } from '@/app/(public)/actions'

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
    description?: string | null
    social_x?: string | null
    social_youtube?: string | null
    social_instagram?: string | null
    social_facebook?: string | null
    social_snapchat?: string | null
    social_telegram?: string | null
    social_whatsapp?: string | null
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
    paymentSettings?: {
        is_enabled: boolean
        deposit_percentage: number
        branch_id: number
    } | null
}

export function PublicBookingClient({ branch, services, durations: rawDurations, workingHours, paymentSettings }: PublicBookingClientProps) {
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

    // Debug Payment Settings
    useEffect(() => {
        if (step === 5) {
            console.log("Current Payment Settings:", paymentSettings)
        }
    }, [step, paymentSettings])
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
        if (step === 1 && selectedDate && !dateError) {
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

                        {/* Contact / More Button */}
                        <div className={`absolute top-4 ${dir === 'rtl' ? 'right-4' : 'left-4'}`}>
                            <Sheet>
                                <SheetTrigger asChild>
                                    <Button variant="outline" size="sm" className="gap-2">
                                        {lang === 'ar' ? 'المزيد' : 'More'}
                                    </Button>
                                </SheetTrigger>
                                <SheetContent side={dir === 'rtl' ? 'right' : 'left'} dir={dir} className="overflow-y-auto">
                                    <SheetHeader className="text-start">
                                        <SheetTitle>{branch.name}</SheetTitle>
                                        {branch.description && (
                                            <SheetDescription className="text-start mt-2 whitespace-pre-line">
                                                {branch.description}
                                            </SheetDescription>
                                        )}
                                    </SheetHeader>

                                    <div className="mt-8 space-y-6">
                                        {/* Contact Info */}
                                        <div className="space-y-4">
                                            {branch.phone && (
                                                <div className="space-y-1 px-2">
                                                    <span className="text-xs font-bold text-muted-foreground">{lang === 'ar' ? 'رقم التواصل' : 'Contact Number'}</span>
                                                    <a href={`tel:${branch.phone}`} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                                                        <div className="bg-white p-2 rounded-full shadow-sm text-primary">
                                                            <PhoneIcon className="w-5 h-5" />
                                                        </div>
                                                        <div className="text-sm font-medium" dir="ltr">{branch.phone}</div>
                                                    </a>
                                                </div>
                                            )}

                                            {branch.address && (
                                                <div className="space-y-1 px-2">
                                                    <span className="text-xs font-bold text-muted-foreground">{lang === 'ar' ? 'الموقع' : 'Location'}</span>
                                                    <a
                                                        href={branch.location_url || '#'}
                                                        target={branch.location_url ? "_blank" : undefined}
                                                        rel="noopener noreferrer"
                                                        className={`flex items-start gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors ${!branch.location_url && 'pointer-events-none'}`}
                                                    >
                                                        <div className="bg-white p-2 rounded-full shadow-sm text-primary mt-0.5">
                                                            <MapPin className="w-5 h-5" />
                                                        </div>
                                                        <div className={`text-sm font-medium ${branch.location_url ? 'text-blue-600 underline' : ''}`}>{branch.address}</div>
                                                    </a>
                                                </div>
                                            )}
                                        </div>

                                        {/* Social Media */}
                                        <div className="space-y-3">
                                            <h4 className="text-sm font-bold text-muted-foreground px-2">{lang === 'ar' ? 'تواصل معنا' : 'Connect with us'}</h4>
                                            <div className="grid grid-cols-4 gap-3">
                                                {branch.social_whatsapp && (
                                                    <a href={branch.social_whatsapp.startsWith('http') ? branch.social_whatsapp : `https://wa.me/${branch.social_whatsapp}`} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 group">
                                                        <div className="w-12 h-12 rounded-full bg-[#25D366] text-white flex items-center justify-center transition-transform hover:scale-110 shadow-sm">
                                                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                                                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                                            </svg>
                                                        </div>
                                                        <span className="text-[10px] ">WhatsApp</span>
                                                    </a>
                                                )}
                                                {branch.social_x && (
                                                    <a href={branch.social_x} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 group">
                                                        <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center transition-transform hover:scale-110 shadow-sm">
                                                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zM17.513 21.75h-2.437L8.08 4.126h2.437z" />
                                                            </svg>
                                                        </div>
                                                        <span className="text-[10px] ">X</span>
                                                    </a>
                                                )}
                                                {branch.social_instagram && (
                                                    <a href={branch.social_instagram} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 group">
                                                        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#FEDA75] via-[#D62976] to-[#962FBF] text-white flex items-center justify-center transition-transform hover:scale-110 shadow-sm">
                                                            <Instagram className="w-6 h-6" />
                                                        </div>
                                                        <span className="text-[10px] ">Instagram</span>
                                                    </a>
                                                )}
                                                {branch.social_snapchat && (
                                                    <a href={branch.social_snapchat} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 group">
                                                        <div className="w-12 h-12 rounded-full bg-[#FFFC00] flex items-center justify-center transition-transform hover:scale-110 shadow-sm border border-[#FFFC00]">
                                                            <svg viewBox="0 0 16 16" className="w-8 h-8" fill="white" stroke="black" strokeWidth="0.8" style={{ strokeLinejoin: "round", strokeLinecap: "round" }}>
                                                                <path d="M15.943 11.526c-.111-.303-.323-.465-.564-.599a1 1 0 0 0-.123-.064l-.219-.111c-.752-.399-1.339-.902-1.746-1.498a3.4 3.4 0 0 1-.3-.531c-.034-.1-.032-.156-.008-.207a.3.3 0 0 1 .097-.1c.129-.086.262-.173.352-.231.162-.104.289-.187.371-.245.309-.216.525-.446.66-.702a1.4 1.4 0 0 0 .069-1.16c-.205-.538-.713-.872-1.329-.872a1.8 1.8 0 0 0-.487.065c.006-.368-.002-.757-.035-1.139-.116-1.344-.587-2.048-1.077-2.61a4.3 4.3 0 0 0-1.095-.881C9.764.216 8.92 0 7.999 0s-1.76.216-2.505.641c-.412.232-.782.53-1.097.883-.49.562-.96 1.267-1.077 2.61-.033.382-.04.772-.036 1.138a1.8 1.8 0 0 0-.487-.065c-.615 0-1.124.335-1.328.873a1.4 1.4 0 0 0 .067 1.161c.136.256.352.486.66.701.082.058.21.14.371.246l.339.221a.4.4 0 0 1 .109.11c.026.053.027.11-.012.217a3.4 3.4 0 0 1-.295.52c-.398.583-.968 1.077-1.696 1.472-.385.204-.786.34-.955.8-.128.348-.044.743.28 1.075q.18.189.409.31a4.4 4.4 0 0 0 1 .4.7.7 0 0 1 .202.09c.118.104.102.26.259.488q.12.178.296.3c.33.229.701.243 1.095.258.355.014.758.03 1.217.18.19.064.389.186.618.328.55.338 1.305.802 2.566.802 1.262 0 2.02-.466 2.576-.806.227-.14.424-.26.609-.321.46-.152.863-.168 1.218-.181.393-.015.764-.03 1.095-.258a1.14 1.14 0 0 0 .336-.368c.114-.192.11-.327.217-.42a.6.6 0 0 1 .19-.087 4.5 4.5 0 0 0 1.014-.404c.16-.087.306-.2.429-.336l.004-.005c.304-.325.38-.709.256-1.047m-1.121.602c-.684.378-1.139.337-1.493.565-.3.193-.122.61-.34.76-.269.186-1.061-.012-2.085.326-.845.279-1.384 1.082-2.903 1.082s-2.045-.801-2.904-1.084c-1.022-.338-1.816-.14-2.084-.325-.218-.15-.041-.568-.341-.761-.354-.228-.809-.187-1.492-.563-.436-.24-.189-.39-.044-.46 2.478-1.199 2.873-3.05 2.89-3.188.022-.166.045-.297-.138-.466-.177-.164-.962-.65-1.18-.802-.36-.252-.52-.503-.402-.812.082-.214.281-.295.49-.295a1 1 0 0 1" />
                                                            </svg>
                                                        </div>
                                                        <span className="text-[10px] ">Snapchat</span>
                                                    </a>
                                                )}
                                                {branch.social_youtube && (
                                                    <a href={branch.social_youtube} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 group">
                                                        <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-all shadow-sm">
                                                            <Youtube className="w-6 h-6" />
                                                        </div>
                                                        <span className="text-[10px] ">YouTube</span>
                                                    </a>
                                                )}
                                                {branch.social_facebook && (
                                                    <a href={branch.social_facebook} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 group">
                                                        <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                                                            <Facebook className="w-6 h-6" />
                                                        </div>
                                                        <span className="text-[10px] ">Facebook</span>
                                                    </a>
                                                )}
                                                {branch.social_telegram && (
                                                    <a href={branch.social_telegram} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 group">
                                                        <div className="w-12 h-12 rounded-full bg-sky-50 text-sky-500 flex items-center justify-center group-hover:bg-sky-500 group-hover:text-white transition-all shadow-sm">
                                                            <Send className="w-6 h-6" />
                                                        </div>
                                                        <span className="text-[10px] ">Telegram</span>
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </SheetContent>
                            </Sheet>
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
                                            // Fix: Use local date string for min to avoid timezone issues
                                            min={new Date().toLocaleDateString('en-CA')}
                                            value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}
                                            onChange={(e) => {
                                                if (e.target.value) {
                                                    // Parse string as Local Date
                                                    // FIX: Set time to NOON (12:00) to avoid any midnight/timezone 
                                                    // shifts that could cause getDay() to return the previous day on some mobiles.
                                                    const d = parse(e.target.value, 'yyyy-MM-dd', new Date())
                                                    d.setHours(12, 0, 0, 0)

                                                    const day = d.getDay()
                                                    const wh = workingHours.find(w => w.day_of_week === day)

                                                    if (!wh || wh.is_closed) {
                                                        setDateError(t.booking.branch_closed)
                                                        // Fix: Keep the date selected so user sees what they picked, but show error
                                                        setSelectedDate(d)
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

                                {/* Payment Options */}
                                {paymentSettings?.is_enabled && (
                                    <div className="space-y-4 pt-4 border-t">
                                        <h3 className="font-semibold text-gray-900">{t.common.payment_options || "Payment Options"}</h3>

                                        <div className="grid gap-3">
                                            {/* Full Payment */}
                                            <Button
                                                className="w-full bg-primary hover:bg-primary/90 h-12 text-lg"
                                                onClick={async () => {
                                                    const price = (successBooking as any).price || getBookingPrice() // getBookingPrice is mostly correct, but successBooking is safer if available
                                                    const res = await initiatePayment(parseInt(successBooking.id), price, branch.id, 'full')
                                                    if (res.url) window.location.href = res.url
                                                    else if (res.error) alert(res.error)
                                                }}
                                            >
                                                {t.common.pay_full || "Pay Full Amount"} ({formatPrice((successBooking as any).price || getBookingPrice())} {t.common.currency})
                                            </Button>

                                            {/* Deposit Payment */}
                                            {Number(paymentSettings.deposit_percentage) > 0 && Number(paymentSettings.deposit_percentage) < 100 && (
                                                <Button
                                                    variant="outline"
                                                    className="w-full h-12 text-lg border-primary text-primary hover:bg-primary/5"
                                                    onClick={async () => {
                                                        const price = (successBooking as any).price || getBookingPrice()
                                                        const depositAmount = price * (Number(paymentSettings.deposit_percentage) / 100)
                                                        const res = await initiatePayment(parseInt(successBooking.id), depositAmount, branch.id, 'deposit')
                                                        if (res.url) window.location.href = res.url
                                                        else if (res.error) alert(res.error)
                                                    }}
                                                >
                                                    {t.common.pay_deposit || "Pay Deposit"} ({Number(paymentSettings.deposit_percentage)}%)
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                )}


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

                                <Button variant={paymentSettings?.is_enabled ? "outline" : "default"} className="w-full" onClick={() => {
                                    window.open(`${window.location.origin}/${slug}/${(successBooking as any).token}`, '_blank')
                                }}>
                                    {paymentSettings?.is_enabled ? (t.common.pay_later || "Pay Later / View Details") : t.booking.view_details_btn}
                                </Button>
                            </div>
                        )}


                    </div>

                    <DialogFooter className="gap-2 sm:justify-end border-t pt-4 flex flex-col-reverse sm:flex-row">
                        {step === 1 && (
                            <Button className="w-full sm:w-auto" disabled={!selectedDate || !!dateError} onClick={handleNextStep}>
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
        </div >
    )
}
