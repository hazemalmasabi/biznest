"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { BookOpen, Key, LayoutDashboard, Shield, User, HelpCircle, Check, X } from "lucide-react"

interface HelpContentProps {
    dict: any
    lang: string
}

export function HelpContent({ dict, lang }: HelpContentProps) {
    const isRtl = lang === 'ar'

    const sections = [
        {
            key: 'getting_started',
            icon: Key,
            title: dict.help.getting_started.title,
            items: [
                dict.help.getting_started.registration,
                dict.help.getting_started.login,
                dict.help.getting_started.forgot_password,
            ]
        },
        {
            key: 'dashboard',
            icon: LayoutDashboard,
            title: dict.help.dashboard.title,
            items: [
                dict.help.dashboard.bookings,
                dict.help.dashboard.services,
                dict.help.dashboard.employees,
                dict.help.dashboard.customers,
                dict.help.dashboard.branches,
                dict.help.dashboard.vouchers,
            ]
        },
        {
            key: 'roles',
            icon: Shield,
            title: dict.help.roles.title,
            description: dict.help.roles.description,
            note: dict.help.roles.note,
            table: dict.help.roles.table // Use table data
        }
    ]

    return (
        <div className="space-y-6 animate-in fade-in-50 duration-500">
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-primary/10 rounded-xl text-primary">
                    <HelpCircle className="w-8 h-8" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">{dict.help.title}</h1>
                    <p className="text-muted-foreground mt-1">{dict.help.description}</p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {sections.map((section: any) => (
                    <Card key={section.key} className={`h-full border-2 hover:border-primary/20 transition-all duration-300 ${section.key === 'roles' ? 'md:col-span-2' : ''}`}>
                        <CardHeader>
                            <div className="flex items-center gap-2 mb-2">
                                <section.icon className="w-5 h-5 text-primary" />
                                <CardTitle className="text-lg">{section.title}</CardTitle>
                            </div>
                            {section.description && <CardDescription>{section.description}</CardDescription>}
                        </CardHeader>
                        <CardContent>
                            {section.table ? (
                                <div className="space-y-4">
                                    {section.note && (
                                        <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg border mb-4">
                                            {section.note}
                                        </div>
                                    )}

                                    <Accordion type="single" collapsible className="w-full">
                                        <AccordionItem value="permissions-table" className="border-b-0">
                                            <AccordionTrigger className="hover:text-primary hover:no-underline py-3 px-1 rounded-md hover:bg-slate-50">
                                                {isRtl ? "عرض جدول الصلاحيات" : "View Permissions Matrix"}
                                            </AccordionTrigger>
                                            <AccordionContent>
                                                <div className="rounded-md border mt-2">
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow className="bg-muted/50">
                                                                {section.table.headers.map((header: string, i: number) => (
                                                                    <TableHead key={i} className={`font-bold ${i === 0 ? 'w-[40%]' : 'text-center'}`}>
                                                                        {header}
                                                                    </TableHead>
                                                                ))}
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {section.table.rows.map((row: any, i: number) => (
                                                                <TableRow key={i}>
                                                                    <TableCell className="font-medium">{row.feature}</TableCell>
                                                                    {row.values.map((val: boolean, j: number) => (
                                                                        <TableCell key={j} className="text-center">
                                                                            {val ? (
                                                                                <div className="flex justify-center">
                                                                                    <Check className="w-5 h-5 text-green-500" />
                                                                                </div>
                                                                            ) : (
                                                                                <div className="flex justify-center">
                                                                                    <X className="w-5 h-5 text-red-500" />
                                                                                </div>
                                                                            )}
                                                                        </TableCell>
                                                                    ))}
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>
                                </div>
                            ) : (
                                <Accordion type="single" collapsible className="w-full">
                                    {section.items.map((item: any, index: number) => (
                                        <AccordionItem key={index} value={`item-${index}`} className="border-b-0">
                                            <AccordionTrigger className="hover:text-primary hover:no-underline py-3 px-1 rounded-md hover:bg-slate-50">
                                                {item.title}
                                            </AccordionTrigger>
                                            <AccordionContent className="text-muted-foreground leading-relaxed px-1 whitespace-pre-line">
                                                {item.content}
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
