'use client'

import { useState, useTransition } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, User, Pencil, Trash2, Loader2, Search, ArrowLeft, ArrowRight, Shield } from 'lucide-react'
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useRouter } from 'next/navigation'
import { EmployeeFormDialog } from './employee-form-dialog'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { deleteEmployee } from './actions'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

// Type definition (should be shared or imported from DB types)
interface Profile {
    id: string
    full_name: string
    username: string | null
    role: 'owner' | 'manager' | 'assistant_manager' | 'receptionist'
    branch_id: number | null
    phone: string | null
    created_at: string
    branches?: { name: string } | null // Joined data
}

interface EmployeeListProps {
    initialEmployees: Profile[]
    totalEmployees: number
    branches: any[] // Branch list for the dialog
    dict: any
    lang: string
    userRole?: string
    userBranchId?: number | null
    userId?: string
}

export function EmployeeList({ initialEmployees, totalEmployees, branches, dict, lang, userRole, userBranchId, userId }: EmployeeListProps) {
    const [searchTerm, setSearchTerm] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 25
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingEmployee, setEditingEmployee] = useState<Profile | null>(null)
    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    // Default to user's branch if not owner
    const defaultBranch = userRole !== 'owner' && userBranchId ? userBranchId.toString() : 'all'
    const [selectedBranch, setSelectedBranch] = useState<string>(defaultBranch)

    const [selectedRole, setSelectedRole] = useState<string>('all')
    const router = useRouter()

    const employees = initialEmployees || []

    const filteredEmployees = employees.filter(emp => {
        const matchesSearch = emp.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (emp.username && emp.username.toLowerCase().includes(searchTerm.toLowerCase()))

        const matchesBranch = selectedBranch === 'all' || emp.branch_id?.toString() === selectedBranch
        const matchesRole = selectedRole === 'all' || emp.role === selectedRole

        return matchesSearch && matchesBranch && matchesRole
    })

    const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const paginatedEmployees = filteredEmployees.slice(startIndex, startIndex + itemsPerPage)

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value)
        setCurrentPage(1)
    }

    const handleAdd = () => {
        setEditingEmployee(null)
        setIsDialogOpen(true)
    }

    const handleEdit = (employee: Profile) => {
        setEditingEmployee(employee)
        setIsDialogOpen(true)
    }

    // Translation helper for roles
    const getRoleLabel = (role: string) => {
        const roles: Record<string, string> = {
            owner: dict.dashboard.roles.owner,
            manager: dict.dashboard.roles.manager,
            assistant_manager: dict.dashboard.roles.assistant_manager,
            receptionist: dict.dashboard.roles.receptionist
        }
        return roles[role] || role
    }

    const handleDelete = async () => {
        if (!deleteId) return
        setIsDeleting(true)
        const result = await deleteEmployee(deleteId)
        if (result.error) {
            console.error(result.error)
        }
        setDeleteId(null)
        setIsDeleting(false)
        router.refresh()
    }

    const formatDate = (dateString: string) => {
        if (!dateString) return '-'
        return new Date(dateString).toLocaleDateString('en-GB')
    }

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'owner': return 'bg-purple-100 text-purple-800'
            case 'manager': return 'bg-blue-100 text-blue-800'
            case 'assistant_manager': return 'bg-sky-100 text-sky-800'
            case 'receptionist': return 'bg-green-100 text-green-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{dict.dashboard.employees.title}</h1>
                    <p className="text-slate-500">{dict.dashboard.employees.description}</p>
                </div>

                <Card className="min-w-[200px] shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {dict.dashboard.employees.total_employees}
                        </CardTitle>
                        <User className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{filteredEmployees.length}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Controls Section: Search & Filters & Add Button */}
            <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground rtl:right-2.5 rtl:left-auto" />
                    <Input
                        type="search"
                        placeholder={dict.dashboard.employees.search_placeholder}
                        className="pl-8 rtl:pr-8 rtl:pl-3"
                        value={searchTerm}
                        onChange={handleSearch}
                    />
                </div>

                <div className="flex flex-1 w-full md:w-auto gap-2 overflow-x-auto pb-2 md:pb-0">
                    <Select
                        value={selectedBranch}
                        onValueChange={setSelectedBranch}
                        dir={lang === 'ar' ? 'rtl' : 'ltr'}
                        disabled={userRole !== 'owner'}
                    >
                        <SelectTrigger className="w-[180px] bg-white h-9">
                            <SelectValue placeholder={dict.dashboard.employees.select_branch} />
                        </SelectTrigger>
                        <SelectContent className="bg-white text-slate-900 border-slate-200">
                            <SelectItem value="all">{dict.dashboard.employees.all_branches}</SelectItem>
                            {branches.map(branch => (
                                <SelectItem key={branch.id} value={branch.id.toString()}>
                                    {branch.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={selectedRole} onValueChange={setSelectedRole} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                        <SelectTrigger className="w-[150px] bg-white h-9">
                            <SelectValue placeholder={dict.dashboard.employees.select_role} />
                        </SelectTrigger>
                        <SelectContent className="bg-white text-slate-900 border-slate-200">
                            <SelectItem value="all">{dict.dashboard.employees.all_roles}</SelectItem>
                            <SelectItem value="manager">{dict.dashboard.roles.manager}</SelectItem>
                            <SelectItem value="assistant_manager">{dict.dashboard.roles.assistant_manager}</SelectItem>
                            <SelectItem value="receptionist">{dict.dashboard.roles.receptionist}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex bg-white gap-2 md:ml-auto rtl:md:mr-auto rtl:md:ml-0">
                    {(userRole === 'owner' || userRole === 'manager') && (
                        <Button onClick={handleAdd}>
                            <Plus className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
                            {dict.dashboard.employees.add_employee}
                        </Button>
                    )}
                </div>
            </div>

            <div className="rounded-md border bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="text-start">{dict.dashboard.employees.name}</TableHead>
                            <TableHead className="text-start">{dict.dashboard.employees.username}</TableHead>
                            <TableHead className="text-start">{dict.dashboard.employees.phone}</TableHead>
                            <TableHead className="text-center">{dict.dashboard.employees.role}</TableHead>
                            <TableHead className="text-start">{dict.dashboard.employees.branch}</TableHead>
                            <TableHead className="text-start">{dict.dashboard.employees.joining_date}</TableHead>
                            <TableHead className="text-end">{dict.dashboard.common.actions}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedEmployees.length > 0 ? (
                            paginatedEmployees.map((emp) => (
                                <TableRow key={emp.id}>
                                    <TableCell className="font-medium">
                                        {emp.full_name}
                                    </TableCell>
                                    <TableCell>{emp.username || '-'}</TableCell>
                                    <TableCell>
                                        <span dir="ltr">{emp.phone || '-'}</span>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="secondary" className={getRoleColor(emp.role)}>
                                            {getRoleLabel(emp.role)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{emp.branches?.name || '-'}</TableCell>
                                    <TableCell className="font-sans">
                                        {formatDate(emp.created_at)}
                                    </TableCell>
                                    <TableCell className="text-end">
                                        {(userRole === 'owner' || userRole === 'manager') && (
                                            <div className="flex justify-end gap-2">
                                                {/* Prevent editing Owner unless you are the Owner yourself (handled in backend, UI safe guard can be added) */}
                                                <Button variant="ghost" size="icon" onClick={() => handleEdit(emp)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                {emp.id !== userId && (
                                                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setDeleteId(emp.id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    {dict.dashboard.employees.no_employees_found}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-end space-x-2 rtl:space-x-reverse py-4">
                    {/* Pagination Controls Reuse */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                    >
                        {lang === 'ar' ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                    >
                        {lang === 'ar' ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                    </Button>
                </div>
            )}

            <EmployeeFormDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                employeeToEdit={editingEmployee}
                branches={branches}
                dict={dict}
                lang={lang}
                userRole={userRole}
                userBranchId={userBranchId}
            />

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent className="bg-white text-slate-900" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{dict.dashboard.common.delete || "Delete"}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {dict.dashboard.common.confirm_delete || "Are you sure you want to delete this employee?"}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className={lang === 'ar' ? "gap-2 sm:justify-end" : "gap-2"}>
                        <AlertDialogCancel disabled={isDeleting} className="mt-0">{dict.dashboard.common.cancel}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault()
                                handleDelete()
                            }}
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                            disabled={isDeleting}
                        >
                            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : dict.dashboard.common.delete}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
