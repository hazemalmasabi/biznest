'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { updatePassword } from './actions'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, CheckCircle2 } from "lucide-react"
import { useState } from 'react'
import Link from 'next/link'

// Initial state
// Initial state
const initialState: {
    message?: string;
    errors?: { [key: string]: string };
    success?: boolean;
    payload?: { password?: string; confirmPassword?: string }
} = {
    message: undefined,
    errors: undefined,
    success: false,
    payload: undefined
}

function SubmitButton({ text }: { text: string }) {
    const { pending } = useFormStatus()
    return (
        <Button className="w-full mt-4" type="submit" disabled={pending}>
            {pending ? "..." : text}
        </Button>
    )
}

export function ResetPasswordForm({ dict }: { dict: any }) {
    const [state, formAction] = useFormState(updatePassword, initialState)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    if (state?.success) {
        return (
            <div className="flex flex-col items-center justify-center space-y-4 py-4 text-center">
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-bold text-lg">{dict.common.reset_success}</h3>
                <Link href="/login">
                    <Button className="mt-4">{dict.common.back_to_login}</Button>
                </Link>
            </div>
        )
    }

    // Helper to get localized error
    const getError = (key: string) => {
        if (!key) return null
        return dict.common.errors[key] || key
    }

    return (
        <form action={formAction} className="grid gap-4" noValidate>
            {state?.message && (
                <div className="p-3 bg-red-100 border border-red-200 text-red-600 rounded-md text-sm">
                    {getError(state.message)}
                </div>
            )}

            <div className="grid gap-2">
                <Label htmlFor="password">{dict.common.new_password}</Label>
                <div className="relative">
                    <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        required
                        className={state?.errors?.password ? "border-red-500" : ""}
                        defaultValue={state.payload?.password}
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
                {state?.errors?.password && (
                    <p className="text-sm text-red-500">{getError(state.errors.password)}</p>
                )}
            </div>

            <div className="grid gap-2">
                <Label htmlFor="confirmPassword">{dict.common.confirm_password}</Label>
                <div className="relative">
                    <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        className={state?.errors?.confirmPassword ? "border-red-500" : ""}
                        defaultValue={state.payload?.confirmPassword}
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
                {state?.errors?.confirmPassword && (
                    <p className="text-sm text-red-500">{getError(state.errors.confirmPassword)}</p>
                )}
            </div>

            <SubmitButton text={dict.common.reset_password_title} />
        </form>
    )
}
