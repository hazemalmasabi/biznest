'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CardContent, CardFooter } from "@/components/ui/card"
import { updateBasicInfo, updateBusiness } from './actions'

// --- Basic Data Form ---
type BasicSettingsFormProps = {
    fullName: string
    phone: string
    dict: any
}

export function BasicSettingsForm({ fullName, phone, dict }: BasicSettingsFormProps) {
    const [errors, setErrors] = useState<{ [key: string]: string }>({})
    const [isPending, setIsPending] = useState(false)

    const handleSubmit = async (formData: FormData) => {
        setErrors({})
        const newErrors: { [key: string]: string } = {}
        const nameVal = formData.get('fullName') as string
        const phoneVal = formData.get('phone') as string

        if (!nameVal.trim()) newErrors.fullName = dict.common.errors.required_field
        if (!phoneVal.trim()) {
            newErrors.phone = dict.common.errors.required_field
        } else if (!/^\d+$/.test(phoneVal)) {
            newErrors.phone = dict.common.errors.numbers_only
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors)
            return
        }

        setIsPending(true)
        const result = await updateBasicInfo(formData)
        setIsPending(false)

        if (result?.error) {
            // Handle generic server errors, maybe show global toast or error under a specific field if applicable
            console.error(result.error)
        }
    }

    return (
        <form action={handleSubmit}>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="fullName">{dict.dashboard.common.name}</Label>
                    <Input
                        id="fullName"
                        name="fullName"
                        defaultValue={fullName}
                        className={errors.fullName ? "border-red-500" : ""}
                    />
                    {errors.fullName && <p className="text-sm text-red-500">{errors.fullName}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="phone">{dict.common.phone}</Label>
                    <Input
                        id="phone"
                        name="phone"
                        defaultValue={phone}
                        className={errors.phone ? "border-red-500" : ""}
                        onInput={(e) => {
                            e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, '')
                        }}
                    />
                    {errors.phone && <p className="text-sm text-red-500">{errors.phone}</p>}
                </div>
            </CardContent>
            <CardFooter className="flex justify-between">
                <Button variant="outline" type="reset">{dict.dashboard.common.cancel}</Button>
                <Button type="submit" disabled={isPending}>{isPending ? dict.common.loading : dict.dashboard.common.update}</Button>
            </CardFooter>
        </form>
    )
}

// --- Business Settings Form ---
type BusinessSettingsFormProps = {
    businessId: number
    businessName: string
    dict: any
}

export function BusinessSettingsForm({ businessId, businessName, dict }: BusinessSettingsFormProps) {
    const [errors, setErrors] = useState<{ [key: string]: string }>({})
    const [isPending, setIsPending] = useState(false)

    const handleSubmit = async (formData: FormData) => {
        setErrors({})
        const newErrors: { [key: string]: string } = {}
        const nameVal = formData.get('businessName') as string

        if (!nameVal.trim()) newErrors.businessName = dict.common.errors.required_field

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors)
            return
        }

        setIsPending(true)
        const result = await updateBusiness(formData)
        setIsPending(false)

        if (result?.error) {
            console.error(result.error)
        }
    }

    return (
        <form action={handleSubmit}>
            <input type="hidden" name="businessId" value={businessId} />
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="businessName">{dict.onboarding.business_name_label}</Label>
                    <Input
                        id="businessName"
                        name="businessName"
                        defaultValue={businessName}
                        className={errors.businessName ? "border-red-500" : ""}
                    />
                    {errors.businessName && <p className="text-sm text-red-500">{errors.businessName}</p>}
                </div>
            </CardContent>
            <CardFooter className="flex justify-between">
                <Button variant="outline" type="reset">{dict.dashboard.common.cancel}</Button>
                <Button type="submit" disabled={isPending}>{isPending ? dict.common.loading : dict.dashboard.common.update}</Button>
            </CardFooter>
        </form>
    )
}
