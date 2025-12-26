'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
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
import { createService, updateService } from './actions'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Service {
    id: number
    name: string
    price: number
    duration: 'hour' | 'day' | 'open'
    branch_id: number
    created_at: string
    status: 'active' | 'maintenance' | 'closed'
}

interface ServiceDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    service?: Service | null
    branches: any[]
    dict: any
    userRole?: string
    userBranchId?: number | null
}

export function ServiceDialog({ open, onOpenChange, service, branches, dict, userRole, userBranchId }: ServiceDialogProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
    const [globalError, setGlobalError] = useState<string | null>(null)
    const router = useRouter()

    useEffect(() => {
        if (open) {
            setFieldErrors({})
            setGlobalError(null)
        }
    }, [open])

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsLoading(true)
        setFieldErrors({})
        setGlobalError(null)

        const formData = new FormData(e.currentTarget)
        const name = formData.get('name') as string
        const branchId = formData.get('branch_id') as string
        const price = formData.get('price') as string
        const duration = formData.get('duration') as string
        const status = formData.get('status') as string

        const errors: Record<string, string> = {}
        let hasError = false

        if (!name?.trim()) {
            errors.name = dict.dashboard.common?.errors?.required_field || "This field is required"
            hasError = true
        }

        if (!branchId) {
            errors.branch_id = dict.dashboard.common?.errors?.required_field || "This field is required"
            hasError = true
        }

        if (!price) {
            errors.price = dict.dashboard.common?.errors?.required_field || "This field is required"
            hasError = true
        }

        if (!duration) {
            errors.duration = dict.dashboard.common?.errors?.required_field || "This field is required"
            hasError = true
        }

        if (!status) {
            errors.status = dict.dashboard.common?.errors?.required_field || "This field is required"
            hasError = true
        }

        if (hasError) {
            setFieldErrors(errors)
            setIsLoading(false)
            return
        }

        try {
            const result = service
                ? await updateService(service.id, formData)
                : await createService(formData)

            if (result.error) {
                setGlobalError(result.error)
            } else {
                onOpenChange(false)
                router.refresh()
            }
        } catch (err) {
            setGlobalError(dict.dashboard.common?.errors?.generic || 'Something went wrong')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] bg-white">
                <DialogHeader>
                    <DialogTitle>
                        {service ? dict.dashboard?.services?.edit_service : dict.dashboard?.services?.add_service}
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name" className="text-start">
                            {dict.dashboard?.services?.name_label}
                        </Label>
                        <Input
                            id="name"
                            name="name"
                            placeholder={dict.dashboard?.services?.name_placeholder}
                            defaultValue={service?.name}
                            className={cn(fieldErrors.name && "border-red-500 focus-visible:ring-red-500")}
                        />
                        {fieldErrors.name && (
                            <p className="text-sm text-red-500">{fieldErrors.name}</p>
                        )}
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="branch_id" className="text-start">
                            {dict.dashboard?.services?.branch_label}
                        </Label>
                        {userRole !== 'owner' && userBranchId && (
                            <input type="hidden" name="branch_id" value={userBranchId.toString()} />
                        )}
                        <Select
                            name="branch_id"
                            defaultValue={userRole !== 'owner' && userBranchId ? userBranchId.toString() : service?.branch_id?.toString()}
                            disabled={userRole !== 'owner'}
                        >
                            <SelectTrigger className={cn("flex flex-row items-center justify-between text-start", fieldErrors.branch_id && "border-red-500 ring-red-500")} dir="rtl">
                                <SelectValue placeholder={dict.dashboard?.services?.select_branch} />
                            </SelectTrigger>
                            <SelectContent className="bg-white" dir="rtl">
                                {branches.map((branch) => (
                                    <SelectItem key={branch.id} value={branch.id.toString()}>
                                        {branch.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {fieldErrors.branch_id && (
                            <p className="text-sm text-red-500">{fieldErrors.branch_id}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="price" className="text-start">
                                {dict.dashboard?.services?.price_label}
                            </Label>
                            <Input
                                id="price"
                                name="price"
                                type="text"
                                inputMode="decimal"
                                pattern="[0-9]*"
                                className={cn("[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-left", fieldErrors.price && "border-red-500 focus-visible:ring-red-500")}
                                placeholder={dict.dashboard?.services?.price_placeholder}
                                defaultValue={service?.price}
                                dir="ltr"
                                onKeyPress={(event) => {
                                    if (!/[0-9.]/.test(event.key)) {
                                        event.preventDefault();
                                    }
                                }}
                            />
                            {fieldErrors.price && (
                                <p className="text-sm text-red-500">{fieldErrors.price}</p>
                            )}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="duration" className="text-start">
                                {dict.dashboard?.services?.duration_label}
                            </Label>
                            <Select name="duration" defaultValue={service?.duration || 'hour'}>
                                <SelectTrigger className={cn("flex flex-row items-center justify-between text-start", fieldErrors.duration && "border-red-500 ring-red-500")} dir="rtl">
                                    <SelectValue placeholder={dict.dashboard?.services?.select_duration} />
                                </SelectTrigger>
                                <SelectContent className="bg-white" dir="rtl">
                                    <SelectItem value="hour">{dict.dashboard?.services?.duration_hour}</SelectItem>
                                    <SelectItem value="day">{dict.dashboard?.services?.duration_day}</SelectItem>
                                    <SelectItem value="open">{dict.dashboard?.services?.duration_open}</SelectItem>
                                </SelectContent>
                            </Select>
                            {fieldErrors.duration && (
                                <p className="text-sm text-red-500">{fieldErrors.duration}</p>
                            )}
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="status" className="text-start">
                            {dict.dashboard?.services?.status_label}
                        </Label>
                        <Select name="status" defaultValue={service?.status || 'active'}>
                            <SelectTrigger className={cn("flex flex-row items-center justify-between text-start", fieldErrors.status && "border-red-500 ring-red-500")} dir="rtl">
                                <SelectValue placeholder={dict.dashboard?.services?.select_status} />
                            </SelectTrigger>
                            <SelectContent className="bg-white" dir="rtl">
                                <SelectItem value="active">{dict.dashboard?.services?.status_active}</SelectItem>
                                <SelectItem value="maintenance">{dict.dashboard?.services?.status_maintenance}</SelectItem>
                                <SelectItem value="closed">{dict.dashboard?.services?.status_closed}</SelectItem>
                            </SelectContent>
                        </Select>
                        {fieldErrors.status && (
                            <p className="text-sm text-red-500">{fieldErrors.status}</p>
                        )}
                    </div>


                    {globalError && (
                        <div className="text-sm text-red-500 bg-red-50 p-2 rounded">
                            {globalError}
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            {dict.dashboard?.common?.cancel}
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {service ? dict.dashboard?.common?.save : dict.dashboard?.services?.add_service}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
