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
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createService, updateService, ServiceDuration } from './actions'
import { useRouter } from 'next/navigation'
import { Loader2, Plus, Trash2, Pencil, Package } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Service {
    id: number
    name: string
    price: number
    duration: 'hour' | 'day' | 'open'
    branch_id: number
    created_at: string
    status: 'active' | 'maintenance' | 'closed'
    image_url?: string | null
    description?: string | null
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

    // Main Service State - FULLY CONTROLLED
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        branchId: '',
        price: '',
        status: 'active',
        durationMode: 'hour' as 'hour' | 'day' | 'open'
    })

    const [durations, setDurations] = useState<ServiceDuration[]>([])
    const [activeTab, setActiveTab] = useState("info")
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const [imageFile, setImageFile] = useState<File | null>(null)

    // Pricing Dialog State
    const [pricingDialogOpen, setPricingDialogOpen] = useState(false)
    const [editingDurationIndex, setEditingDurationIndex] = useState<number | null>(null)
    const [tempDuration, setTempDuration] = useState<{ value: number, price: number }>({ value: 1, price: 0 })
    // Error specifically for the add/edit duration popup
    const [pricingError, setPricingError] = useState<string | null>(null)

    useEffect(() => {
        if (open) {
            setFieldErrors({})
            setGlobalError(null)
            setActiveTab("info")
            setPricingDialogOpen(false)
            setEditingDurationIndex(null)
            setTempDuration({ value: 1, price: 0 })
            setPricingError(null)
            setImagePreview(service?.image_url || null)
            setImageFile(null)

            // Initialize Form Data
            setFormData({
                name: service?.name || '',
                description: service?.description || '',
                branchId: service?.branch_id?.toString() || (userRole !== 'owner' && userBranchId ? userBranchId.toString() : ''),
                price: service?.price?.toString() || '',
                status: service?.status || 'active',
                durationMode: service?.duration || 'hour'
            })

            // Load durations if editing
            if (service) {
                import('./actions').then(({ getServiceDurations }) => {
                    getServiceDurations(service.id).then(data => {
                        const sorted = data.sort((a: any, b: any) => a.duration_value - b.duration_value)
                        setDurations(sorted)
                    })
                })
            } else {
                setDurations([])
            }
        }
    }, [open, service, userRole, userBranchId])

    // --- Pricing Dialog Handlers ---
    const handleOpenAddPricing = () => {
        setEditingDurationIndex(null)
        setTempDuration({ value: 1, price: 0 })
        setPricingError(null)
        setPricingDialogOpen(true)
    }

    const handleOpenEditPricing = (index: number) => {
        const item = durations[index]
        setEditingDurationIndex(index)
        setTempDuration({ value: item.duration_value, price: item.price })
        setPricingError(null)
        setPricingDialogOpen(true)
    }

    const handleSavePricing = () => {
        setPricingError(null)
        // Validation: Duration and Price must be >= 1
        const intValue = Math.floor(tempDuration.value)
        if (intValue < 1) return
        if (tempDuration.price < 1) return

        // Duplicate Check
        const isDuplicate = durations.some((d, idx) =>
            d.duration_value === tempDuration.value && idx !== editingDurationIndex
        )

        if (isDuplicate) {
            setPricingError(dict.dashboard?.services?.duplicate_pricing_option || "This duration already exists.")
            return
        }

        const newDurations = [...durations]
        const newItem: ServiceDuration = {
            duration_value: tempDuration.value,
            duration_unit: formData.durationMode as any,
            price: tempDuration.price
        }

        if (editingDurationIndex !== null) {
            newDurations[editingDurationIndex] = { ...newDurations[editingDurationIndex], ...newItem }
        } else {
            newDurations.push(newItem)
        }

        newDurations.sort((a, b) => a.duration_value - b.duration_value)
        setDurations(newDurations)
        setPricingDialogOpen(false)
    }

    const handleRemoveDuration = (index: number) => {
        setDurations(durations.filter((_, i) => i !== index))
    }

    // --- Main Submit Handler ---
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsLoading(true)
        setFieldErrors({})
        setGlobalError(null)

        // Capture simple inputs
        // Note: File input is still uncontrolled and must be grabbed from e.currentTarget
        const submitData = new FormData(e.currentTarget)

        // Manually append controlled state values to ensure they are sent
        // even if the input is unmounted (in a hidden tab)
        submitData.set('name', formData.name)
        submitData.set('branch_id', formData.branchId)
        submitData.set('price', formData.price)
        submitData.set('duration', formData.durationMode)
        submitData.set('status', formData.status)
        submitData.set('description', formData.description)

        if (imageFile) {
            submitData.set('image', imageFile)
        }

        const errors: Record<string, string> = {}
        let hasError = false

        if (!formData.name?.trim()) {
            errors.name = dict.dashboard.common?.errors?.required_field || "This field is required"
            hasError = true
        }

        if (!formData.branchId) {
            errors.branch_id = dict.dashboard.common?.errors?.required_field || "This field is required"
            hasError = true
        }

        if (!formData.price) {
            errors.price = dict.dashboard.common?.errors?.required_field || "This field is required"
            hasError = true
        }

        if (hasError) {
            setFieldErrors(errors)
            // Switch tab to info so user sees errors
            if (errors.name || errors.branch_id || errors.price) {
                setActiveTab('info')
            }
            setIsLoading(false)
            return
        }

        // Append durations (Only if NOT open mode)
        // We always send the field even if durations.length is 0, 
        // allowed the backend to clear existing records when the list is empty.
        if (formData.durationMode !== 'open') {
            const validDurations = durations.map(d => ({
                ...d,
                duration_unit: formData.durationMode
            }))
            submitData.append('durations', JSON.stringify(validDurations))
        }

        try {
            const result = service
                ? await updateService(service.id, submitData)
                : await createService(submitData)

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

    const isHalfHour = tempDuration.value % 1 !== 0
    const intValue = Math.floor(tempDuration.value)

    const handleIntDurationChange = (valStr: string) => {
        if (valStr === '') {
            setTempDuration({ ...tempDuration, value: isHalfHour ? 0.5 : 0 })
            return
        }
        if (!/^\d*$/.test(valStr)) return

        const val = parseInt(valStr, 10)
        const newVal = (isNaN(val) ? 0 : val) + (isHalfHour ? 0.5 : 0)
        setTempDuration({ ...tempDuration, value: newVal })
    }

    const handlePriceChange = (valStr: string) => {
        if (valStr === '') {
            setTempDuration({ ...tempDuration, price: 0 })
            return
        }
        if (!/^\d*$/.test(valStr)) return

        const val = parseInt(valStr, 10)
        setTempDuration({ ...tempDuration, price: isNaN(val) ? 0 : val })
    }

    // Helper to update form data
    const updateField = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[600px] bg-white max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {service ? dict.dashboard?.services?.edit_service : dict.dashboard?.services?.add_service}
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir="rtl">
                            <TabsList className="grid w-full grid-cols-2 p-1 border border-slate-200 bg-slate-50/50 rounded-lg h-auto">
                                <TabsTrigger
                                    value="info"
                                    className="py-2.5 rounded-md data-[state=active]:bg-slate-900 data-[state=active]:text-white border border-transparent data-[state=active]:border-slate-800 transition-all font-medium"
                                >
                                    {dict.dashboard?.services?.tabs_info || "Information"}
                                </TabsTrigger>
                                <TabsTrigger
                                    value="pricing"
                                    className="py-2.5 rounded-md data-[state=active]:bg-slate-900 data-[state=active]:text-white border border-transparent data-[state=active]:border-slate-800 transition-all font-medium"
                                >
                                    {dict.dashboard?.services?.tabs_pricing || "Website Pricing"}
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="info" className="space-y-4 pt-4">
                                {/* Name */}
                                <div className="grid gap-2">
                                    <Label htmlFor="name" className="text-start">{dict.dashboard?.services?.name_label}</Label>
                                    <Input
                                        id="name"
                                        name="name"
                                        placeholder={dict.dashboard?.services?.name_placeholder}
                                        value={formData.name}
                                        onChange={(e) => updateField('name', e.target.value)}
                                        className={cn(fieldErrors.name && "border-red-500")}
                                    />
                                    {fieldErrors.name && <p className="text-sm text-red-500 text-start">{fieldErrors.name}</p>}
                                </div>

                                {/* Image Upload */}
                                <div className="grid gap-2">
                                    <Label className="text-start">
                                        {dict.dashboard?.services?.image_label || "Service Image"} <span className="text-xs text-muted-foreground font-normal">({dict.dashboard?.common?.optional || "اختياري"})</span>
                                    </Label>
                                    <div className="flex items-start gap-4">
                                        <div className="h-24 w-24 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden bg-slate-50 shrink-0">
                                            {imagePreview ? (
                                                <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                                            ) : (
                                                <Package className="h-8 w-8 text-slate-300" />
                                            )}
                                        </div>
                                        <div className="space-y-2 flex-1">
                                            <Input
                                                id="image"
                                                type="file"
                                                accept="image/*"
                                                className="cursor-pointer"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0]
                                                    if (file) {
                                                        setImageFile(file)
                                                        const reader = new FileReader()
                                                        reader.onloadend = () => {
                                                            setImagePreview(reader.result as string)
                                                        }
                                                        reader.readAsDataURL(file)
                                                    }
                                                }}
                                            />
                                            <p className="text-xs text-muted-foreground text-start">
                                                {dict.dashboard?.services?.image_help || "يرجى رفع صورة واضحة للخدمة (يفضل أن تكون مربعة)."}
                                            </p>
                                            {service?.image_url && (
                                                <p className="text-xs text-muted-foreground text-start mt-1">
                                                    الصورة الحالية: <a href={service.image_url} target="_blank" rel="noopener noreferrer" className="underline text-blue-600">عرض الصورة</a>
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Description */}
                                <div className="grid gap-2">
                                    <Label htmlFor="description" className="text-start">
                                        {dict.dashboard?.services?.description_label} <span className="text-xs text-muted-foreground font-normal">({dict.dashboard?.common?.optional || "اختياري"})</span>
                                    </Label>
                                    <Textarea
                                        id="description"
                                        name="description"
                                        placeholder={dict.dashboard?.services?.description_placeholder}
                                        value={formData.description}
                                        onChange={(e) => updateField('description', e.target.value)}
                                    />
                                </div>

                                {/* Branch */}
                                <div className="grid gap-2">
                                    <Label htmlFor="branch_id" className="text-start">{dict.dashboard?.services?.branch_label}</Label>
                                    {/* Handle hidden input for validation/FormData logic if needed, but we set manually now */}
                                    <Select
                                        name="branch_id"
                                        value={formData.branchId}
                                        onValueChange={(val) => updateField('branchId', val)}
                                        disabled={userRole !== 'owner'}
                                    >
                                        <SelectTrigger className="flex flex-row items-center justify-between text-start" dir="rtl">
                                            <SelectValue placeholder={dict.dashboard?.services?.select_branch} />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white" dir="rtl">
                                            {branches.filter(b => !b.is_deleted).map((branch) => (
                                                <SelectItem key={branch.id} value={branch.id.toString()}>
                                                    {branch.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {fieldErrors.branch_id && <p className="text-sm text-red-500">{fieldErrors.branch_id}</p>}
                                </div>

                                {/* Duration Mode */}
                                <div className="grid gap-2">
                                    <Label htmlFor="duration" className="text-start">{dict.dashboard?.services?.duration_label}</Label>
                                    <Select
                                        name="duration"
                                        value={formData.durationMode}
                                        onValueChange={(v: any) => updateField('durationMode', v)}
                                    >
                                        <SelectTrigger className="flex flex-row items-center justify-between text-start" dir="rtl">
                                            <SelectValue placeholder={dict.dashboard?.services?.select_duration} />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white" dir="rtl">
                                            <SelectItem value="hour">{dict.dashboard?.services?.duration_hour}</SelectItem>
                                            <SelectItem value="day">{dict.dashboard?.services?.duration_day}</SelectItem>
                                            <SelectItem value="open">{dict.dashboard?.services?.duration_open}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Default Price */}
                                <div className="grid gap-2">
                                    <Label htmlFor="price" className="text-start">{dict.dashboard?.services?.default_price || "Internal System Price"}</Label>
                                    <Input
                                        id="price"
                                        name="price"
                                        type="text"
                                        inputMode="decimal"
                                        pattern="[0-9]*"
                                        value={formData.price}
                                        onChange={(e) => updateField('price', e.target.value)}
                                        placeholder={dict.dashboard?.services?.price_placeholder}
                                        dir="ltr"
                                        className={cn("text-left", fieldErrors.price && "border-red-500")}
                                    />
                                    {fieldErrors.price && <p className="text-sm text-red-500">{fieldErrors.price}</p>}
                                </div>

                                {/* Status */}
                                <div className="grid gap-2">
                                    <Label htmlFor="status" className="text-start">{dict.dashboard?.services?.status_label}</Label>
                                    <Select
                                        name="status"
                                        value={formData.status}
                                        onValueChange={(val) => updateField('status', val)}
                                    >
                                        <SelectTrigger className="flex flex-row items-center justify-between text-start" dir="rtl">
                                            <SelectValue placeholder={dict.dashboard?.services?.select_status} />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white" dir="rtl">
                                            <SelectItem value="active">{dict.dashboard?.services?.status_active}</SelectItem>
                                            <SelectItem value="maintenance">{dict.dashboard?.services?.status_maintenance}</SelectItem>
                                            <SelectItem value="closed">{dict.dashboard?.services?.status_closed}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </TabsContent>

                            <TabsContent value="pricing" className="space-y-4 pt-4">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <Label className="text-lg font-semibold">{dict.dashboard?.services?.dynamic_pricing}</Label>
                                        {formData.durationMode !== 'open' && (
                                            <Button type="button" size="sm" onClick={handleOpenAddPricing}>
                                                <Plus className="h-4 w-4 mr-2" />
                                                {dict.dashboard?.services?.add_pricing_option}
                                            </Button>
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground">{dict.dashboard?.services?.website_pricing_note}</p>

                                    {formData.durationMode === 'open' ? (
                                        <div className="p-4 bg-blue-50 text-blue-800 rounded-md border border-blue-200 text-center">
                                            {dict.dashboard?.services?.open_duration_note || "Open Duration services use the Internal System Price."}
                                        </div>
                                    ) : (
                                        <div className="border rounded-md">
                                            <div className="grid grid-cols-4 p-3 bg-gray-50 font-medium text-sm text-center border-b">
                                                <span>{dict.dashboard?.services?.price_list_header_duration}</span>
                                                <span>{dict.dashboard?.services?.duration_unit_label}</span>
                                                <span>{dict.dashboard?.services?.price_list_header_price}</span>
                                                <span>{dict.dashboard?.services?.price_list_header_actions}</span>
                                            </div>
                                            {durations.length === 0 ? (
                                                <p className="text-sm text-muted-foreground text-center py-8">
                                                    {dict.dashboard?.services?.no_pricing_options || "No pricing options added yet."}
                                                </p>
                                            ) : (
                                                durations.map((dur, idx) => (
                                                    <div key={idx} className="grid grid-cols-4 p-3 text-sm items-center border-b last:border-0 text-center">
                                                        <span dir="ltr">{dur.duration_value}</span>
                                                        <span>
                                                            {formData.durationMode === 'hour' ? dict.dashboard?.services?.duration_hour :
                                                                formData.durationMode === 'day' ? dict.dashboard?.services?.duration_day : ''}
                                                        </span>
                                                        <span dir="ltr">{dur.price} SAR</span>
                                                        <div className="flex justify-center gap-2">
                                                            <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-slate-600" onClick={() => handleOpenEditPricing(idx)}>
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => handleRemoveDuration(idx)}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            </TabsContent>
                        </Tabs>

                        {globalError && (
                            <div className="text-sm text-red-500 bg-red-50 p-2 rounded">
                                {globalError}
                            </div>
                        )}

                        <DialogFooter className="gap-2 sm:gap-0">
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
            </Dialog >

            {/* Nested Pricing Dialog */}
            < Dialog open={pricingDialogOpen} onOpenChange={setPricingDialogOpen} >
                <DialogContent className="sm:max-w-[400px] z-[55] bg-white">
                    <DialogHeader>
                        <DialogTitle>{editingDurationIndex !== null ? dict.dashboard?.services?.edit_pricing_option : dict.dashboard?.services?.add_pricing_option}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>{dict.dashboard?.services?.duration_value_label}</Label>
                            <div className="flex gap-4">
                                <Input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={intValue === 0 ? '' : intValue}
                                    className="col-span-3 text-center"
                                    dir="ltr"
                                    placeholder="0"
                                    onChange={(e) => handleIntDurationChange(e.target.value)}
                                />
                                {formData.durationMode === 'hour' && (
                                    <div className="flex items-center space-x-2 space-x-reverse min-w-max">
                                        <Checkbox
                                            id="half-hour"
                                            checked={isHalfHour}
                                            onCheckedChange={(c) => setTempDuration({ ...tempDuration, value: intValue + (c ? 0.5 : 0) })}
                                        />
                                        <Label htmlFor="half-hour">{dict.dashboard?.services?.add_half_hour}</Label>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label>{dict.dashboard?.services?.price_list_header_price} (SAR)</Label>
                            <Input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={tempDuration.price === 0 ? '' : tempDuration.price}
                                className="text-center"
                                dir="ltr"
                                placeholder="0"
                                onChange={(e) => handlePriceChange(e.target.value)}
                            />
                        </div>
                        {pricingError && (
                            <div className="text-sm text-red-500 text-center">
                                {pricingError}
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPricingDialogOpen(false)}>{dict.dashboard?.common?.cancel}</Button>
                        <Button
                            onClick={handleSavePricing}
                            disabled={Math.floor(tempDuration.value) < 1 || tempDuration.price < 1}
                        >
                            {dict.dashboard?.common?.save}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog >
        </>
    )
}
