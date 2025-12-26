'use client'

import { useState, useTransition, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, User, Pencil, Trash2, Loader2, Search, ArrowLeft, ArrowRight } from 'lucide-react'
import { Input } from "@/components/ui/input"
import { useRouter } from 'next/navigation'
import { CustomerDialog } from './customer-dialog'
import { CustomerBookingsDialog } from './customer-bookings-dialog'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { deleteCustomer, Customer } from './actions'
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

interface CustomerListProps {
    initialCustomers: Customer[]
    dict: any
    lang: string
    userRole?: string
}

export function CustomerList({ initialCustomers, dict, lang, userRole }: CustomerListProps) {
    const router = useRouter() // For refresh

    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
    const [deleteId, setDeleteId] = useState<number | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null)
    const [isHistoryOpen, setIsHistoryOpen] = useState(false)

    // Client-side state
    const [searchTerm, setSearchTerm] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 25

    // Filter customers based on search
    const filteredCustomers = initialCustomers.filter(customer => {
        const matchesSearch =
            customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            customer.phone.includes(searchTerm)
        return matchesSearch
    })

    // Calculate pagination
    const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const paginatedCustomers = filteredCustomers.slice(startIndex, startIndex + itemsPerPage)

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value)
        setCurrentPage(1) // Reset to page 1 on search change
    }

    const handleAdd = () => {
        setEditingCustomer(null)
        setIsDialogOpen(true)
    }

    const handleEdit = (customer: Customer) => {
        setEditingCustomer(customer)
        setIsDialogOpen(true)
    }

    const handleDelete = async () => {
        if (!deleteId) return
        setIsDeleting(true)
        const result = await deleteCustomer(deleteId)
        if ('message' in result && result.message) {
            console.error(result.message)
        }
        setDeleteId(null)
        setIsDeleting(false)
        router.refresh()
    }

    const formatDate = (dateString: string | undefined | null) => {
        if (!dateString) return '-'
        return new Date(dateString).toLocaleDateString('en-GB')
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{dict.dashboard.customers.title}</h1>
                    <p className="text-slate-500">{dict.dashboard.customers.description}</p>
                </div>

                <Card className="min-w-[200px] shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {dict.dashboard.customers.total_customers}
                        </CardTitle>
                        <User className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{filteredCustomers.length}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Controls Section: Search & Add Button */}
            <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground rtl:right-2.5 rtl:left-auto" />
                    <Input
                        type="search"
                        placeholder={dict.dashboard.customers.search_placeholder}
                        className="pl-8 rtl:pr-8 rtl:pl-3"
                        value={searchTerm}
                        onChange={handleSearch}
                    />
                </div>

                <div className="flex bg-white gap-2 md:ml-auto rtl:md:mr-auto rtl:md:ml-0">
                    <Button onClick={handleAdd}>
                        <Plus className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
                        {dict.dashboard.customers.add_customer}
                    </Button>
                </div>
            </div>

            <div className="rounded-md border bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="text-start">{dict.dashboard.customers.name_label}</TableHead>
                            <TableHead className="text-start">{dict.dashboard.customers.phone_label}</TableHead>
                            <TableHead className="text-start">{dict.dashboard.customers.email_label}</TableHead>
                            <TableHead className="text-center">{dict.dashboard.customers.gender_label}</TableHead>
                            <TableHead className="text-center">{dict.dashboard.customers.gender_label}</TableHead>
                            <TableHead className="text-center">{dict.dashboard.customers.dob_label}</TableHead>
                            <TableHead className="text-center">{dict.dashboard.customers.bookings_label || (lang === 'ar' ? "الحجوزات" : "Bookings")}</TableHead>
                            <TableHead className="text-end">{dict.dashboard.common.actions}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedCustomers.length > 0 ? (
                            paginatedCustomers.map((customer) => (
                                <TableRow key={customer.id}>
                                    <TableCell className="font-medium">
                                        {customer.name}
                                    </TableCell>
                                    <TableCell>
                                        <span dir="ltr">{customer.phone}</span>
                                    </TableCell>
                                    <TableCell>{customer.email || '-'}</TableCell>
                                    <TableCell className="text-center">
                                        {customer.gender === 'male' ? dict.dashboard.customers.gender_male :
                                            customer.gender === 'female' ? dict.dashboard.customers.gender_female : '-'}
                                    </TableCell>
                                    <TableCell className="text-center font-sans">
                                        {customer.date_of_birth || '-'}
                                    </TableCell>
                                    <TableCell className="text-center font-sans">
                                        {customer.date_of_birth || '-'}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <span className="font-bold text-lg">{customer.bookings_count || 0}</span>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-7 text-xs"
                                                onClick={() => {
                                                    setHistoryCustomer(customer)
                                                    setIsHistoryOpen(true)
                                                }}
                                            >
                                                {dict.dashboard.common.view || (lang === 'ar' ? "عرض" : "View")}
                                            </Button>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-end">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(customer)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            {(userRole === 'owner' || userRole === 'manager') && (
                                                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setDeleteId(customer.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    {dict.dashboard.customers.no_customers_found}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-end space-x-2 rtl:space-x-reverse py-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                    >
                        {lang === 'ar' ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
                    </Button>
                    <span className="text-sm text-slate-600 mx-2">
                        {currentPage} / {totalPages}
                    </span>
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

            <CustomerDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                customer={editingCustomer}
                dict={dict}
                lang={lang}
            />

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent className="bg-white text-slate-900" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{dict.dashboard.customers.delete_customer}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {dict.dashboard.customers.delete_confirmation}
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

            {historyCustomer && (
                <CustomerBookingsDialog
                    open={isHistoryOpen}
                    onOpenChange={setIsHistoryOpen}
                    customerId={historyCustomer.id}
                    customerName={historyCustomer.name}
                    lang={lang}
                    dict={dict}
                />
            )}
        </div>
    )
}
