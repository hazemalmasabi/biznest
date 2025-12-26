'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff } from "lucide-react"
import { login, signup } from "./actions"

type AuthFormProps = {
    isSignup: boolean
    dict: any
    message?: string
    error?: string
}

export function AuthForm({ isSignup, dict, message, error }: AuthFormProps) {
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [errors, setErrors] = useState<{ [key: string]: string }>({})

    const validateForm = (formData: FormData) => {
        const newErrors: { [key: string]: string } = {}

        if (isSignup) {
            const fullName = formData.get('fullName') as string
            if (!fullName.trim()) newErrors.fullName = dict.common.errors.required_field

            const phone = formData.get('phone') as string
            if (!phone.trim()) newErrors.phone = dict.common.errors.required_field

            const confirmPassword = formData.get('confirmPassword') as string
            const password = formData.get('password') as string

            if (!confirmPassword) newErrors.confirmPassword = dict.common.errors.required_field
            if (password !== confirmPassword) {
                newErrors.confirmPassword = dict.common.errors.password_mismatch
                newErrors.password = dict.common.errors.password_mismatch
            }
        }

        const email = formData.get('email') as string
        if (!email.trim()) newErrors.email = dict.common.errors.required_field

        const password = formData.get('password') as string
        if (!password) {
            newErrors.password = dict.common.errors.required_field
        } else {
            if (!/^[\x20-\x7E]*$/.test(password)) {
                newErrors.password = dict.common.errors.english_only
            }
            if (isSignup && password.length < 8) {
                newErrors.password = dict.common.errors.password_length
            }
        }

        return newErrors
    }

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        const newErrors = validateForm(formData)

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors)
            return
        }

        setErrors({})
        if (isSignup) {
            signup(formData)
        } else {
            login(formData)
        }
    }

    // Map server error to localized string if possible
    let displayError = error
    let serverEmailError = null

    if (error === 'Invalid login credentials' || error === 'Could not authenticate user') {
        displayError = dict.common.errors.invalid_credentials
    } else if (error === 'email_exists') {
        displayError = undefined
        serverEmailError = dict.common.errors.email_exists
    } else if (error === 'account_disabled') {
        displayError = dict.common.errors.account_disabled
    } else if (error === 'branch_deleted') {
        displayError = dict.common.errors.branch_deleted
    }

    const finalError = displayError

    const emailError = errors.email || serverEmailError

    return (
        <form
            className="grid gap-4"
            noValidate
            onSubmit={handleSubmit}
        >
            {finalError && (
                <div className="p-3 bg-red-100 border border-red-200 text-red-600 rounded-md text-sm">
                    {finalError}
                </div>
            )}
            {message && (
                <div className="p-3 bg-green-100 border border-green-200 text-green-600 rounded-md text-sm">
                    {message}
                </div>
            )}

            {isSignup && (
                <>
                    <div className="grid gap-2">
                        <Label htmlFor="fullName">{dict.common.full_name}</Label>
                        <Input
                            id="fullName"
                            name="fullName"
                            defaultValue=""
                            className={errors.fullName ? "border-red-500" : ""}
                        />
                        {errors.fullName && <p className="text-sm text-red-500">{errors.fullName}</p>}
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="phone">{dict.common.phone}</Label>
                        <Input
                            id="phone"
                            name="phone"
                            type="text"
                            inputMode="numeric"
                            defaultValue=""
                            className={errors.phone ? "border-red-500" : ""}
                            pattern="[0-9]*"
                            onInput={(e) => {
                                e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, '')
                            }}
                        />
                        {errors.phone && <p className="text-sm text-red-500">{errors.phone}</p>}
                    </div>
                </>
            )}

            <div className="grid gap-2">
                <Label htmlFor="email">{dict.common.email}</Label>
                <Input
                    id="email"
                    name="email"
                    type="text"
                    dir="ltr"
                    defaultValue=""
                    placeholder={dict.common.email}
                    className={emailError ? "border-red-500" : ""}
                />
                {emailError && <p className="text-sm text-red-500">{emailError}</p>}
            </div>

            <div className="grid gap-2">
                <Label htmlFor="password">{dict.common.password}</Label>
                <div className="relative">
                    <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        className={errors.password ? "border-red-500" : ""}
                    />
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute end-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                    >
                        {showPassword ? (
                            <EyeOff className="h-4 w-4 text-gray-500" />
                        ) : (
                            <Eye className="h-4 w-4 text-gray-500" />
                        )}
                    </Button>
                </div>
                {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
                {!isSignup && (
                    <div className="flex justify-end">
                        <a href="/forgot-password" className="text-xs text-blue-600 hover:underline">
                            {dict.common.forgot_password || "Forgot Password?"}
                        </a>
                    </div>
                )}
            </div>

            {isSignup && (
                <div className="grid gap-2">
                    <Label htmlFor="confirmPassword">{dict.common.confirm_password}</Label>
                    <div className="relative">
                        <Input
                            id="confirmPassword"
                            name="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            className={errors.confirmPassword ? "border-red-500" : ""}
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute end-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                            {showConfirmPassword ? (
                                <EyeOff className="h-4 w-4 text-gray-500" />
                            ) : (
                                <Eye className="h-4 w-4 text-gray-500" />
                            )}
                        </Button>
                    </div>
                    {errors.confirmPassword && <p className="text-sm text-red-500">{errors.confirmPassword}</p>}
                </div>
            )}

            <Button className="w-full mt-2" type="submit">
                {isSignup ? dict.common.signup : dict.common.signin}
            </Button>
        </form>
    )
}

