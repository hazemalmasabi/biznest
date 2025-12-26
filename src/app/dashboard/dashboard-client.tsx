'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Calendar } from 'lucide-react'
import { getDashboardStats, DashboardStats } from './actions'

interface DashboardClientProps {
    initialStats: DashboardStats
    branches: any[]
    userProfile: { full_name: string } | null
    dict: any
    lang: string
    userRole?: string
    userBranchId?: number | null
}

export function DashboardClient({ initialStats, branches, userProfile, dict, lang, userRole, userBranchId }: DashboardClientProps) {
    const today = new Date().toLocaleDateString('en-CA')
    const [stats, setStats] = useState<DashboardStats>(initialStats)
    const [dateFrom, setDateFrom] = useState(today)
    const [dateTo, setDateTo] = useState(today)
    const [selectedBranch, setSelectedBranch] = useState(userRole !== 'owner' && userBranchId ? userBranchId.toString() : 'all')
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        const fetchStats = async () => {
            setIsLoading(true)
            // Create timestamps in Local Time (browser will use local timezone), convert to UTC for Server
            // Input dateFrom is YYYY-MM-DD
            const start = new Date(`${dateFrom}T00:00:00`)
            const end = new Date(`${dateTo}T23:59:59`)

            const newStats = await getDashboardStats(start.toISOString(), end.toISOString(), selectedBranch)
            setStats(newStats)
            setIsLoading(false)
        }

        fetchStats()
    }, [dateFrom, dateTo, selectedBranch])

    return (
        <div className="p-8 space-y-8" dir={lang === 'ar' ? 'rtl' : 'ltr'}>

            {/* Header & Filters */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        {lang === 'ar' ? `مرحباً، ${userProfile?.full_name || 'المستخدم'}` : `Welcome, ${userProfile?.full_name || 'User'}`}
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {lang === 'ar' ? 'نظرة عامة على نشاط أعمالك اليوم' : 'Overview of your business activity today'}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Branch Filter */}
                    {/* Branch Filter */}
                    <Select
                        value={selectedBranch}
                        onValueChange={setSelectedBranch}
                        dir={lang === 'ar' ? 'rtl' : 'ltr'}
                        disabled={userRole !== 'owner'}
                    >
                        <SelectTrigger className="w-[180px] bg-white text-start">
                            <SelectValue placeholder={dict.dashboard.branches?.all_branches || (lang === 'ar' ? "كل الفروع" : "All Branches")} />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                            {userRole === 'owner' && <SelectItem value="all">{dict.dashboard.branches?.all_branches || (lang === 'ar' ? "كل الفروع" : "All Branches")}</SelectItem>}
                            {branches.map(b => (
                                <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Date Filters */}
                    <div className="flex items-center gap-2 bg-white border rounded-md px-3 py-2 h-10 w-[180px]">
                        <span className="text-sm text-muted-foreground whitespace-nowrap">{dict.dashboard.bookings?.filters?.date_from || (lang === 'ar' ? "من" : "From")}:</span>
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
                        <Calendar className="w-4 h-4 text-gray-500" />
                    </div>
                    <div className="flex items-center gap-2 bg-white border rounded-md px-3 py-2 h-10 w-[180px]">
                        <span className="text-sm text-muted-foreground whitespace-nowrap">{dict.dashboard.bookings?.filters?.date_to || (lang === 'ar' ? "إلى" : "To")}:</span>
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
                        <Calendar className="w-4 h-4 text-gray-500" />
                    </div>
                </div>
            </div>

            {/* Bookings Section */}
            <div className="space-y-4">
                <h2 className="text-xl font-semibold tracking-tight">{dict.dashboard.bookings?.title || "Bookings"}</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                    <Card>
                        <CardContent className="p-4 flex flex-col items-center justify-center">
                            <p className="text-sm font-medium text-muted-foreground">{dict.dashboard.bookings?.stats?.total_bookings || "Total Bookings"}</p>
                            <p className="text-2xl font-bold">{stats.bookings.total}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 flex flex-col items-center justify-center border-l-4 border-l-blue-500">
                            <p className="text-sm font-medium text-muted-foreground">{dict.dashboard.bookings?.stats?.scheduled || "Scheduled"}</p>
                            <p className="text-2xl font-bold text-blue-600">{stats.bookings.scheduled}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 flex flex-col items-center justify-center border-l-4 border-l-green-500">
                            <p className="text-sm font-medium text-muted-foreground">{dict.dashboard.bookings?.stats?.completed || "Completed"}</p>
                            <p className="text-2xl font-bold text-green-600">{stats.bookings.completed}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 flex flex-col items-center justify-center border-l-4 border-l-red-500">
                            <p className="text-sm font-medium text-muted-foreground">{dict.dashboard.bookings?.stats?.cancelled || "Cancelled"}</p>
                            <p className="text-2xl font-bold text-red-600">{stats.bookings.cancelled}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 flex flex-col items-center justify-center border-l-4 border-l-gray-500">
                            <p className="text-sm font-medium text-muted-foreground">{dict.dashboard.bookings?.stats?.no_show || "No Show"}</p>
                            <p className="text-2xl font-bold text-gray-600">{stats.bookings.no_show}</p>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Vouchers Section */}
            <div className="space-y-4">
                <h2 className="text-xl font-semibold tracking-tight">{dict.dashboard.vouchers?.title || "Financials"}</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardContent className="p-4 flex flex-col items-center justify-center border-l-4 border-l-green-500">
                            <p className="text-sm font-medium text-muted-foreground">{dict.dashboard.vouchers?.stats?.total_receipts || "Total Receipts"}</p>
                            <p className="text-2xl font-bold text-green-600" suppressHydrationWarning>{stats.vouchers.total_receipts.toLocaleString('en-US')}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 flex flex-col items-center justify-center border-l-4 border-l-red-500">
                            <p className="text-sm font-medium text-muted-foreground">{dict.dashboard.vouchers?.stats?.total_payments || "Total Payments"}</p>
                            <p className="text-2xl font-bold text-red-600" suppressHydrationWarning>{stats.vouchers.total_payments.toLocaleString('en-US')}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 flex flex-col items-center justify-center border-l-4 border-l-yellow-500">
                            <p className="text-sm font-medium text-muted-foreground">{dict.dashboard.vouchers?.stats?.total_refunds || "Total Refunds"}</p>
                            <p className="text-2xl font-bold text-yellow-600" suppressHydrationWarning>{stats.vouchers.total_refunds.toLocaleString('en-US')}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 flex flex-col items-center justify-center border-l-4 border-l-blue-500">
                            <p className="text-sm font-medium text-muted-foreground">{dict.dashboard.vouchers?.stats?.net_amount || "Net Amount"}</p>
                            <p className={`text-2xl font-bold ${stats.vouchers.net >= 0 ? 'text-blue-600' : 'text-red-600'}`} suppressHydrationWarning>{stats.vouchers.net.toLocaleString('en-US')}</p>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {isLoading && (
                <div className="fixed inset-0 bg-white/50 z-50 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            )}
        </div>
    )
}
