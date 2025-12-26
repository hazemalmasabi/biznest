'use client'

import { useState, useEffect } from 'react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination"
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
import { Plus, Search, Pencil, Trash2, FileText, Loader2 } from "lucide-react"
import { VoucherDialog } from './voucher-dialog'
import { deleteVoucher, Voucher } from './actions'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from "@/components/ui/card"
import { Calendar } from "lucide-react"

interface VoucherListProps {
    initialVouchers: Voucher[]
    branches: any[]
    dict: any
    dict: any
    lang: string
    userRole?: string
    userBranchId?: number | null
}

export function VoucherList({ initialVouchers, branches, dict, lang, userRole, userBranchId }: VoucherListProps) {
    const [vouchers, setVouchers] = useState<Voucher[]>(initialVouchers)
    const [search, setSearch] = useState('')

    // Filters
    // Set default date range to today (Local Time)
    const today = new Date().toLocaleDateString('en-CA');
    const [dateFrom, setDateFrom] = useState(today)
    const [dateTo, setDateTo] = useState(today)
    const [selectedBranch, setSelectedBranch] = useState<string>(userRole !== 'owner' && userBranchId ? userBranchId.toString() : 'all')
    const [selectedType, setSelectedType] = useState<string>('all')
    const [selectedPayment, setSelectedPayment] = useState<string>('all')
    const [selectedEmployee, setSelectedEmployee] = useState<string>('all')


    // Pagination
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 25

    // Dialogs
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [voucherToEdit, setVoucherToEdit] = useState<Voucher | undefined>(undefined)
    const [deleteId, setDeleteId] = useState<number | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    useEffect(() => {
        setVouchers(initialVouchers)
    }, [initialVouchers])

    // Unique employees for filter
    const employees = Array.from(new Set(
        initialVouchers
            .filter(v => selectedBranch === 'all' || v.branch_id.toString() === selectedBranch)
            .map(v => v.created_by?.full_name)
            .filter(Boolean)
    ))

    // Filter Logic
    const filteredVouchers = vouchers.filter(voucher => {
        const matchesSearch = voucher.id.toString().includes(search) ||
            voucher.notes?.toLowerCase().includes(search.toLowerCase()) ||
            voucher.booking_id?.toString().includes(search)

        const matchesBranch = selectedBranch === 'all' || voucher.branch_id.toString() === selectedBranch
        const matchesType = selectedType === 'all' || voucher.type === selectedType
        const matchesPayment = selectedPayment === 'all' || voucher.payment_method === selectedPayment
        const matchesEmployee = selectedEmployee === 'all' || voucher.created_by?.full_name === selectedEmployee

        const voucherDate = new Date(voucher.created_at).toLocaleDateString('en-CA')
        const matchesDateFrom = !dateFrom || voucherDate >= dateFrom
        const matchesDateTo = !dateTo || voucherDate <= dateTo

        return matchesSearch && matchesBranch && matchesType && matchesPayment && matchesEmployee && matchesDateFrom && matchesDateTo
    })

    // Stats Logic
    const stats = {
        total_receipts: filteredVouchers
            .filter(v => v.type === 'receipt')
            .reduce((sum, v) => sum + Number(v.amount), 0),
        total_payments: filteredVouchers
            .filter(v => v.type === 'payment')
            .reduce((sum, v) => sum + Number(v.amount), 0),
        total_refunds: filteredVouchers
            .filter(v => v.type === 'refund')
            .reduce((sum, v) => sum + Number(v.amount), 0),
    }
    const net_amount = stats.total_receipts - (stats.total_payments + stats.total_refunds)

    // Pagination Logic
    const totalPages = Math.ceil(filteredVouchers.length / itemsPerPage)
    const paginatedVouchers = filteredVouchers.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    )

    const handleDelete = async () => {
        if (deleteId) {
            setIsDeleting(true)
            const result = await deleteVoucher(deleteId)
            if (result.success) {
                setDeleteId(null)
            } else {
                alert(result.error)
            }
            setIsDeleting(false)
        }
    }

    const getTypeBadge = (type: string) => {
        switch (type) {
            case 'receipt': return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">{dict.dashboard.vouchers.types.receipt}</Badge>
            case 'payment': return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">{dict.dashboard.vouchers.types.payment}</Badge>
            case 'refund': return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">{dict.dashboard.vouchers.types.refund}</Badge>
            default: return <Badge variant="outline">{type}</Badge>
        }
    }

    const getPaymentLabel = (method: string) => {
        return dict.dashboard.vouchers.payment_methods[method] || method
    }

    return (
        <div className="space-y-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardContent className="p-4 flex flex-col items-center justify-center border-l-4 border-l-green-500">
                        <p className="text-sm font-medium text-muted-foreground">{dict.dashboard.vouchers.stats.total_receipts}</p>
                        <p className="text-2xl font-bold text-green-600" suppressHydrationWarning>{stats.total_receipts.toLocaleString('en-US')}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex flex-col items-center justify-center border-l-4 border-l-red-500">
                        <p className="text-sm font-medium text-muted-foreground">{dict.dashboard.vouchers.stats.total_payments}</p>
                        <p className="text-2xl font-bold text-red-600" suppressHydrationWarning>{stats.total_payments.toLocaleString('en-US')}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex flex-col items-center justify-center border-l-4 border-l-yellow-500">
                        <p className="text-sm font-medium text-muted-foreground">{dict.dashboard.vouchers.stats.total_refunds}</p>
                        <p className="text-2xl font-bold text-yellow-600" suppressHydrationWarning>{stats.total_refunds.toLocaleString('en-US')}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex flex-col items-center justify-center border-l-4 border-l-blue-500">
                        <p className="text-sm font-medium text-muted-foreground">{dict.dashboard.vouchers.stats.net_amount}</p>
                        <p className={`text-2xl font-bold ${net_amount >= 0 ? 'text-blue-600' : 'text-red-600'}`} suppressHydrationWarning>{net_amount.toLocaleString('en-US')}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-[250px]">
                    <Search className={`absolute ${lang === 'ar' ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400`} />
                    <Input
                        placeholder={dict.dashboard.vouchers.voucher_number + " / " + dict.dashboard.bookings.search_placeholder}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className={`${lang === 'ar' ? 'pr-9' : 'pl-9'} bg-white`}
                    />
                </div>

                {/* Date Filters */}
                <div className="flex items-center gap-2 bg-white border rounded-md px-3 py-2 h-10 w-[180px]">
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
                    <Calendar className="w-4 h-4 text-gray-500" />
                </div>
                <div className="flex items-center gap-2 bg-white border rounded-md px-3 py-2 h-10 w-[180px]">
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
                    <Calendar className="w-4 h-4 text-gray-500" />
                </div>

                {/* Branch Filter */}
                <Select
                    value={selectedBranch}
                    onValueChange={setSelectedBranch}
                    dir={lang === 'ar' ? 'rtl' : 'ltr'}
                    disabled={userRole !== 'owner'}
                >
                    <SelectTrigger className="w-[130px] bg-white text-start">
                        <SelectValue placeholder={dict.dashboard.vouchers.filters.all_branches} />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                        {userRole === 'owner' && <SelectItem value="all">{dict.dashboard.vouchers.filters.all_branches}</SelectItem>}
                        {branches.map(b => (
                            <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Type Filter */}
                <Select value={selectedType} onValueChange={setSelectedType} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                    <SelectTrigger className="w-[130px] bg-white text-start">
                        <SelectValue placeholder={dict.dashboard.vouchers.filters.all_types} />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                        <SelectItem value="all">{dict.dashboard.vouchers.filters.all_types}</SelectItem>
                        <SelectItem value="receipt">{dict.dashboard.vouchers.types.receipt}</SelectItem>
                        <SelectItem value="payment">{dict.dashboard.vouchers.types.payment}</SelectItem>
                        <SelectItem value="refund">{dict.dashboard.vouchers.types.refund}</SelectItem>
                    </SelectContent>
                </Select>

                {/* Employee Filter */}
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee} dir={lang === 'ar' ? 'rtl' : 'ltr'} disabled={selectedBranch === 'all'}>
                    <SelectTrigger className="w-[130px] bg-white text-start">
                        <SelectValue placeholder={dict.dashboard.vouchers.filters.all_employees} />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                        <SelectItem value="all">{dict.dashboard.vouchers.filters.all_employees}</SelectItem>
                        {employees.map(e => (
                            <SelectItem key={e as string} value={e as string}>{e as string}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Button onClick={() => { setVoucherToEdit(undefined); setIsDialogOpen(true) }} className="gap-2 ms-auto w-[180px]">
                    <Plus className="h-4 w-4" />
                    {dict.dashboard.vouchers.new_voucher}
                </Button>
            </div>

            {/* Table */}
            <div className="border rounded-md bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="text-center w-[80px]">{dict.dashboard.vouchers.voucher_number}</TableHead>
                            <TableHead className="text-center">{dict.dashboard.vouchers.date || "Date"}</TableHead>
                            <TableHead className="text-center">{dict.dashboard.vouchers.type}</TableHead>
                            <TableHead className="text-center">{dict.dashboard.vouchers.branch}</TableHead>
                            <TableHead className="text-center">{dict.dashboard.vouchers.amount}</TableHead>
                            <TableHead className="text-center">{dict.dashboard.vouchers.payment_method}</TableHead>
                            <TableHead className="text-center">{dict.dashboard.vouchers.booking_id}</TableHead>
                            <TableHead className="text-center">{dict.dashboard.vouchers.employee}</TableHead>
                            <TableHead className="text-center w-[100px]">{dict.dashboard.vouchers.actions}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedVouchers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                    {dict.dashboard.bookings.errors.no_bookings || "No records found"}
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedVouchers.map((voucher) => (
                                <TableRow key={voucher.id}>
                                    <TableCell className="text-center font-medium">{voucher.id}</TableCell>
                                    <TableCell className="text-center text-sm">{new Date(voucher.created_at).toLocaleDateString('en-US')}</TableCell>
                                    <TableCell className="text-center">{getTypeBadge(voucher.type)}</TableCell>
                                    <TableCell className="text-center">{voucher.branch?.name || '-'}</TableCell>
                                    <TableCell className="text-center font-semibold">{voucher.amount}</TableCell>
                                    <TableCell className="text-center text-sm">{getPaymentLabel(voucher.payment_method)}</TableCell>
                                    <TableCell className="text-center">
                                        {voucher.booking_id ? voucher.booking_id : '-'}
                                    </TableCell>
                                    <TableCell className="text-center text-sm text-muted-foreground">{voucher.created_by?.full_name || '-'}</TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            {(userRole === 'owner' || userRole === 'manager' || userRole === 'assistant_manager') && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => { setVoucherToEdit(voucher); setIsDialogOpen(true) }}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {(userRole === 'owner' || userRole === 'manager') && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setDeleteId(voucher.id)}
                                                    className="h-8 w-8 text-red-600 hover:text-red-800 hover:bg-red-50"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <Pagination>
                    <PaginationContent>
                        <PaginationItem>
                            <PaginationPrevious
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                            />
                        </PaginationItem>

                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                            <PaginationItem key={page}>
                                <PaginationLink
                                    isActive={currentPage === page}
                                    onClick={() => setCurrentPage(page)}
                                    className="cursor-pointer"
                                >
                                    {page}
                                </PaginationLink>
                            </PaginationItem>
                        ))}

                        <PaginationItem>
                            <PaginationNext
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                            />
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            )}

            {/* Dialogs */}
            <VoucherDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                branches={branches}
                dict={dict}
                lang={lang}
                voucherToEdit={voucherToEdit}
                userRole={userRole}
                userBranchId={userBranchId}
            />

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent className="bg-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>{dict.dashboard.common.delete || "Delete"}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {dict.dashboard.common.confirm_delete || "Are you sure you want to delete this item? This action cannot be undone."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{dict.dashboard.common.cancel}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-red-600 hover:bg-red-700 text-white"
                            disabled={isDeleting}
                        >
                            {isDeleting ? <Loader2 className="animate-spin h-4 w-4" /> : (dict.dashboard.common.delete || "Delete")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
