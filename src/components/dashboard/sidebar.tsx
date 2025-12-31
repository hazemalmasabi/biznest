'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Store, Users, User, Settings, LogOut, ChevronLeft, ChevronRight, Globe, Package, Calendar, FileText, Building2, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LanguageSwitcher } from '@/components/language-switcher'
import { createClient } from '@/lib/supabase/client'

type SidebarProps = {
    dict: any
    lang: string
    role?: string
}

export function Sidebar({ dict, lang, role }: SidebarProps) {
    const [collapsed, setCollapsed] = useState(false)
    const pathname = usePathname()
    const supabase = createClient()

    const allNavItems = [
        { href: '/dashboard', label: dict?.dashboard?.nav?.dashboard || "Dashboard", icon: LayoutDashboard },
        { href: '/dashboard/bookings', label: dict?.dashboard?.nav?.bookings || "Bookings", icon: Calendar },
        { href: '/dashboard/vouchers', label: dict?.dashboard?.vouchers?.title || "Vouchers", icon: FileText },
        { href: '/dashboard/customers', label: dict?.dashboard?.nav?.customers || "Customers", icon: User },
        { href: '/dashboard/services', label: dict?.dashboard?.nav?.services || "Services", icon: Package },
        { href: '/dashboard/employees', label: dict?.dashboard?.nav?.employees || "Employees", icon: Users },
        { href: '/dashboard/branches', label: dict?.dashboard?.nav?.branches || "Branches", icon: Store },
        { href: '/dashboard/settings', label: dict?.dashboard?.nav?.settings || "Settings", icon: Settings },
        { href: '/dashboard/help', label: dict?.help?.title || "Help", icon: HelpCircle },
    ]

    const navItems = allNavItems.filter(item => item.href !== '/dashboard/branches' || role === 'owner')

    const handleLogout = async () => {
        await supabase.auth.signOut()
        window.location.href = '/'
    }

    return (
        <aside
            className={cn(
                "h-screen bg-slate-900 text-white transition-all duration-300 relative flex flex-col",
                collapsed ? "w-16" : "w-64"
            )}
        >
            {/* Collapse Toggle */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="absolute top-4 -right-3 w-6 h-6 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700 text-slate-400 hover:text-white rtl:right-auto rtl:-left-3 rtl:rotate-180 z-20"
            >
                {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>

            {/* Logo area */}
            <div className={cn("p-4 flex items-center h-16 border-b border-slate-800", collapsed ? "justify-center" : "")}>
                {collapsed ? (
                    <div className="flex items-center justify-center">
                        <Building2 className="w-8 h-8 text-blue-500" />
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <Building2 className="w-6 h-6 text-blue-500" />
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">BizNest</span>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4 space-y-1 px-2">
                {navItems.map((item) => {
                    const isActive = pathname === item.href
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center px-3 py-2 rounded-lg transition-colors group relative",
                                isActive
                                    ? "bg-blue-600/10 text-blue-400"
                                    : "text-slate-400 hover:bg-slate-800 hover:text-white",
                                collapsed ? "justify-center" : ""
                            )}
                        >
                            <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive ? "text-blue-400" : "text-slate-400 group-hover:text-white")} />
                            {!collapsed && <span className="ms-3">{item.label}</span>}

                            {/* Tooltip for collapsed state */}
                            {collapsed && (
                                <div className="absolute start-14 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                                    {item.label}
                                </div>
                            )}
                        </Link>
                    )
                })}
            </nav>

            {/* Footer Actions */}
            <div className="p-4 border-t border-slate-800 space-y-2">
                {/* Language Switcher - Simplified for Sidebar */}
                <div className={cn("flex items-center", collapsed ? "justify-center" : "justify-between")}>
                    {!collapsed && (
                        <span className={cn(
                            "text-slate-500 uppercase tracking-wider",
                            lang === 'ar' ? "text-sm font-bold" : "text-xs"
                        )}>
                            {dict?.common?.language || "Language"}
                        </span>
                    )}
                    {/* We reuse the switcher but might need styling adjustments. For now custom implementation or just component */}
                    <div className={cn(collapsed ? "w-full flex justify-center" : "")}>
                        <LanguageSwitcher />
                    </div>
                </div>

                <div className="pt-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                            "w-full text-red-400 hover:text-red-300 hover:bg-red-900/20",
                            collapsed ? "p-0 justify-center" : "justify-start"
                        )}
                        onClick={handleLogout}
                    >
                        <LogOut className="w-4 h-4" />
                        {!collapsed && <span className="ms-2">{dict?.dashboard?.nav?.logout || "Logout"}</span>}
                    </Button>
                </div>
            </div>
        </aside>
    )
}
