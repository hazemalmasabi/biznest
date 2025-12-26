'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from 'lucide-react'
import { createEmployee, updateEmployee } from './actions'

interface EmployeeFormDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    employeeToEdit?: any // Typed properly in real app
    branches: any[]
    dict: any
    lang: string
    userRole?: string
    userBranchId?: number | null
}

export function EmployeeFormDialog({ open, onOpenChange, employeeToEdit, branches, dict, lang, userRole, userBranchId }: EmployeeFormDialogProps) {
    const [isPending, startTransition] = useTransition()
    const [globalError, setGlobalError] = useState<string | null>(null)
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
    const [showPassword, setShowPassword] = useState(false)
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
        const phone = formData.get('phone') as string
        const username = formData.get('username') as string
        const password = formData.get('password') as string
        const role = formData.get('role') as string
        const branchId = formData.get('branch_id') as string

        const errors: Record<string, string> = {}
        let hasError = false

        // Regex for English letters, numbers, and symbols only
        const englishOnlyRegex = /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]*$/
        const numbersOnlyRegex = /^[0-9]*$/

        if (!name?.trim()) {
            errors.name = dict.common.errors.required_field
            hasError = true
        }

        // Phone Validation
        if (!phone?.trim()) {
            // If required
            // errors.phone = dict.common.errors.required_field
            // hasError = true
        } else if (!numbersOnlyRegex.test(phone)) {
            errors.phone = dict.common.errors.numbers_only || "Numbers only"
            hasError = true
        }

        // Username Validation
        if (!username?.trim()) {
            errors.username = dict.common.errors.required_field
            hasError = true
        } else if (username.length < 3) {
            errors.username = "Username must be at least 3 chars"
            hasError = true
        } else if (!englishOnlyRegex.test(username)) {
            errors.username = dict.common.errors.english_only || "English characters only"
            hasError = true
        }

        // Password Validation
        if (!employeeToEdit && !password) {
            errors.password = dict.common.errors.required_field
            hasError = true
        } else if (password) { // Check if password is provided (edit optional or create required)
            if (password.length < 8) {
                errors.password = dict.dashboard.common?.password_min_length || "Min 8 chars"
                hasError = true
            } else if (!englishOnlyRegex.test(password)) {
                errors.password = dict.common.errors.english_only || "English characters only"
                hasError = true
            }
        }

        if (!role) {
            errors.role = dict.common.errors.required_field
            hasError = true
        }

        if (role !== 'owner' && !branchId) {
            errors.branch_id = dict.common.errors.required_field
            hasError = true
        }

        if (hasError) {
            setFieldErrors(errors)
            return
        }

        startTransition(async () => {
            let result
            if (employeeToEdit) {
                result = await updateEmployee(employeeToEdit.id, formData)
            } else {
                result = await createEmployee(formData)
            }

            if (result.error) {
                setGlobalError(result.error)
            } else if (result.fieldErrors) {
                const newFieldErrors = { ...result.fieldErrors }
                // Localize backend errors
                if (newFieldErrors.username === 'USERNAME_EXISTS') {
                    newFieldErrors.username = dict.common.errors.username_exists
                }
                setFieldErrors(newFieldErrors)
            } else {
                router.refresh()
                onOpenChange(false)
            }
        })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="max-w-[400px] w-full bg-white text-slate-900 max-h-[90vh] overflow-y-auto"
                dir={lang === 'ar' ? 'rtl' : 'ltr'}
            >
                <DialogHeader className="text-start">
                    <DialogTitle>
                        {employeeToEdit
                            ? dict.dashboard.employees.edit_employee
                            : dict.dashboard.employees.add_employee}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="grid gap-3 py-2" noValidate>
                    {globalError && (
                        <div className="p-3 bg-red-100 border border-red-200 text-red-600 rounded-md text-sm">
                            {globalError}
                        </div>
                    )}

                    {/* Name */}
                    <div className="grid gap-1.5">
                        <Label htmlFor="name" className="text-start text-sm">{dict.dashboard.employees.name}</Label>
                        <Input id="name" name="name" defaultValue={employeeToEdit?.full_name} placeholder={dict.dashboard.employees.name_placeholder} className={fieldErrors.name ? "border-red-500 h-9" : "h-9"} />
                        {fieldErrors.name && <p className="text-xs text-red-500 text-start">{fieldErrors.name}</p>}
                    </div>

                    {/* Phone */}
                    <div className="grid gap-1.5">
                        <Label htmlFor="phone" className="text-start text-sm">{dict.dashboard.employees.phone}</Label>
                        <Input
                            id="phone"
                            name="phone"
                            dir="ltr"
                            defaultValue={employeeToEdit?.phone}
                            placeholder={dict.dashboard.employees.phone_placeholder}
                            className={fieldErrors.phone ? "border-red-500 text-left h-9" : "text-left h-9"}
                            onChange={(e) => {
                                const value = e.target.value;
                                if (!/^[0-9]*$/.test(value)) {
                                    e.target.value = value.replace(/[^0-9]/g, '');
                                }
                            }}
                        />
                        {fieldErrors.phone && <p className="text-xs text-red-500 text-start">{fieldErrors.phone}</p>}
                    </div>

                    {/* Username */}
                    <div className="grid gap-1.5">
                        <Label htmlFor="username" className="text-start text-sm">{dict.dashboard.employees.username}</Label>
                        <Input
                            id="username"
                            name="username"
                            dir="ltr"
                            defaultValue={employeeToEdit?.username}
                            placeholder={dict.dashboard.employees.username_placeholder}
                            className={fieldErrors.username ? "border-red-500 text-left h-9" : "text-left h-9"}
                        />
                        {fieldErrors.username && <p className="text-xs text-red-500 text-start">{fieldErrors.username}</p>}
                    </div>

                    {/* Password (Optional on Edit) */}
                    <div className="grid gap-1.5">
                        <Label htmlFor="password" className="text-start text-sm">
                            {dict.dashboard.employees.password}
                            {employeeToEdit && <span className="text-xs text-muted-foreground font-normal mx-1">{dict.dashboard.common.optional_password_hint}</span>}
                        </Label>
                        <div className="relative">
                            <Input
                                id="password"
                                name="password"
                                type={showPassword ? "text" : "password"}
                                dir="ltr"
                                className={fieldErrors.password ? "border-red-500 text-left h-9 pr-10" : "text-left h-9 pr-10"}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-700"
                            >
                                {showPassword ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                        {fieldErrors.password && <p className="text-xs text-red-500 text-start">{fieldErrors.password}</p>}
                    </div>

                    {/* Role Selection */}
                    <div className="grid gap-1.5">
                        <Label htmlFor="role" className="text-start text-sm">{dict.dashboard.employees.role}</Label>
                        <Select name="role" defaultValue={employeeToEdit?.role} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                            <SelectTrigger className={`h-9 bg-transparent ${fieldErrors.role ? "border-red-500" : ""}`}>
                                <SelectValue placeholder={dict.dashboard.employees.select_role} />
                            </SelectTrigger>
                            <SelectContent className="bg-white text-slate-900 border-slate-200">
                                <SelectContent className="bg-white text-slate-900 border-slate-200">
                                    {(userRole === 'owner' || userRole === 'manager') && ( // Logic: Manager usually shouldn't add other managers? User said: "Manager adds Assistant/Receptionist". Owner adds Manager? Assuming Owner can add anyone.
                                        <>
                                            {(userRole === 'owner') && <SelectItem value="manager">{dict.dashboard.roles?.manager || "Manager"}</SelectItem>}
                                            <SelectItem value="assistant_manager">{dict.dashboard.roles?.assistant_manager || "Assistant Manager"}</SelectItem>
                                            <SelectItem value="receptionist">{dict.dashboard.roles?.receptionist || "Receptionist"}</SelectItem>
                                        </>
                                    )}
                                </SelectContent>
                            </SelectContent>
                        </Select>
                        {fieldErrors.role && <p className="text-xs text-red-500 text-start">{fieldErrors.role}</p>}
                    </div>

                    {/* Branch Selection */}
                    <div className="grid gap-1.5">
                        <Label htmlFor="branch_id" className="text-start text-sm">{dict.dashboard.employees.branch}</Label>
                        {userRole !== 'owner' && userBranchId && (
                            <input type="hidden" name="branch_id" value={userBranchId.toString()} />
                        )}
                        <Select
                            name="branch_id"
                            defaultValue={userRole !== 'owner' && userBranchId ? userBranchId.toString() : employeeToEdit?.branch_id?.toString()}
                            dir={lang === 'ar' ? 'rtl' : 'ltr'}
                            disabled={userRole !== 'owner'}
                        >
                            <SelectTrigger className={`h-9 bg-transparent ${fieldErrors.branch_id ? "border-red-500" : ""}`}>
                                <SelectValue placeholder={dict.dashboard.employees.select_branch} />
                            </SelectTrigger>
                            <SelectContent className="bg-white text-slate-900 border-slate-200">
                                {branches.map(branch => (
                                    <SelectItem key={branch.id} value={branch.id.toString()}>
                                        {branch.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {fieldErrors.branch_id && <p className="text-xs text-red-500 text-start">{fieldErrors.branch_id}</p>}
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0 mt-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                            {dict.dashboard.common.cancel}
                        </Button>
                        <Button type="submit" size="sm" disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin rtl:ml-2 rtl:mr-0" />}
                            {employeeToEdit ? dict.dashboard.common.save : dict.dashboard.employees.add_employee}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog >
    )
}
