'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CardContent, CardFooter } from "@/components/ui/card"
import { updateAuthInfo } from './actions'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

type AuthSettingsFormProps = {
    userEmail: string
    dict: any
}

export function AuthSettingsForm({ userEmail, dict }: AuthSettingsFormProps) {
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)
    const [errors, setErrors] = useState<{ [key: string]: string }>({})
    const [isPending, setIsPending] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    const isUsername = !userEmail.includes('@')

    const handleSubmit = async (formData: FormData) => {
        setMessage(null)
        setErrors({})
        const newErrors: { [key: string]: string } = {}

        const email = formData.get('email') as string
        const password = formData.get('password') as string

        // Client-side validation
        if (!email.trim()) {
            newErrors.email = dict.common.errors.required_field
        }

        if (password) {
            if (password.length < 8) newErrors.password = dict.common.errors.password_length
            else if (!/^[\x20-\x7E]*$/.test(password)) newErrors.password = dict.common.errors.english_only
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors)
            return
        }

        setIsPending(true)
        const result = await updateAuthInfo(formData)
        setIsPending(false)

        if (result?.error) {
            // Handle server-side errors
            if (result.error === 'password_min_length') {
                setErrors({ password: dict.common.errors.password_length })
            } else {
                const errorText = dict.dashboard.common[result.error] || result.error
                setMessage({ type: 'error', text: errorText })
            }
        } else if (result?.success) {
            if (result.message) {
                const msgText = dict.dashboard.common[result.message]
                const type = result.message === 'email_update_notice' ? 'info' : 'success'
                setMessage({ type, text: msgText })

                const form = document.getElementById('auth-form') as HTMLFormElement
                form?.reset()
            }
        }
    }

    return (
        <form id="auth-form" action={handleSubmit} noValidate>
            <CardContent className="space-y-4">
                {message && (
                    <div className={`p-3 rounded text-sm ${message.type === 'error' ? 'bg-red-50 text-red-600' :
                        message.type === 'info' ? 'bg-blue-50 text-blue-600' :
                            'bg-green-50 text-green-600'
                        }`}>
                        {message.text}
                    </div>
                )}
                <div className="space-y-2">
                    <Label htmlFor="email">{isUsername ? dict.dashboard.employees.username : dict.common.email}</Label>
                    <Input
                        id="email"
                        name="email"
                        defaultValue={userEmail}
                        disabled={isUsername}
                        className={errors.email ? "border-red-500" : ""}
                    />
                    {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="password">{dict.dashboard.common.new_password}</Label>
                    <div className="relative">
                        <Input
                            id="password"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="********"
                            className={errors.password ? "border-red-500 pr-10" : "pr-10"}
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute top-0 end-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ? (
                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                                <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="sr-only">
                                {showPassword ? dict.common.hide_password : dict.common.show_password}
                            </span>
                        </Button>
                    </div>
                    {errors.password ? (
                        <p className="text-sm text-red-500">{errors.password}</p>
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            {dict.dashboard.common.password_min_length}
                        </p>
                    )}
                </div>
            </CardContent>
            <CardFooter className="flex justify-between">
                <Button variant="outline" type="reset">{dict.dashboard.common.cancel}</Button>
                <Button type="submit" disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isPending ? dict.common.loading : dict.dashboard.common.update}
                </Button>
            </CardFooter>
        </form>
    )
}
