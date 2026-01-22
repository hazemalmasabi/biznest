'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createBranch, updateBranch, Branch, getBranchWorkingHours, updateBranchWorkingHours, WorkingHour } from './actions'
import { Loader2, Plus, Trash2 } from 'lucide-react'

type BranchFormDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    branchToEdit?: Branch | null
    dict: any
    lang: string
    userRole?: string
}

export function BranchFormDialog({ open, onOpenChange, branchToEdit, dict, lang, userRole }: BranchFormDialogProps) {
    const [isPending, startTransition] = useTransition()
    const [globalError, setGlobalError] = useState<string | null>(null)
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
    const [workingHours, setWorkingHours] = useState<WorkingHour[]>([])
    const router = useRouter()

    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const [imageFile, setImageFile] = useState<File | null>(null)

    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        address: '',
        phone: '',
        location_url: '',
        is_main: false
    })

    useEffect(() => {
        if (open) {
            setGlobalError(null)
            setFieldErrors({})

            if (branchToEdit) {
                setFormData({
                    name: branchToEdit.name,
                    slug: branchToEdit.slug || '',
                    address: branchToEdit.address || '',
                    phone: branchToEdit.phone || '',
                    location_url: (branchToEdit as any).location_url || '',
                    is_main: branchToEdit.is_main || false
                })
                setImagePreview((branchToEdit as any).image_url || null)
                setImageFile(null)

                // Fetch working hours
                getBranchWorkingHours(branchToEdit.id).then(data => {
                    // Ensure all days 0-6 exist
                    const fullWeek: WorkingHour[] = []
                    for (let i = 0; i < 7; i++) {
                        const existing = data.find(h => h.day_of_week === i)
                        fullWeek.push(existing || {
                            branch_id: branchToEdit.id,
                            day_of_week: i,
                            start_time: '09:00',
                            end_time: '17:00',
                            is_closed: false
                        })
                    }
                    setWorkingHours(fullWeek)
                })
            } else {
                setFormData({
                    name: '',
                    slug: '',
                    address: '',
                    phone: '',
                    location_url: '',
                    is_main: false
                })
                setImagePreview(null)
                setImageFile(null)

                // Default new hours
                const defaultHours: WorkingHour[] = []
                for (let i = 0; i < 7; i++) {
                    defaultHours.push({
                        branch_id: 0, // temp
                        day_of_week: i,
                        start_time: '09:00',
                        end_time: '17:00',
                        is_closed: false
                    })
                }
                setWorkingHours(defaultHours)
            }
        }
    }, [open, branchToEdit])

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setGlobalError(null)
        setFieldErrors({})

        // Create FormData from state manually
        const submitData = new FormData()
        submitData.append('name', formData.name)
        submitData.append('slug', formData.slug)
        submitData.append('address', formData.address)
        submitData.append('phone', formData.phone)
        submitData.append('location_url', formData.location_url)
        if (formData.is_main) submitData.append('is_main', 'on')

        if (imageFile) {
            submitData.append('image', imageFile)
        }

        const name = formData.name
        const address = formData.address
        const phone = formData.phone

        const errors: Record<string, string> = {}
        let hasError = false

        // Validation: Name required
        if (!name || !name.trim()) {
            errors.name = dict.common.errors.required_field
            hasError = true
        }

        // Validation: Address required
        if (!address || !address.trim()) {
            errors.address = dict.common.errors.required_field
            hasError = true
        }

        // Validation: Phone required & numbers only
        if (!phone || !phone.trim()) {
            errors.phone = dict.common.errors.required_field
            hasError = true
        } else if (!/^\d+$/.test(phone)) {
            errors.phone = dict.common.errors.numbers_only
            hasError = true
        }

        // Validation: Slug rules
        if (formData.slug) {
            const slug = formData.slug
            if (slug.length < 4) {
                errors.slug = lang === 'ar' ? "الرابط المختصر يجب أن يكون 4 رموز على الأقل" : "Slug must be at least 4 characters"
                hasError = true
            } else if (!/^[a-zA-Z0-9]+$/.test(slug)) {
                errors.slug = lang === 'ar' ? "الرابط المختصر يجب أن يحتوي على حروف إنجليزية وأرقام فقط" : "Slug must contain only English letters and numbers"
                hasError = true
            } else if (!/[a-zA-Z]/.test(slug)) {
                errors.slug = lang === 'ar' ? "الرابط المختصر يجب أن يحتوي على حرف واحد على الأقل" : "Slug must contain at least one letter"
                hasError = true
            }
        } else {
            // Optional: if you want to make slug required, uncomment below
            // errors.slug = lang === 'ar' ? "الرابط المختصر مطلوب" : "Slug is required"
            // hasError = true
        }

        if (hasError) {
            setFieldErrors(errors)
            return
        }

        startTransition(async () => {
            let result
            let branchId = branchToEdit?.id

            if (branchToEdit) {
                result = await updateBranch(branchToEdit.id, submitData)
            } else {
                // For create, we normally need the ID back to save hours, but the current action doesn't return it.
                // Assuming createBranch returns { success: true } or { error }.
                // TODO: Need createBranch to return the new ID to save hours for a new branch.
                // For now, let's assume we update hours only if editing, OR update createBranch to return data.
                result = await createBranch(submitData)
            }

            if (result.error) {
                if (result.error.includes('الرابط المختصر مستخدم بالفعل')) {
                    setFieldErrors({ slug: result.error })
                    // Switch to info tab if error is there
                    // (optional, but already on info usually)
                } else {
                    setGlobalError(result.error)
                }
            } else {
                // If editing, save hours
                if (branchToEdit) {
                    await updateBranchWorkingHours(branchToEdit.id, workingHours)
                } else if ((result as any).branch) {
                    // If created successfully, use the returned ID to save hours
                    // Need to cast result.branch as it might be typed loosely or we know it has id
                    await updateBranchWorkingHours(((result as any).branch).id, workingHours)
                }

                router.refresh()
                onOpenChange(false)
            }
        })
    }

    const days = lang === 'ar'
        ? ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
        : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

    // Mapping 0-6 (Sun-Sat) standard JS
    const getDayName = (idx: number) => days[idx]

    const updateHour = (idx: number, field: keyof WorkingHour, value: any) => {
        const newHours = [...workingHours]
        newHours[idx] = { ...newHours[idx], [field]: value }
        setWorkingHours(newHours)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {/* Added bg-white text-slate-900 to fix transparency */}
            {/* Added bg-white text-slate-900 to fix transparency */}
            <DialogContent className="sm:max-w-[600px] bg-white text-slate-900 max-h-[90vh] overflow-y-auto">
                <div dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                    <DialogHeader className={lang === 'ar' ? "text-right" : "text-left"}>
                        <DialogTitle>
                            {branchToEdit
                                ? dict.dashboard.branches.edit_branch
                                : dict.dashboard.branches.add_branch}
                        </DialogTitle>
                    </DialogHeader>
                    {/* Added noValidate to disable browser popup errors */}
                    <form onSubmit={handleSubmit} className="grid gap-4 py-4" noValidate>
                        {globalError && (
                            <div className="p-3 bg-red-100 border border-red-200 text-red-600 rounded-md text-sm">
                                {globalError}
                            </div>
                        )}

                        <div className="grid gap-2">
                            <Label htmlFor="branch_main_info" className="sr-only">Info</Label>
                        </div>
                        <Tabs defaultValue="info" className="w-full" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                            <TabsList className="grid w-full grid-cols-2 p-1 border border-slate-200 bg-slate-50/50 rounded-lg h-auto">
                                <TabsTrigger
                                    value="info"
                                    className="py-2.5 rounded-md data-[state=active]:bg-slate-900 data-[state=active]:text-white border border-transparent data-[state=active]:border-slate-800 transition-all font-medium"
                                >
                                    {dict.dashboard.branches.info || (lang === 'ar' ? 'المعلومات' : 'Info')}
                                </TabsTrigger>
                                <TabsTrigger
                                    value="hours"
                                    className="py-2.5 rounded-md data-[state=active]:bg-slate-900 data-[state=active]:text-white border border-transparent data-[state=active]:border-slate-800 transition-all font-medium"
                                >
                                    {dict.dashboard.branches.working_hours || (lang === 'ar' ? 'ساعات العمل' : 'Working Hours')}
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="info" className="space-y-4 pt-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name" className={lang === 'ar' ? "text-right" : "text-left"}>{dict.dashboard.branches.name}</Label>
                                    <Input
                                        id="name"
                                        name="name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder={dict.dashboard.branches.name_placeholder}
                                        className={fieldErrors.name ? "border-red-500" : ""}
                                    />
                                    {fieldErrors.name && <p className={`text-sm text-red-500 ${lang === 'ar' ? "text-right" : "text-left"}`}>{fieldErrors.name}</p>}
                                </div>

                                <div className="grid gap-2">
                                    <Label className={lang === 'ar' ? "text-right" : "text-left"}>
                                        {dict.dashboard?.branches?.image_label || (lang === 'ar' ? 'صورة الفرع' : 'Branch Image')} <span className="text-xs text-muted-foreground font-normal">({dict.dashboard?.common?.optional || (lang === 'ar' ? 'اختياري' : 'Optional')})</span>
                                    </Label>
                                    <div className="flex items-start gap-4">
                                        <div className="h-24 w-24 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden bg-slate-50 shrink-0">
                                            {imagePreview ? (
                                                <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                                            ) : (
                                                <div className="text-slate-300">
                                                    <Loader2 className="h-8 w-8 animate-spin hidden" />
                                                    <span className="text-4xl text-slate-300">+</span>
                                                </div>
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
                                            {branchToEdit?.image_url && (
                                                <p className={`text-xs text-muted-foreground ${lang === 'ar' ? "text-right" : "text-left"} mt-1`}>
                                                    {lang === 'ar' ? "الصورة الحالية:" : "Current image:"} <a href={branchToEdit.image_url} target="_blank" rel="noopener noreferrer" className="underline text-blue-600">{lang === 'ar' ? "عرض" : "View"}</a>
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="address" className={lang === 'ar' ? "text-right" : "text-left"}>{dict.dashboard.branches.address}</Label>
                                    <Input
                                        id="address"
                                        name="address"
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        placeholder={dict.dashboard.branches.address_placeholder}
                                        className={fieldErrors.address ? "border-red-500" : ""}
                                    />
                                    {fieldErrors.address && <p className={`text-sm text-red-500 ${lang === 'ar' ? "text-right" : "text-left"}`}>{fieldErrors.address}</p>}
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="location_url" className={lang === 'ar' ? "text-right" : "text-left"}>
                                        {lang === 'ar' ? 'رابط الموقع (Google Maps)' : 'Location URL'} <span className="text-xs text-muted-foreground font-normal">({dict.dashboard?.common?.optional || (lang === 'ar' ? 'اختياري' : 'Optional')})</span>
                                    </Label>
                                    <Input
                                        id="location_url"
                                        name="location_url"
                                        value={formData.location_url}
                                        onChange={(e) => setFormData({ ...formData, location_url: e.target.value })}
                                        placeholder="https://maps.google.com/..."
                                    />
                                    <p className={`text-xs text-muted-foreground ${lang === 'ar' ? "text-right" : "text-left"}`}>
                                        {lang === 'ar' ? 'رابط مباشر للموقع على الخريطة' : 'Direct link to location on map'}
                                    </p>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="phone" className={lang === 'ar' ? "text-right" : "text-left"}>{dict.dashboard.branches.phone}</Label>
                                    <Input
                                        id="phone"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/[^0-9]/g, '')
                                            setFormData({ ...formData, phone: val })
                                        }}
                                        placeholder={dict.dashboard.branches.phone_placeholder}
                                        className={fieldErrors.phone ? "border-red-500" : ""}
                                        pattern="[0-9]*"
                                    />
                                    {fieldErrors.phone && <p className={`text-sm text-red-500 ${lang === 'ar' ? "text-right" : "text-left"}`}>{fieldErrors.phone}</p>}
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="slug" className={lang === 'ar' ? "text-right" : "text-left"}>{lang === 'ar' ? 'الرابط المختصر (slug)' : 'Slug URL'}</Label>
                                    <Input
                                        id="slug"
                                        name="slug"
                                        value={formData.slug}
                                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                        placeholder="branch-name"
                                        className={fieldErrors.slug ? "border-red-500" : ""}
                                    />
                                    {fieldErrors.slug && <p className={`text-sm text-red-500 ${lang === 'ar' ? "text-right" : "text-left"}`}>{fieldErrors.slug}</p>}
                                    <p className={`text-xs text-muted-foreground ${lang === 'ar' ? "text-right" : "text-left"}`}>
                                        {lang === 'ar' ? 'يستخدم في رابط الحجز العام: /book/this-slug' : 'Used for public booking URL: /book/this-slug'}
                                    </p>
                                </div>

                                {(userRole === 'owner' || userRole === 'admin') && (
                                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                                        <Checkbox
                                            id="is_main"
                                            name="is_main"
                                            checked={formData.is_main}
                                            onCheckedChange={(c) => setFormData({ ...formData, is_main: !!c })}
                                        />
                                        <Label htmlFor="is_main" className="cursor-pointer">
                                            {dict.dashboard.branches.is_main}
                                        </Label>
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="hours" className="pt-4">
                                <div className="space-y-4 max-h-[400px] overflow-y-auto">
                                    {workingHours.map((hour, idx) => (
                                        <div key={idx} className="flex items-center gap-2 border-b pb-2">
                                            <div className="w-24 font-medium text-sm">{getDayName(hour.day_of_week)}</div>
                                            <div className="flex items-center gap-2 flex-1">
                                                <Checkbox
                                                    checked={!hour.is_closed}
                                                    onCheckedChange={(c) => updateHour(idx, 'is_closed', !c)}
                                                />
                                                <span className="text-xs w-12 text-center">{hour.is_closed ? (lang === 'ar' ? 'مغلق' : 'Closed') : (lang === 'ar' ? 'مفتوح' : 'Open')}</span>

                                                {!hour.is_closed && (
                                                    <div className="flex items-center gap-2">
                                                        <Input
                                                            type="time"
                                                            value={hour.start_time || ''}
                                                            onChange={(e) => updateHour(idx, 'start_time', e.target.value)}
                                                            className="h-8 text-xs"
                                                        />
                                                        <span>-</span>
                                                        <Input
                                                            type="time"
                                                            value={hour.end_time || ''}
                                                            onChange={(e) => updateHour(idx, 'end_time', e.target.value)}
                                                            className="h-8 text-xs"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </TabsContent>
                        </Tabs>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                {dict.dashboard.common.cancel}
                            </Button>
                            <Button type="submit" disabled={isPending}>
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin rtl:ml-2 rtl:mr-0" />}
                                {branchToEdit ? dict.dashboard.common.save : dict.dashboard.branches.add_branch}
                            </Button>
                        </DialogFooter>
                    </form>
                </div>
            </DialogContent>
        </Dialog >
    )
}
