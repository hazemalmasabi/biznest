"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Phone, CheckCircle, Globe } from "lucide-react"
import { Button } from '@/components/ui/button'
import { format } from "date-fns"
import { arSA, enUS } from "date-fns/locale"
import { publicDictionary } from '@/app/(public)/dictionaries'

interface BookingDetailsClientProps {
    booking: any
}

export function BookingDetailsClient({ booking }: BookingDetailsClientProps) {
    const [lang, setLang] = useState<'ar' | 'en'>('ar')
    const t = publicDictionary[lang]
    const dir = lang === 'ar' ? 'rtl' : 'ltr'
    const dateLocale = lang === 'ar' ? arSA : enUS

    const branch = booking.branches
    const isPaid = booking.payment_status === 'paid'
    const status = booking.status || 'confirmed'

    const formatPrice = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'SAR',
            currencyDisplay: 'symbol'
        }).format(amount).replace('SAR', t.common.currency)
    }

    const statusMap: any = {
        'pending': { label: t.receipt.status_pending, color: 'bg-yellow-100 text-yellow-800' },
        'confirmed': { label: t.receipt.status_confirmed, color: 'bg-green-100 text-green-800' },
        'cancelled': { label: t.receipt.status_cancelled, color: 'bg-red-100 text-red-800' },
        'completed': { label: t.receipt.status_completed, color: 'bg-blue-100 text-blue-800' },
        'under_review': { label: t.receipt.status_review, color: 'bg-orange-100 text-orange-800' }
    }

    const currentStatus = statusMap[status] || statusMap['pending']

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10 px-4" dir={dir}>
            <div className="w-full max-w-lg space-y-6 relative">

                {/* Toggle Button */}
                <div className={`absolute top-0 ${dir === 'rtl' ? 'left-0' : 'right-0'}`}>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2"
                        onClick={() => setLang(prev => prev === 'ar' ? 'en' : 'ar')}
                    >
                        <Globe className="w-4 h-4" />
                        {lang === 'ar' ? 'English' : 'عربي'}
                    </Button>
                </div>

                {/* Header: Branch Info */}
                <div className="flex flex-col md:flex-row items-center justify-center gap-6 text-center md:text-right pt-8">
                    {(branch as any).image_url && (
                        <div className="w-20 h-20 rounded-full overflow-hidden shadow-sm border-4 border-white shrink-0 bg-gray-100">
                            <img
                                src={(branch as any).image_url}
                                alt={branch.name}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    )}

                    <div className="space-y-1">
                        <h1 className="text-2xl font-bold text-gray-900">{branch.name}</h1>
                        <div className="flex items-center justify-center md:justify-start gap-4 text-sm text-gray-500">
                            {branch.phone && (
                                <div className="flex items-center gap-1">
                                    <Phone className="w-3 h-3" />
                                    <span dir="ltr">{branch.phone}</span>
                                </div>
                            )}
                            {branch.address && (
                                <div className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {(branch as any).location_url ? (
                                        <a
                                            href={(branch as any).location_url}
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

                {/* Booking Status Card */}
                <div className="flex flex-col items-center mb-6">
                    <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">{t.receipt.details_title}</h2>
                    <div className="text-sm text-gray-500 font-mono mt-1">
                        {t.receipt.ref_number} <span dir="ltr">#{booking.id}</span>
                    </div>
                </div>

                <Card className="shadow-sm border border-gray-100 overflow-hidden w-[95%] sm:w-full mx-auto">
                    <CardHeader className="bg-white border-b border-gray-50 pb-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-lg text-gray-900">{booking.customers?.name}</h3>
                            <Badge variant="secondary" className={`${currentStatus.color} hover:${currentStatus.color}`}>
                                {currentStatus.label}
                            </Badge>
                        </div>
                        {booking.customers?.phone && (
                            <div className={`text-sm text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`} dir="ltr">{booking.customers.phone}</div>
                        )}
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-gray-50">
                            {/* Service Row */}
                            <div className="flex justify-between items-center p-4 hover:bg-gray-50/50 transition-colors">
                                <span className="text-gray-500 font-medium whitespace-nowrap px-4">{t.booking.service_label}</span>
                                <div className={`text-${dir === 'rtl' ? 'left' : 'right'}`}>
                                    <span className="font-semibold text-gray-900 block">{booking.services?.name}</span>
                                    {booking.services?.description && (
                                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{booking.services?.description}</p>
                                    )}
                                </div>
                            </div>

                            {/* Duration Row */}
                            <div className="flex justify-between items-center p-4 hover:bg-gray-50/50 transition-colors">
                                <span className="text-gray-500 font-medium">{t.booking.duration_label}</span>
                                <span className="font-semibold text-gray-900" dir="ltr">
                                    {booking.duration_value} {booking.duration_unit === 'minute' ? t.common.minute : booking.duration_unit === 'hour' ? t.common.hour : t.common.day}
                                </span>
                            </div>

                            {/* Start Time Row */}
                            <div className="flex justify-between items-center p-4 hover:bg-gray-50/50 transition-colors">
                                <span className="text-gray-500 font-medium">{t.booking.start_time_label}</span>
                                <span className="font-semibold text-gray-900" dir="ltr">
                                    {format(new Date(booking.start_time), 'dd/MM/yyyy hh:mm a').replace(/AM/g, lang === 'ar' ? 'ص' : 'AM').replace(/PM/g, lang === 'ar' ? 'م' : 'PM')}
                                </span>
                            </div>

                            {/* End Time Row */}
                            <div className="flex justify-between items-center p-4 hover:bg-gray-50/50 transition-colors">
                                <span className="text-gray-500 font-medium">{t.booking.end_time_label}</span>
                                <span className="font-semibold text-gray-900" dir="ltr">
                                    {format(new Date(booking.end_time), 'dd/MM/yyyy hh:mm a').replace(/AM/g, lang === 'ar' ? 'ص' : 'AM').replace(/PM/g, lang === 'ar' ? 'م' : 'PM')}
                                </span>
                            </div>

                            {/* Price & Payment Row */}
                            <div className="flex justify-between items-center p-6 bg-gray-50">
                                <div className="flex flex-col">
                                    <span className="text-gray-500 font-bold mb-1">{t.receipt.total_amount}</span>
                                    {isPaid ? (
                                        <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded w-fit">{t.receipt.paid}</span>
                                    ) : (
                                        <span className="text-xs font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded w-fit">{t.receipt.unpaid_branch}</span>
                                    )}
                                </div>
                                <div className="text-right">
                                    <span className="text-2xl font-bold text-gray-900">{formatPrice(booking.price)}</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
