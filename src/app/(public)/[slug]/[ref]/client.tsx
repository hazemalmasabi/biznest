"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Phone, CheckCircle, Globe, Facebook, Instagram, Twitter, Youtube, Phone as PhoneIcon, Send } from "lucide-react"
import { Button } from '@/components/ui/button'
import { format } from "date-fns"
import { arSA, enUS } from "date-fns/locale"
import { publicDictionary } from '@/app/(public)/dictionaries'
import { initiatePayment } from '../../actions'
import { Loader2 } from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"

interface BookingDetailsClientProps {
    booking: any
    paymentSettings: any // Passing full settings
}

export function BookingDetailsClient({ booking, paymentSettings }: BookingDetailsClientProps) {
    const [lang, setLang] = useState<'ar' | 'en'>('ar')
    const t = publicDictionary[lang]
    const dir = lang === 'ar' ? 'rtl' : 'ltr'
    const dateLocale = lang === 'ar' ? arSA : enUS

    const branch = booking.branch  // Fixed alias
    const isPaid = booking.payment_status === 'paid'
    const status = booking.status || 'confirmed'
    const [isPaying, setIsPaying] = useState(false)

    const paidAmount = Number(booking.paid_amount || 0)
    const price = Number(booking.price || 0)
    const remainingAmount = price - paidAmount
    const isFullyPaid = remainingAmount <= 0

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

    // Helper to handle WhatsApp link
    const getWhatsAppLink = (input: string) => {
        if (!input) return '#'
        if (input.startsWith('http')) return input
        return `https://wa.me/${input}`
    }

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

                {/* More Button */}
                <div className={`absolute top-0 ${dir === 'rtl' ? 'right-0' : 'left-0'}`}>
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="sm" className="gap-2">
                                {lang === 'ar' ? 'المزيد' : 'More'}
                            </Button>
                        </SheetTrigger>
                        <SheetContent side={dir === 'rtl' ? 'right' : 'left'} dir={dir} className="overflow-y-auto w-full sm:max-w-md">
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
                                            <a href={getWhatsAppLink(branch.social_whatsapp)} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 group">
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
                                                <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-all shadow-sm">
                                                    <Send className="w-5 h-5 -ml-0.5 mt-0.5" />
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
                            <h3 className="font-bold text-lg text-gray-900">{booking.customer?.name}</h3>
                            <Badge variant="secondary" className={`${currentStatus.color} hover:${currentStatus.color}`}>
                                {currentStatus.label}
                            </Badge>
                        </div>
                        {booking.customer?.phone && (
                            <div className={`text-sm text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`} dir="ltr">{booking.customer.phone}</div>
                        )}
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-gray-50">
                            {/* Service Row */}
                            <div className="flex justify-between items-center p-4 hover:bg-gray-50/50 transition-colors">
                                <span className="text-gray-500 font-medium whitespace-nowrap px-4">{t.booking.service_label}</span>
                                <div className={`text-${dir === 'rtl' ? 'left' : 'right'}`}>
                                    <span className="font-semibold text-gray-900 block">{booking.service?.name}</span>
                                    {booking.service?.description && (
                                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{booking.service?.description}</p>
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
                            <div className="flex flex-col p-6 bg-gray-50 gap-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500 font-bold">{t.receipt.total_amount}</span>
                                    <span className="text-2xl font-bold text-gray-900">{formatPrice(price)}</span>
                                </div>

                                {/* Paid & Remaining Details */}
                                <div className="flex justify-between text-sm border-t border-gray-200 pt-2">
                                    <span className="text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded">{t.receipt.paid}: {formatPrice(paidAmount)}</span>
                                    {remainingAmount > 0 && (
                                        <span className="text-red-500 font-medium bg-red-50 px-2 py-0.5 rounded">{t.receipt.remaining} {formatPrice(remainingAmount)}</span>
                                    )}
                                </div>

                                {/* Payment Button */}
                                {paymentSettings?.is_enabled && status !== 'cancelled' && !isFullyPaid && (
                                    <div className="space-y-3 mt-4">
                                        {(() => {
                                            const depositPercentage = Number(paymentSettings.deposit_percentage || 0)
                                            const depositAmount = price * (depositPercentage / 100)

                                            // Case 1: Deposit Required AND Not Fully Paid check if deposit is covered
                                            const isDepositPaid = paidAmount >= (depositAmount - 1) // Tolerance for float diffs

                                            // 1. Pay Deposit / Full Amount (If deposit exists, is NOT paid yet)
                                            if (depositPercentage > 0 && !isDepositPaid) {
                                                return (
                                                    <div className="flex flex-col gap-3">
                                                        {/* Option A: Pay Deposit */}
                                                        <Button
                                                            variant="outline"
                                                            className="w-full border-primary text-primary hover:bg-primary/5"
                                                            onClick={async () => {
                                                                setIsPaying(true)
                                                                try {
                                                                    const res = await initiatePayment(booking.id, depositAmount, booking.branch_id, 'deposit')
                                                                    if (res.error) alert(res.error)
                                                                    else if (res.url) window.location.href = res.url
                                                                } catch (e) {
                                                                    console.error(e)
                                                                    alert('Payment initiation failed')
                                                                } finally {
                                                                    setIsPaying(false)
                                                                }
                                                            }}
                                                            disabled={isPaying}
                                                        >
                                                            {isPaying && <Loader2 className="mr-2 h-4 w-4 animate-spin rtl:ml-2 rtl:mr-0" />}
                                                            {t.common.pay_deposit} ({formatPrice(depositAmount)})
                                                        </Button>

                                                        {/* Option B: Pay Full Amount */}
                                                        <Button
                                                            className="w-full"
                                                            onClick={async () => {
                                                                setIsPaying(true)
                                                                try {
                                                                    const res = await initiatePayment(booking.id, price, booking.branch_id, 'full')
                                                                    if (res.error) alert(res.error)
                                                                    else if (res.url) window.location.href = res.url
                                                                } catch (e) {
                                                                    console.error(e)
                                                                    alert('Payment initiation failed')
                                                                } finally {
                                                                    setIsPaying(false)
                                                                }
                                                            }}
                                                            disabled={isPaying}
                                                        >
                                                            {isPaying && <Loader2 className="mr-2 h-4 w-4 animate-spin rtl:ml-2 rtl:mr-0" />}
                                                            {t.common.pay_full} ({formatPrice(price)})
                                                        </Button>
                                                    </div>
                                                )
                                            }

                                            // 2. Pay Remaining (If deposit is paid OR no deposit required, and there is remaining balance)
                                            if (remainingAmount > 0) {
                                                return (
                                                    <Button
                                                        className="w-full"
                                                        onClick={async () => {
                                                            setIsPaying(true)
                                                            try {
                                                                const res = await initiatePayment(booking.id, remainingAmount, booking.branch_id, 'remaining')
                                                                if (res.error) alert(res.error)
                                                                else if (res.url) window.location.href = res.url
                                                            } catch (e) {
                                                                console.error(e)
                                                                alert('Payment initiation failed')
                                                            } finally {
                                                                setIsPaying(false)
                                                            }
                                                        }}
                                                        disabled={isPaying}
                                                    >
                                                        {isPaying && <Loader2 className="mr-2 h-4 w-4 animate-spin rtl:ml-2 rtl:mr-0" />}
                                                        {t.receipt.pay_remaining} ({formatPrice(remainingAmount)})
                                                    </Button>
                                                )
                                            }
                                        })()}
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
