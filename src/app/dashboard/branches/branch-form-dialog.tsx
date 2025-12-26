'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { createBranch, updateBranch, Branch } from './actions'
import { Loader2 } from 'lucide-react'

type BranchFormDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    branchToEdit?: Branch | null
    dict: any
    lang: string
}

export function BranchFormDialog({ open, onOpenChange, branchToEdit, dict, lang }: BranchFormDialogProps) {
    const [isPending, startTransition] = useTransition()
    const [globalError, setGlobalError] = useState<string | null>(null)
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
    const router = useRouter()

    useEffect(() => {
        if (open) {
            setGlobalError(null)
            setFieldErrors({})
        }
    }, [open])

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setGlobalError(null)
        setFieldErrors({})

        const formData = new FormData(event.currentTarget)
        const name = formData.get('name') as string
        const address = formData.get('address') as string
        const phone = formData.get('phone') as string

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

        if (hasError) {
            setFieldErrors(errors)
            return
        }

        startTransition(async () => {
            let result
            if (branchToEdit) {
                result = await updateBranch(branchToEdit.id, formData)
            } else {
                result = await createBranch(formData)
            }

            if (result.error) {
                setGlobalError(result.error)
            } else {
                router.refresh()
                onOpenChange(false)
            }
        })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {/* Added bg-white text-slate-900 to fix transparency */}
            <DialogContent className="sm:max-w-[425px] bg-white text-slate-900" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                <DialogHeader className="text-start">
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
                        <Label htmlFor="name" className="text-start">{dict.dashboard.branches.name}</Label>
                        <Input
                            id="name"
                            name="name"
                            defaultValue={branchToEdit?.name}
                            placeholder={dict.dashboard.branches.name_placeholder}
                            className={fieldErrors.name ? "border-red-500" : ""}
                        />
                        {/* Inline error for Name */}
                        {fieldErrors.name && <p className="text-sm text-red-500 text-start">{fieldErrors.name}</p>}
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="address" className="text-start">{dict.dashboard.branches.address}</Label>
                        <Input
                            id="address"
                            name="address"
                            defaultValue={branchToEdit?.address || ''}
                            placeholder={dict.dashboard.branches.address_placeholder}
                            className={fieldErrors.address ? "border-red-500" : ""}
                        />
                        {fieldErrors.address && <p className="text-sm text-red-500 text-start">{fieldErrors.address}</p>}
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="phone" className="text-start">{dict.dashboard.branches.phone}</Label>
                        <Input
                            id="phone"
                            name="phone"
                            defaultValue={branchToEdit?.phone || ''}
                            placeholder={dict.dashboard.branches.phone_placeholder}
                            className={fieldErrors.phone ? "border-red-500" : ""}
                            pattern="[0-9]*"
                            onInput={(e) => {
                                e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, '')
                            }}
                        />
                        {/* Inline error for Phone */}
                        {fieldErrors.phone && <p className="text-sm text-red-500 text-start">{fieldErrors.phone}</p>}
                    </div>

                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <Checkbox
                            id="is_main"
                            name="is_main"
                            defaultChecked={branchToEdit?.is_main}
                        />
                        <Label htmlFor="is_main" className="cursor-pointer">
                            {dict.dashboard.branches.is_main}
                        </Label>
                    </div>

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
            </DialogContent>
        </Dialog>
    )
}
