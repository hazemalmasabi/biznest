'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from 'lucide-react'
import { createCustomer, updateCustomer, Customer } from './actions'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

interface CustomerDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    customer: Customer | null
    dict: any
    lang: string
    onSuccess?: (customer: Customer) => void
}

const MONTHS_EN = [
    { value: '01', label: 'January (1)' },
    { value: '02', label: 'February (2)' },
    { value: '03', label: 'March (3)' },
    { value: '04', label: 'April (4)' },
    { value: '05', label: 'May (5)' },
    { value: '06', label: 'June (6)' },
    { value: '07', label: 'July (7)' },
    { value: '08', label: 'August (8)' },
    { value: '09', label: 'September (9)' },
    { value: '10', label: 'October (10)' },
    { value: '11', label: 'November (11)' },
    { value: '12', label: 'December (12)' },
]

const MONTHS_AR = [
    { value: '01', label: 'يناير (1)' },
    { value: '02', label: 'فبراير (2)' },
    { value: '03', label: 'مارس (3)' },
    { value: '04', label: 'أبريل (4)' },
    { value: '05', label: 'مايو (5)' },
    { value: '06', label: 'يونيو (6)' },
    { value: '07', label: 'يوليو (7)' },
    { value: '08', label: 'أغسطس (8)' },
    { value: '09', label: 'سبتمبر (9)' },
    { value: '10', label: 'أكتوبر (10)' },
    { value: '11', label: 'نوفمبر (11)' },
    { value: '12', label: 'ديسمبر (12)' },
]

const DAYS = Array.from({ length: 31 }, (_, i) => ({
    value: String(i + 1).padStart(2, '0'),
    label: String(i + 1)
}))

const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: 100 }, (_, i) => ({
    value: String(currentYear - i),
    label: String(currentYear - i)
}))

