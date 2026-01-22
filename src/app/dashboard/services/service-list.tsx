'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Search, Pencil, Trash2, Loader2, Package, ArrowLeft, ArrowRight } from 'lucide-react'
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
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
import { ServiceDialog } from './service-dialog'
import { deleteService } from './actions'
import { useRouter } from 'next/navigation'
import { Badge } from "@/components/ui/badge"

interface Service {
    id: number
    branch_id: number
    name: string
    price: number
    duration: 'hour' | 'day' | 'open'
    created_at: string
    status: 'active' | 'maintenance' | 'closed'
    image_url?: string | null
    description?: string | null
    branches?: { name: string } | { name: string }[] | null
}

interface ServiceListProps {
    initialServices: Service[]
    branches: any[]
    dict: any
    lang: string
    userRole?: string
    userBranchId?: number | null
}

export function ServiceList({ initialServices, branches, dict, lang, userRole, userBranchId }: ServiceListProps) {
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedBranch, setSelectedBranch] = useState<string>(userRole !== 'owner' && userBranchId ? userBranchId.toString() : 'all')
    const [selectedStatus, setSelectedStatus] = useState<string>('all')
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 25
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingService, setEditingService] = useState<Service | null>(null)
    const [deleteId, setDeleteId] = useState<number | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const router = useRouter()

    const services = initialServices || []

    const filteredServices = services.filter(service => {
        const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesBranch = selectedBranch === 'all' || service.branch_id.toString() === selectedBranch
        const matchesStatus = selectedStatus === 'all' || service.status === selectedStatus
        return matchesSearch && matchesBranch && matchesStatus
    })

    const totalPages = Math.ceil(filteredServices.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const paginatedServices = filteredServices.slice(startIndex, startIndex + itemsPerPage)

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value)
        setCurrentPage(1)
    }

    const handleBranchChange = (value: string) => {
        setSelectedBranch(value)
        setCurrentPage(1)
    }

    const handleStatusChange = (value: string) => {
        setSelectedStatus(value)
        setCurrentPage(1)
    }

    const handleAdd = () => {
        setEditingService(null)
        setIsDialogOpen(true)
    }

    const handleEdit = (service: Service) => {
        setEditingService(service)
        setIsDialogOpen(true)
    }

    const handleDelete = async () => {
        if (!deleteId) return
        setIsDeleting(true)
        try {
            await deleteService(deleteId)
            router.refresh()
            setDeleteId(null)
        } catch (error) {
            console.error('Failed to delete', error)
        } finally {
            setIsDeleting(false)
        }
    }

    const getDurationLabel = (duration: string) => {
        switch (duration) {
            case 'hour': return dict.dashboard?.services?.duration_hour
            case 'day': return dict.dashboard?.services?.duration_day
            case 'open': return dict.dashboard?.services?.duration_open
            default: return duration
        }
    }

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'active': return dict.dashboard?.services?.status_active
            case 'maintenance': return dict.dashboard?.services?.status_maintenance
            case 'closed': return dict.dashboard?.services?.status_closed
            default: return status
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return "bg-green-100 text-green-700 hover:bg-green-100/80 border-transparent"
            case 'maintenance': return "bg-yellow-100 text-yellow-700 hover:bg-yellow-100/80 border-transparent"
            case 'closed': return "bg-red-100 text-red-700 hover:bg-red-100/80 border-transparent"
            default: return "bg-gray-100 text-gray-700 hover:bg-gray-100/80 border-transparent"
        }
    }

    const getBranchName = (service: Service) => {
        if (Array.isArray(service.branches)) {
            return service.branches[0]?.name
        }
        return (service.branches as any)?.name
    }

    const formatDate = (dateString: string) => {
        if (!dateString) return '-'
        return new Date(dateString).toLocaleDateString('en-GB')
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{dict.dashboard?.services?.title}</h1>
                    <p className="text-muted-foreground">{dict.dashboard?.services?.description}</p>
                </div>

                <Card className="min-w-[200px] shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {dict.dashboard?.services?.total_services}
                        </CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{filteredServices.length}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Controls Section: Search & Filters & Add Button */}
            <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground rtl:right-2.5 rtl:left-auto" />
                    <Input
                        placeholder={dict.dashboard?.services?.search_placeholder}
                        className="pl-8 rtl:pr-8 rtl:pl-3"
                        value={searchTerm}
                        onChange={handleSearch}
                    />
                </div>

                <div className="flex flex-1 w-full md:w-auto gap-2 overflow-x-auto pb-2 md:pb-0">
                    <Select
                        value={selectedBranch}
                        onValueChange={handleBranchChange}
                        dir={lang === 'ar' ? 'rtl' : 'ltr'}
                        disabled={userRole !== 'owner'}
                    >
                        <SelectTrigger className="w-[180px] bg-white h-9">
                            <SelectValue placeholder={dict.dashboard?.services?.select_branch} />
                        </SelectTrigger>
                        <SelectContent className="bg-white text-slate-900 border-slate-200">
                            {userRole === 'owner' && <SelectItem value="all">{dict.dashboard?.employees?.all_branches || 'All Branches'}</SelectItem>}
                            {branches.map((branch) => (
                                <SelectItem key={branch.id} value={branch.id.toString()}>
                                    {branch.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={selectedStatus} onValueChange={handleStatusChange} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                        <SelectTrigger className="w-[180px] bg-white h-9">
                            <SelectValue placeholder={dict.dashboard?.services?.select_status} />
                        </SelectTrigger>
                        <SelectContent className="bg-white text-slate-900 border-slate-200">
                            <SelectItem value="all">{dict.dashboard?.services?.all_statuses || 'All Statuses'}</SelectItem>
                            <SelectItem value="active">{dict.dashboard?.services?.status_active}</SelectItem>
                            <SelectItem value="maintenance">{dict.dashboard?.services?.status_maintenance}</SelectItem>
                            <SelectItem value="closed">{dict.dashboard?.services?.status_closed}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex bg-white gap-2 md:ml-auto rtl:md:mr-auto rtl:md:ml-0">
                    {(userRole === 'owner' || userRole === 'manager') && (
                        <Button onClick={handleAdd}>
                            <Plus className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
                            {dict.dashboard?.services?.add_service}
                        </Button>
                    )}
                </div>
            </div>

            <div className="rounded-md border bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="text-start w-[100px]">{dict.dashboard?.services?.image_label || "صورة الخدمة"}</TableHead>
                            <TableHead className="text-start">{dict.dashboard?.services?.name_label}</TableHead>
                            <TableHead className="text-center">{dict.dashboard?.services?.status_label}</TableHead>
                            <TableHead className="text-start">{dict.dashboard?.services?.branch_label}</TableHead>
                            <TableHead className="text-start">{dict.dashboard?.services?.price_label}</TableHead>
                            <TableHead className="text-center">{dict.dashboard?.services?.duration_label}</TableHead>
                            <TableHead className="text-start">{dict.dashboard?.services?.created_at || "تاريخ الإنشاء"}</TableHead>
                            <TableHead className="text-end">{dict.dashboard?.common?.actions}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedServices.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                                    {dict.dashboard?.services?.no_services_found}
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedServices.map((service) => (
                                <TableRow key={service.id} className="hover:bg-slate-50/50">
                                    <TableCell>
                                        <div className="h-14 w-14 rounded-md overflow-hidden bg-slate-100 flex items-center justify-center border border-slate-200">
                                            {service.image_url ? (
                                                <img
                                                    src={service.image_url}
                                                    alt={service.name}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <Package className="h-5 w-5 text-slate-400" />
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-medium">{service.name}</TableCell>
                                    <TableCell className="text-center">
                                        <Badge className={cn("px-2 py-0.5", getStatusColor(service.status))} variant="secondary">
                                            {getStatusLabel(service.status)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-muted-foreground">
                                            {getBranchName(service)}
                                        </span>
                                    </TableCell>
                                    <TableCell>{service.price}</TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="secondary" className="font-normal">
                                            {getDurationLabel(service.duration)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground font-sans text-xs">
                                        {formatDate(service.created_at)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            {(userRole === 'owner' || userRole === 'manager' || userRole === 'assistant_manager') && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                    onClick={() => handleEdit(service)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {(userRole === 'owner' || userRole === 'manager') && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    onClick={() => setDeleteId(service.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
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

            <ServiceDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                service={editingService}
                branches={branches}
                dict={dict}
                userRole={userRole}
                userBranchId={userBranchId}
            />

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent className="bg-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>{dict.dashboard?.common?.confirm_delete}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {dict.dashboard?.services?.delete_confirmation}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{dict.dashboard?.common?.cancel}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={isDeleting}
                        >
                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {dict.dashboard?.common?.delete}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
