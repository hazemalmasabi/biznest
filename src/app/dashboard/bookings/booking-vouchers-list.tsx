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
import { Badge } from "@/components/ui/badge"
import { Pencil, Loader2 } from "lucide-react"
import { getVouchers, Voucher } from '@/app/dashboard/vouchers/actions'

interface BookingVouchersListProps {
    bookingId: number
    lang: string
    dict: any
    onEdit: (voucher: Voucher) => void
}

export function BookingVouchersList({ bookingId, lang, dict, onEdit }: BookingVouchersListProps) {
    const [vouchers, setVouchers] = useState<Voucher[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const fetchVouchers = async () => {
        setIsLoading(true)
        const result = await getVouchers(bookingId)
        setVouchers(result.vouchers || [])
        setIsLoading(false)
    }

    useEffect(() => {
        if (bookingId) {
            fetchVouchers()
        }
    }, [bookingId])

    const getTypeBadge = (type: string) => {
        switch (type) {
            case 'receipt':
                return <Badge className="bg-green-500 hover:bg-green-600">{dict.dashboard.vouchers.types.receipt}</Badge>
            case 'payment':
                return <Badge className="bg-red-500 hover:bg-red-600">{dict.dashboard.vouchers.types.payment}</Badge>
            case 'refund':
                return <Badge className="bg-yellow-500 hover:bg-yellow-600">{dict.dashboard.vouchers.types.refund}</Badge>
            default:
                return <Badge variant="outline">{type}</Badge>
        }
    }

    const getPaymentBadge = (method: string) => {
        switch (method) {
            case 'cash':
                return <Badge variant="outline" className="border-green-500 text-green-600">{dict.dashboard.vouchers.payment_methods?.cash || "Cash"}</Badge>
            case 'card':
                return <Badge variant="outline" className="border-blue-500 text-blue-600">{dict.dashboard.vouchers.payment_methods?.card || "Card"}</Badge>
            case 'transfer':
                return <Badge variant="outline" className="border-purple-500 text-purple-600">{dict.dashboard.vouchers.payment_methods?.transfer || "Transfer"}</Badge>
            default:
                return <Badge variant="outline">{method}</Badge>
        }
    }

    if (isLoading) {
        return <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
    }

    return (
        <div className="space-y-4">
            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="text-center w-[80px]">{dict.dashboard.vouchers.voucher_number}</TableHead>
                            <TableHead className="text-center">{dict.dashboard.vouchers.date || "Date"}</TableHead>
                            <TableHead className="text-center">{dict.dashboard.vouchers.type}</TableHead>
                            <TableHead className="text-center">{dict.dashboard.vouchers.amount}</TableHead>
                            <TableHead className="text-center">{dict.dashboard.vouchers.payment_method || "Payment"}</TableHead>
                            <TableHead className="text-center">{dict.dashboard.vouchers.employee || "Employee"}</TableHead>
                            <TableHead className="text-center w-[60px]">{dict.dashboard.vouchers.actions}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {vouchers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                    {dict.dashboard.bookings.errors.no_bookings || "No records found"}
                                </TableCell>
                            </TableRow>
                        ) : (
                            vouchers.map((voucher) => (
                                <TableRow key={voucher.id}>
                                    <TableCell className="text-center font-medium">{voucher.id}</TableCell>
                                    <TableCell className="text-center text-sm">{new Date(voucher.created_at).toLocaleDateString('en-US')}</TableCell>
                                    <TableCell className="text-center">{getTypeBadge(voucher.type)}</TableCell>
                                    <TableCell className="text-center font-semibold">{voucher.amount}</TableCell>
                                    <TableCell className="text-center">{getPaymentBadge(voucher.payment_method)}</TableCell>
                                    <TableCell className="text-center text-sm text-muted-foreground">{voucher.created_by?.full_name || "-"}</TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => onEdit(voucher)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