export function CustomerDialog({ open, onOpenChange, customer, dict, lang, onSuccess }: CustomerDialogProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        gender: '',
        notes: ''
    })

    const [dob, setDob] = useState({
        day: '',
        month: '',
        year: ''
    })

    const months = lang === 'ar' ? MONTHS_AR : MONTHS_EN

    useEffect(() => {
        if (open) {
            setError(null)
            setFieldErrors({})
            if (customer) {
                setFormData({
                    name: customer.name,
                    phone: customer.phone,
                    email: customer.email || '',
                    gender: customer.gender || '',
                    notes: customer.notes || ''
                })
                if (customer.date_of_birth) {
                    const [y, m, d] = customer.date_of_birth.split('-')
                    if (y && m && d) {
                        setDob({ year: y, month: m, day: d })
                    }
                } else {
                    setDob({ day: '', month: '', year: '' })
                }
            } else {
                setFormData({
                    name: '',
                    phone: '',
                    email: '',
                    gender: '',
                    notes: ''
                })
                setDob({ day: '', month: '', year: '' })
            }
        }
    }, [open, customer])

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        if (/^\d*$/.test(value)) {
            setFormData({ ...formData, phone: value })
            if (fieldErrors.phone) {
                setFieldErrors(prev => {
                    const newErrors = { ...prev }
                    delete newErrors.phone
                    return newErrors
                })
            }
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)
        setFieldErrors({})

        if (formData.email && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.email)) {
            setFieldErrors({ email: dict.common.errors.english_only })
            setIsLoading(false)
            return
        }

        const data = new FormData()
        data.append('name', formData.name)
        data.append('phone', formData.phone)
        if (formData.email) data.append('email', formData.email)
        if (formData.gender) data.append('gender', formData.gender)

        if (dob.year && dob.month && dob.day) {
            data.append('date_of_birth', `${dob.year}-${dob.month}-${dob.day}`)
        }

        if (formData.notes) data.append('notes', formData.notes)

        let result
        if (customer) {
            result = await updateCustomer(customer.id, data)
        } else {
            result = await createCustomer(data)
        }

        if (result.errors) {
            setFieldErrors(result.errors)
        } else if (result.message) {
            setError(result.message)
        } else if (result.success) {
            if (onSuccess && result.customer) {
                onSuccess(result.customer)
            }
            onOpenChange(false)
        }
        setIsLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] bg-white text-slate-900 overflow-y-auto max-h-[90vh]" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                <DialogHeader>
                    <DialogTitle>{customer ? dict.dashboard.customers.edit_customer : dict.dashboard.customers.add_customer}</DialogTitle>
                    <DialogDescription>
                        {customer ? dict.dashboard.customers.edit_desc : dict.dashboard.customers.add_desc}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} noValidate>
                    <div className="grid gap-4 py-4">
                        {error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-200">
                                {error}
                            </div>
                        )}

                        <div className="grid gap-2">
                            <Label htmlFor="name" className={fieldErrors.name ? "text-red-500" : ""}>
                                {dict.dashboard.customers.name_label}
                            </Label>
                            <Input
                                id="name"
                                placeholder={dict.dashboard.customers.name_placeholder}
                                value={formData.name}
                                onChange={(e) => {
                                    setFormData({ ...formData, name: e.target.value })
                                    if (fieldErrors.name) {
                                        setFieldErrors(prev => {
                                            const newErrors = { ...prev }
                                            delete newErrors.name
                                            return newErrors
                                        })
                                    }
                                }}
                                className={fieldErrors.name ? "border-red-500" : ""}
                            />
                            {fieldErrors.name && (
                                <p className="text-xs text-red-500">{fieldErrors.name}</p>
                            )}
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="phone" className={fieldErrors.phone ? "text-red-500" : ""}>
                                {dict.dashboard.customers.phone_label}
                            </Label>
                            <Input
                                id="phone"
                                placeholder={dict.dashboard.customers.phone_placeholder}
                                value={formData.phone}
                                onChange={handlePhoneChange}
                                className={fieldErrors.phone ? "border-red-500" : ""}
                                dir="ltr"
                            />
                            {fieldErrors.phone && (
                                <p className="text-xs text-red-500">{fieldErrors.phone}</p>
                            )}
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="email" className={fieldErrors.email ? "text-red-500" : ""}>
                                {dict.dashboard.customers.email_label} <span className="text-muted-foreground text-xs">{dict.dashboard.customers.optional}</span>
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder={dict.dashboard.customers.email_placeholder}
                                value={formData.email}
                                onChange={(e) => {
                                    setFormData({ ...formData, email: e.target.value })
                                    if (fieldErrors.email) {
                                        setFieldErrors(prev => {
                                            const newErrors = { ...prev }
                                            delete newErrors.email
                                            return newErrors
                                        })
                                    }
                                }}
                                className={fieldErrors.email ? "border-red-500" : ""}
                                dir="ltr"
                            />
                            {fieldErrors.email && (
                                <p className="text-xs text-red-500">{fieldErrors.email}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="gender">
                                    {dict.dashboard.customers.gender_label} <span className="text-muted-foreground text-xs">{dict.dashboard.customers.optional}</span>
                                    {formData.gender && (
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, gender: '' })}
                                            className="text-xs text-red-500 hover:text-red-700 mx-2"
                                        >
                                            ({dict.dashboard.common.delete || 'Clear'})
                                        </button>
                                    )}
                                </Label>
                                <Select
                                    value={formData.gender}
                                    onValueChange={(value) => setFormData({ ...formData, gender: value })}
                                    dir={lang === 'ar' ? 'rtl' : 'ltr'}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={dict.dashboard.customers.select_gender} />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white">
                                        <SelectItem value="male">{dict.dashboard.customers.gender_male}</SelectItem>
                                        <SelectItem value="female">{dict.dashboard.customers.gender_female}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label>
                                    {dict.dashboard.customers.dob_label} <span className="text-muted-foreground text-xs">{dict.dashboard.customers.optional}</span>
                                    {(dob.day || dob.month || dob.year) && (
                                        <button
                                            type="button"
                                            onClick={() => setDob({ day: '', month: '', year: '' })}
                                            className="text-xs text-red-500 hover:text-red-700 mx-2"
                                        >
                                            ({dict.dashboard.common.delete || 'Clear'})
                                        </button>
                                    )}
                                </Label>
                                <div className="grid grid-cols-[0.7fr_1.5fr_1fr] gap-2" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                                    <Select value={dob.day} onValueChange={(v) => setDob(prev => ({ ...prev, day: v }))} dir="ltr">
                                        <SelectTrigger>
                                            <SelectValue placeholder={lang === 'ar' ? 'يوم' : 'Day'} />
                                        </SelectTrigger>
                                        <SelectContent className="h-64 bg-white" dir="ltr">
                                            {DAYS.map(d => (
                                                <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    <Select value={dob.month} onValueChange={(v) => setDob(prev => ({ ...prev, month: v }))} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={lang === 'ar' ? 'شهر' : 'Month'} />
                                        </SelectTrigger>
                                        <SelectContent className="h-64 bg-white">
                                            {months.map(m => (
                                                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    <Select value={dob.year} onValueChange={(v) => setDob(prev => ({ ...prev, year: v }))} dir="ltr">
                                        <SelectTrigger>
                                            <SelectValue placeholder={lang === 'ar' ? 'سنة' : 'Year'} />
                                        </SelectTrigger>
                                        <SelectContent className="h-64 bg-white" dir="ltr">
                                            {YEARS.map(y => (
                                                <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="notes">
                                {dict.dashboard.customers.notes_label} <span className="text-muted-foreground text-xs">{dict.dashboard.customers.optional}</span>
                            </Label>
                            <Textarea
                                id="notes"
                                placeholder={dict.dashboard.customers.notes_placeholder}
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                className="min-h-[80px]"
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                            {dict.dashboard.common.cancel}
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : dict.dashboard.common.save}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
