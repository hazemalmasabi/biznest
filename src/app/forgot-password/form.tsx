'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { requestReset } from './actions'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, CheckCircle2 } from 'lucide-react'

// Initial state
const initialState: { message?: string; error?: string; success?: boolean } = {
    message: undefined,
    error: undefined,
    success: false
}

function SubmitButton({ text }: { text: string }) {
    const { pending } = useFormStatus()
    return (
        <Button className="w-full mt-4" type="submit" disabled={pending}>
            {pending ? "..." : text}
        </Button>
    )
}

export function ForgotPasswordForm({ dict }: { dict: any }) {
    const [state, formAction] = useFormState(requestReset, initialState)

    if (state?.success) {
        return (
            <div className="flex flex-col items-center justify-center space-y-4 py-4 text-center">
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-bold text-lg">{dict.common.email_sent}</h3>
                <p className="text-sm text-gray-500">{dict.common.email_update_notice}</p>
            </div>
        )
    }

    return (
        <form action={formAction} className="grid gap-4" noValidate>
            <div className="grid gap-2">
                <Label htmlFor="email">{dict.common.email}</Label>
                <div className="relative">
                    <Input
                        id="email"
                        name="email"
                        type="email"
                        dir="ltr"
                        placeholder="you@example.com"
                        className={state?.error ? "border-red-500" : ""}
                        required
                    />
                </div>
                {state?.error && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {dict.common.errors?.[state.error] || dict.common?.[state.error] || state.error}
                    </p>
                )}
            </div>
            <SubmitButton text={dict.common.send_reset_link} />
        </form>
    )
}
