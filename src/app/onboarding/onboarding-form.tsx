'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CardContent, CardFooter } from "@/components/ui/card"
import { createBusiness, createBranch } from './actions'

type OnboardingFormProps = {
    step: string
    businessId?: string
    dict: any
}

export function OnboardingForm({ step, businessId, dict }: OnboardingFormProps) {
    const [errors, setErrors] = useState<{ [key: string]: string }>({})

    const validateField = (name: string, value: string) => {
        if (!value.trim()) {
            return dict.common.errors.required_field
        }
        return ""
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        const newErrors: { [key: string]: string } = {}

        if (step === 'business') {
            const name = formData.get('businessName') as string
            const error = validateField('businessName', name)
            if (error) newErrors.businessName = error
        }

        if (step === 'branch') {
            const name = formData.get('branchName') as string
            const address = formData.get('branchAddress') as string
            const phone = formData.get('branchPhone') as string

            if (!name.trim()) newErrors.branchName = dict.common.errors.required_field
            if (!address.trim()) newErrors.branchAddress = dict.common.errors.required_field

            if (!phone.trim()) {
                newErrors.branchPhone = dict.common.errors.required_field
            } else if (!/^\d+$/.test(phone)) {
                newErrors.branchPhone = "Enter numbers only"
            }
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors)
            return
        }

        setErrors({})

        // Call the appropriate server action
        if (step === 'business') {
            createBusiness(formData)
        } else {
            createBranch(formData)
        }
    }

    if (step === 'business') {
        return (
            <form onSubmit={handleSubmit} noValidate>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="businessName">{dict.onboarding.business_name_label}</Label>
                        <Input
                            id="businessName"
                            name="businessName"
                            placeholder={dict.onboarding.business_name_placeholder}
                            className={errors.businessName ? "border-red-500" : ""}
                        />
                        {errors.businessName && <p className="text-sm text-red-500">{errors.businessName}</p>}
                    </div>
                </CardContent>
                <CardFooter>
                    <Button type="submit" className="w-full">{dict.onboarding.create_business_btn}</Button>
                </CardFooter>
            </form>
        )
    }

    return (
        <form onSubmit={handleSubmit} noValidate>
            <input type="hidden" name="businessId" value={businessId} />
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="branchName">{dict.onboarding.branch_name_label}</Label>
                    <Input
                        id="branchName"
                        name="branchName"
                        placeholder={dict.onboarding.branch_name_placeholder}
                        className={errors.branchName ? "border-red-500" : ""}
                    />
                    {errors.branchName && <p className="text-sm text-red-500">{errors.branchName}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="branchAddress">{dict.onboarding.branch_address_label}</Label>
                    <Input
                        id="branchAddress"
                        name="branchAddress"
                        placeholder={dict.onboarding.branch_address_placeholder}
                        className={errors.branchAddress ? "border-red-500" : ""}
                    />
                    {errors.branchAddress && <p className="text-sm text-red-500">{errors.branchAddress}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="branchPhone">{dict.onboarding.branch_phone_label}</Label>
                    <Input
                        id="branchPhone"
                        name="branchPhone"
                        type="tel"
                        placeholder={dict.onboarding.branch_phone_placeholder}
                        className={errors.branchPhone ? "border-red-500" : ""}
                        onInput={(e) => {
                            e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, '')
                        }}
                    />
                    {errors.branchPhone && <p className="text-sm text-red-500">{errors.branchPhone}</p>}
                </div>
            </CardContent>
            <CardFooter>
                <Button type="submit" className="w-full">{dict.onboarding.complete_setup_btn}</Button>
            </CardFooter>
        </form>
    )
}
