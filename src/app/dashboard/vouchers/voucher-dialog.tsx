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
import { createVoucher, updateVoucher } from './actions'
import { Loader2 } from 'lucide-react'

interface VoucherDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    branches: any[]
    dict: any
    lang: string
    voucherToEdit?: any
    bookingId?: number
    onSuccess?: () => void
    userRole?: string
    userBranchId?: number | null
}

export function VoucherDialog({ open, onOpenChange, branches, dict, lang, voucherToEdit, bookingId, onSuccess, userRole, userBranchId }: VoucherDialogProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState({
        branch_id: '',
        type: 'receipt', // Default
        amount: '',
        payment_method: 'card', // Default
        notes: '',
        booking_id: ''
    })

    useEffect(() => {
        if (open) {
            if (voucherToEdit) {
                setFormData({
                    branch_id: voucherToEdit.branch_id.toString(),
                    type: voucherToEdit.type,
                    amount: voucherToEdit.amount.toString(),
                    payment_method: voucherToEdit.payment_method,
                    notes: voucherToEdit.notes || '',
                    booking_id: voucherToEdit.booking_id ? voucherToEdit.booking_id.toString() : (bookingId ? bookingId.toString() : '')
                })
            } else {
                // Reset
                setFormData({
                    branch_id: (userRole !== 'owner' && userBranchId) ? userBranchId.toString() : (branches.length > 0 ? branches[0].id.toString() : ''),
                    type: 'receipt',
                    amount: '',
                    payment_method: 'card',
                    notes: '',
                    booking_id: bookingId ? bookingId.toString() : ''
                })
            }
        }
    }, [open, voucherToEdit])

    const [errors, setErrors] = useState<Record<string, string>>({})

    const validate = () => {
        const newErrors: Record<string, string> = {}
        if (!formData.branch_id) newErrors.branch_id = dict.dashboard.vouchers.errors.select_branch
        if (!formData.amount) newErrors.amount = dict.dashboard.vouchers.errors.enter_amount
        if (!formData.type) newErrors.type = dict.dashboard.vouchers.errors.select_type

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async () => {
        if (!validate()) return

        setIsLoading(true)
        const payload = new FormData()
        payload.append('branch_id', formData.branch_id)
        payload.append('type', formData.type)
        payload.append('amount', formData.amount)
        payload.append('payment_method', formData.payment_method)
        if (formData.notes) payload.append('notes', formData.notes)
        if (formData.booking_id) payload.append('booking_id', formData.booking_id)

        const result = voucherToEdit
            ? await updateVoucher(voucherToEdit.id, payload)
            : await createVoucher(payload)

        if (result.success) {
            onSuccess?.()
            onOpenChange(false)
        } else {
            alert(result.error || 'Operation failed')
        }
        setIsLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] bg-white text-slate-900" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                <DialogHeader>
                    <DialogTitle>{voucherToEdit ? dict.dashboard.vouchers.edit_voucher : dict.dashboard.vouchers.new_voucher}</DialogTitle>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* Branch & Type Side-by-Side */}
                    <div className="flex gap-4">
                        <div className="flex-1 grid gap-2">
                            <Label className={errors.branch_id ? "text-red-500" : ""}>{dict.dashboard.vouchers.branch}</Label>
                            <Select
                                value={formData.branch_id}
                                onValueChange={(v) => {
                                    setFormData({ ...formData, branch_id: v })
                                    if (errors.branch_id) setErrors({ ...errors, branch_id: '' })
                                }}
                                disabled={userRole !== 'owner'}
                            >
                                <SelectTrigger className={errors.branch_id ? "border-red-500" : ""}>
                                    <SelectValue placeholder={dict.dashboard.vouchers.select_branch || ""} />
                                </SelectTrigger>
                                <SelectContent className="bg-white">
                                    {branches.filter(b => !b.is_deleted).map(b => (
                                        <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.branch_id && <p className="text-xs text-red-500">{errors.branch_id}</p>}
                        </div>

                        <div className="flex-1 grid gap-2">
                            <Label className={errors.type ? "text-red-500" : ""}>{dict.dashboard.vouchers.type}</Label>
                            <Select
                                value={formData.type}
                                onValueChange={(v) => {
                                    setFormData({ ...formData, type: v })
                                    if (errors.type) setErrors({ ...errors, type: '' })
                                }}
                            >
                                <SelectTrigger className={errors.type ? "border-red-500" : ""}>
                                    <SelectValue placeholder={dict.dashboard.vouchers.select_type || ""} />
                                </SelectTrigger>
                                <SelectContent className="bg-white">
                                    <SelectItem value="receipt">{dict.dashboard.vouchers.types.receipt}</SelectItem>
                                    {!bookingId && <SelectItem value="payment">{dict.dashboard.vouchers.types.payment}</SelectItem>}
                                    <SelectItem value="refund">{dict.dashboard.vouchers.types.refund}</SelectItem>
                                </SelectContent>
                            </Select>
                            {errors.type && <p className="text-xs text-red-500">{errors.type}</p>}
                        </div>
                    </div>

                    {/* Amount & Payment Method */}
                    <div className="flex gap-4">
                        <div className="flex-1 grid gap-2">
                            <Label className={errors.amount ? "text-red-500" : ""}>{dict.dashboard.vouchers.amount}</Label>
                            <Input
                                type="text"
                                inputMode="decimal"
                                value={formData.amount}
                                onChange={(e) => {
                                    const val = e.target.value
                                    if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                        setFormData({ ...formData, amount: val })
                                        if (errors.amount) setErrors({ ...errors, amount: '' })
                                    }
                                }}
                                className={errors.amount ? "border-red-500" : ""}
                            />
                            {errors.amount && <p className="text-xs text-red-500">{errors.amount}</p>}
                        </div>

                        <div className="flex-1 grid gap-2">
                            <Label>{dict.dashboard.vouchers.payment_method}</Label>
                            <Select
                                value={formData.payment_method}
                                onValueChange={(v) => setFormData({ ...formData, payment_method: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-white">
                                    <SelectItem value="card">{dict.dashboard.vouchers.payment_methods.card}</SelectItem>
                                    <SelectItem value="cash">{dict.dashboard.vouchers.payment_methods.cash}</SelectItem>
                                    <SelectItem value="transfer">{dict.dashboard.vouchers.payment_methods.transfer}</SelectItem>
                                    <SelectItem value="other">{dict.dashboard.vouchers.payment_methods.other}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="grid gap-2">
                        <Label>{dict.dashboard.vouchers.notes} <span className="text-xs text-muted-foreground">{dict.dashboard.customers?.optional || '(Optional)'}</span></Label>
                        <Input
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        {dict.dashboard.common.cancel}
                    </Button>
                    <Button onClick={handleSubmit} disabled={isLoading}>
                        {isLoading ? <Loader2 className="animate-spin" /> : dict.dashboard.common.save}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
