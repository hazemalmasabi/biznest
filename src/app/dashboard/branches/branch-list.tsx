'use client'

import { useState, useTransition } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Star, Pencil, Trash2, Loader2, Search, ArrowLeft, ArrowRight, Building2 } from 'lucide-react'
import { Branch, deleteBranch } from './actions'
import { BranchFormDialog } from './branch-form-dialog'
import { Input } from "@/components/ui/input"
import { useRouter } from 'next/navigation'
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

type BranchListProps = {
    initialBranches: Branch[]
    totalBranches: number
    dict: any
    lang: string
    userRole?: string
}

export function BranchList({ initialBranches, totalBranches, dict, lang, userRole }: BranchListProps) {
    // REFACTOR: Removed local 'branches' state. 
    // We use initialBranches directly so that when the server revalidates and passes new props, 
    // the UI updates immediately.
    const [searchTerm, setSearchTerm] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 25

    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingBranch, setEditingBranch] = useState<Branch | null>(null)
    const [deleteId, setDeleteId] = useState<number | null>(null)
    const [isDeleting, startDeleteTransition] = useTransition()
    const router = useRouter()

    // Filter branches based on search term
    const filteredBranches = initialBranches.filter(branch =>
        branch.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Pagination logic
    const totalPages = Math.ceil(filteredBranches.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const paginatedBranches = filteredBranches.slice(startIndex, startIndex + itemsPerPage)

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value)
        setCurrentPage(1) // Reset to first page on search
    }

    const goToPreviousPage = () => {
        setCurrentPage(prev => Math.max(prev - 1, 1))
    }

    const goToNextPage = () => {
        setCurrentPage(prev => Math.min(prev + 1, totalPages))
    }

    const handleAdd = () => {
        setEditingBranch(null)
        setIsDialogOpen(true)
    }

    const handleEdit = (branch: Branch) => {
        setEditingBranch(branch)
        setIsDialogOpen(true)
    }

    const handleDelete = async () => {
        if (deleteId) {
            const branchToDelete = filteredBranches.find(b => b.id === deleteId)
            if (branchToDelete?.is_main) {
                alert(lang === 'ar' ? 'لا يمكن حذف الفرع الرئيسي' : 'Cannot delete the main branch')
                setDeleteId(null)
                return
            }

            startDeleteTransition(async () => {
                const result = await deleteBranch(deleteId)
                if (result?.error) {
                    alert(lang === 'ar' ? `خطأ في الحذف: ${result.error}` : `Error deleting: ${result.error}`)
                } else {
                    router.refresh()
                }
                setDeleteId(null)
            })
        }
    }

    const formatDate = (dateString: string) => {
        if (!dateString) return '-'
        // Force English numbers and ISO-like format or strictly EN locale
        const d = new Date(dateString)
        const day = d.getDate().toString().padStart(2, '0')
        const month = (d.getMonth() + 1).toString().padStart(2, '0')
        const year = d.getFullYear()
        return `${day}/${month}/${year}`
    }

    return (
        <div className="space-y-6">
            {/* Header Section: Title/Desc on Start, Stats Card on End */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{dict.dashboard.branches.title}</h1>
                    <p className="text-slate-500">{dict.dashboard.branches.description}</p>
                </div>

                <Card className="min-w-[200px] shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {dict.dashboard.branches.title}
                        </CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalBranches}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Controls Section: Search & Add Button */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground rtl:right-2.5 rtl:left-auto" />
                    <Input
                        type="search"
                        placeholder={dict.dashboard.branches.search_placeholder || (lang === 'ar' ? 'بحث عن فرع...' : "Search branches...")}
                        className="pl-8 rtl:pr-8 rtl:pl-3"
                        value={searchTerm}
                        onChange={handleSearch}
                    />
                </div>
                {userRole === 'owner' && (
                    <Button onClick={handleAdd}>
                        <Plus className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
                        {dict.dashboard.branches.add_branch}
                    </Button>
                )}
            </div>

            {/* Table Section */}
            <div className="rounded-md border bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]"></TableHead>
                            <TableHead className="text-start">{dict.dashboard.branches.name}</TableHead>
                            <TableHead className="text-start">{lang === 'ar' ? 'الرابط المختصر' : 'Slug'}</TableHead>
                            <TableHead className="text-start">{dict.dashboard.branches.address}</TableHead>
                            <TableHead className="text-start w-[150px]">{dict.dashboard.branches.phone}</TableHead>
                            <TableHead className="text-center w-[100px]">{dict.dashboard.branches.is_main}</TableHead>
                            <TableHead className="text-start w-[150px] whitespace-nowrap">{dict.dashboard.branches.created_at}</TableHead>
                            <TableHead className="text-end w-[100px]">{dict.dashboard.common.actions}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedBranches.length > 0 ? (
                            paginatedBranches.map((branch) => (
                                <TableRow key={branch.id}>
                                    <TableCell>
                                        <div className="h-10 w-10 rounded-md overflow-hidden bg-slate-100 flex items-center justify-center border border-slate-200">
                                            {(branch as any).image_url ? (
                                                <img src={(branch as any).image_url} alt={branch.name} className="h-full w-full object-cover" />
                                            ) : (
                                                <Building2 className="h-5 w-5 text-slate-400" />
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-medium">{branch.name}</TableCell>
                                    <TableCell className="text-muted-foreground">{branch.slug || '-'}</TableCell>
                                    <TableCell>{branch.address || '-'}</TableCell>
                                    <TableCell className="text-start">
                                        {/* Force LTR direction for phone numbers to display correctly + digits in English */}
                                        <span dir="ltr">{branch.phone}</span>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {branch.is_main && (
                                            <Star className="h-4 w-4 text-yellow-500 fill-current mx-auto" />
                                        )}
                                    </TableCell>
                                    {/* Date Column: Forced English Numerals */}
                                    <TableCell className="text-start font-sans whitespace-nowrap">
                                        {formatDate(branch.created_at)}
                                    </TableCell>
                                    <TableCell className="text-end">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(branch)}>
                                                <Pencil className="h-4 w-4" />
                                                <span className="sr-only">{dict.dashboard.common.edit}</span>
                                            </Button>
                                            {userRole === 'owner' && (
                                                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setDeleteId(branch.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                    <span className="sr-only">{dict.dashboard.common.delete}</span>
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={8} className="h-24 text-center">
                                    {dict.dashboard.branches.no_branches_found || (lang === 'ar' ? 'لا توجد فروع' : 'No branches found.')}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-end space-x-2 rtl:space-x-reverse py-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={goToPreviousPage}
                        disabled={currentPage === 1}
                    >
                        {lang === 'ar' ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}

                    </Button>
                    <div className="text-sm text-muted-foreground">
                        {lang === 'ar'
                            ? `صفحة ${currentPage} من ${totalPages}`
                            : `Page ${currentPage} of ${totalPages}`
                        }
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={goToNextPage}
                        disabled={currentPage === totalPages}
                    >
                        {lang === 'ar' ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                    </Button>
                </div>
            )}

            <BranchFormDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                branchToEdit={editingBranch}
                dict={dict}
                lang={lang}
                userRole={userRole}
            />

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent className="bg-white text-slate-900" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{dict.dashboard.branches.delete_branch}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {dict.dashboard.branches.confirm_delete}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className={lang === 'ar' ? "sm:justify-start gap-2" : "gap-2"}>
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
