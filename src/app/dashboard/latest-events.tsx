'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Calendar, User, Globe, Clock, MapPin, ArrowUpDown, Info } from 'lucide-react'
import { getFutureEvents } from './actions'
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface LatestEventsProps {
    branchId: string
    lang: 'ar' | 'en'
    dict: any
}

export function LatestEvents({ branchId, lang, dict }: LatestEventsProps) {
    const [events, setEvents] = useState<{ all: any[], online: any[] }>({ all: [], online: [] })
    const [loading, setLoading] = useState(true)
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

    useEffect(() => {
        const fetchEvents = async () => {
            setLoading(true)
            console.log('LatestEvents: Fetching for branch', branchId, 'sort', sortOrder)
            try {
                const data = await getFutureEvents(branchId, sortOrder)
                console.log('LatestEvents: Data received', data)
                setEvents(data)
            } catch (error) {
                console.error("Failed to fetch future events", error)
            } finally {
                setLoading(false)
            }
        }

        fetchEvents()
    }, [branchId, sortOrder])

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        const today = new Date()
        const isToday = date.toDateString() === today.toDateString()
        const isTomorrow = new Date(today.setDate(today.getDate() + 1)).toDateString() === date.toDateString()

        const time = date.toLocaleTimeString(lang === 'ar' ? 'en-US' : 'en-US', { hour: '2-digit', minute: '2-digit' })
            .replace('AM', lang === 'ar' ? 'ص' : 'AM')
            .replace('PM', lang === 'ar' ? 'م' : 'PM')

        if (isToday) return `${lang === 'ar' ? 'اليوم' : 'Today'} ${time}`
        if (isTomorrow) return `${lang === 'ar' ? 'غداً' : 'Tomorrow'} ${time}`

        return `${date.toLocaleDateString(lang === 'ar' ? 'en-GB' : 'en-US')} ${time}`
    }

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            scheduled: "bg-blue-100 text-blue-800 hover:bg-blue-100",
            completed: "bg-green-100 text-green-800 hover:bg-green-100",
            cancelled: "bg-red-100 text-red-800 hover:bg-red-100",
            under_review: "bg-amber-100 text-amber-800 hover:bg-amber-100"
        }

        const labels: Record<string, string> = {
            scheduled: lang === 'ar' ? 'مجدول' : 'Scheduled',
            completed: lang === 'ar' ? 'مكتمل' : 'Completed',
            cancelled: lang === 'ar' ? 'ملغي' : 'Cancelled',
            under_review: lang === 'ar' ? 'قيد المراجعة' : 'Under Review'
        }

        return (
            <Badge variant="secondary" className={`${styles[status] || "bg-gray-100 text-gray-800"} px-2 py-0.5 whitespace-nowrap`}>
                {labels[status] || status}
            </Badge>
        )
    }

    const EventList = ({ items }: { items: any[] }) => {
        if (loading) {
            return (
                <div className="space-y-3 p-2">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-16 w-full bg-gray-100 animate-pulse rounded-lg" />
                    ))}
                </div>
            )
        }

        if (items.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground bg-gray-50/50 rounded-lg border border-dashed m-2">
                    <Calendar className="w-8 h-8 mb-2 opacity-50" />
                    <p>{lang === 'ar' ? 'لا توجد حجوزات مستقبلية' : 'No upcoming bookings'}</p>
                </div>
            )
        }

        return (
            <ScrollArea className="h-[300px] w-full p-2" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                <div className="space-y-3">
                    {items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-primary/10 rounded-full text-primary mt-1">
                                    <User className="w-4 h-4" />
                                </div>
                                <div className="space-y-1">
                                    <p className="font-medium leading-none text-sm">
                                        {item.customer?.name || (lang === 'ar' ? 'عميل' : 'Customer')}
                                    </p>
                                    <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            <span>{item.service?.name}</span>
                                        </div>
                                        {item.branch && (
                                            <div className="flex items-center gap-1">
                                                <MapPin className="w-3 h-3" />
                                                <span>{item.branch.name}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col items-end gap-2">
                                <div className="text-xs font-medium bg-gray-100 px-2 py-1 rounded-md">
                                    {formatDate(item.start_time)}
                                </div>
                                {getStatusBadge(item.status)}
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        )
    }

    return (
        <Card className="col-span-full">
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
                <CardTitle className="text-xl font-semibold flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    {lang === 'ar' ? 'الحجوزات القادمة' : 'Upcoming Bookings'}
                </CardTitle>
                <div className="w-[180px]">
                    <Select value={sortOrder} onValueChange={(val: 'asc' | 'desc') => setSortOrder(val)}>
                        <SelectTrigger className="h-8">
                            <SelectValue placeholder={lang === 'ar' ? 'الترتيب' : 'Sort'} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="asc">
                                {lang === 'ar' ? 'الأقرب أولاً' : 'Closest first'}
                            </SelectItem>
                            <SelectItem value="desc">
                                {lang === 'ar' ? 'الأبعد أولاً' : 'Furthest first'}
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <Tabs defaultValue="all" className="w-full" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                    <div className="bg-muted/20 p-1 border-b">
                        <TabsList className="w-full justify-start h-auto bg-transparent p-0 gap-2">
                            <TabsTrigger
                                value="all"
                                className="flex-1 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary rounded-md py-2 transition-all border border-transparent data-[state=active]:border-border/50"
                            >
                                <div className="flex items-center gap-2 justify-center">
                                    {lang === 'ar' ? 'كل الحجوزات المستقبلية' : 'All Future Bookings'}
                                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                        {events.all.length}
                                    </span>
                                </div>
                            </TabsTrigger>
                            <TabsTrigger
                                value="online"
                                className="flex-1 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary rounded-md py-2 transition-all border border-transparent data-[state=active]:border-border/50"
                            >
                                <div className="flex items-center gap-2 justify-center">
                                    {lang === 'ar' ? 'حجوزات الموقع' : 'Online Bookings'}
                                    <Globe className="w-3 h-3" />
                                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                        {events.online.length}
                                    </span>
                                </div>
                            </TabsTrigger>
                        </TabsList>
                    </div>
                    <TabsContent value="all" className="m-0 focus-visible:ring-0">
                        <EventList items={events.all} />
                    </TabsContent>
                    <TabsContent value="online" className="m-0 focus-visible:ring-0">
                        <EventList items={events.online} />
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    )
}
