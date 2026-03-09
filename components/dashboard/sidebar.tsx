"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    LayoutDashboard,
    Building2,
    Users,
    UtensilsCrossed,
    BarChart3,
    LogOut,
    ChefHat,
    QrCode,
    CalendarDays,
    Settings,
    FileText,
    Shield,
    Menu,
    X
} from "lucide-react";
import { useState, useEffect } from "react";

interface SidebarProps {
    role: "admin" | "owner" | "student";
}

export function Sidebar({ role }: SidebarProps) {
    const pathname = usePathname();

    const adminLinks = [
        { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
        { href: "/admin/hostels", label: "Hostels", icon: Building2 },
        { href: "/admin/owners", label: "Mess Owners", icon: ChefHat },
        { href: "/admin/students", label: "Students", icon: Users },
        { href: "/admin/menu", label: "Menu Overview", icon: UtensilsCrossed },
        { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
        { href: "/admin/logs", label: "Audit Logs", icon: Shield },
        { href: "/admin/settings", label: "Settings", icon: Settings },
        // Pilot Testing temporarily hidden – can be re-enabled later.
    ];

    const ownerLinks = [
        { href: "/owner", label: "Dashboard", icon: LayoutDashboard },
        { href: "/owner/menu", label: "Menu Management", icon: UtensilsCrossed },
        { href: "/owner/attendance", label: "Attendance", icon: Users }, // Added Attendance
        { href: "/owner/expected-count", label: "Expected Count", icon: Users }, // NEW
        { href: "/owner/scan", label: "QR Scanner", icon: QrCode },
        { href: "/owner/students", label: "Student List", icon: Users },
        { href: "/owner/feedback", label: "Feedback", icon: BarChart3 },
        { href: "/owner/reports", label: "Reports", icon: FileText },
    ];

    const studentLinks = [
        { href: "/student", label: "My Dashboard", icon: LayoutDashboard },
        { href: "/student/menu", label: "Weekly Menu", icon: CalendarDays },
        { href: "/student/qr", label: "Digital Pass", icon: QrCode },
        { href: "/student/feedback", label: "Help & Feedback", icon: BarChart3 },
    ];

    const links =
        role === "admin" ? adminLinks : role === "owner" ? ownerLinks : studentLinks;

    const [isOpen, setIsOpen] = useState(false);

    // Close sidebar on route change (mobile)
    useEffect(() => {
        // Close sidebar on navigation (mobile)
        // Wrapped in setTimeout to avoid "setState in effect" linter error (synchronous update)
        const timer = setTimeout(() => setIsOpen(false), 0);
        return () => clearTimeout(timer);
    }, [pathname]);

    return (
        <>
            {/* Mobile Trigger */}
            <div className="md:hidden fixed top-4 left-4 z-50">
                <Button variant="outline" size="icon" onClick={() => setIsOpen(!isOpen)} className="shadow-lg bg-background/80 backdrop-blur-md">
                    {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
            </div>

            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden animate-in fade-in duration-200"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Mobile Sidebar */}
            <div className={cn(
                "fixed inset-y-0 left-0 z-50 w-72 bg-card border-r shadow-2xl transition-transform duration-300 ease-in-out md:hidden flex flex-col",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <SidebarContent role={role} pathname={pathname} links={links} />
            </div>

            {/* Desktop Sidebar */}
            <div className="hidden md:flex h-screen w-72 flex-col border-r border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 transition-all duration-300 sticky top-0">
                <SidebarContent role={role} pathname={pathname} links={links} />
            </div>
        </>
    );
}

function SidebarContent({ role, pathname, links }: { role: string, pathname: string, links: any[] }) {
    return (
        <>
            <div className="flex h-24 items-center px-8">
                <Link href="/" className="flex items-center gap-3 group">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-blue-500/20 transition-transform group-hover:scale-105">
                        <UtensilsCrossed className="h-5 w-5" />
                    </div>
                    <div>
                        <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-50 block">MealMatrix</span>
                        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">{role.toUpperCase()} PORTAL</span>
                    </div>
                </Link>
            </div>

            <div className="flex-1 overflow-y-auto py-6 px-4 no-scrollbar">
                <nav className="space-y-2">
                    {links.map((link, index) => {
                        const Icon = link.icon;
                        const isActive = pathname === link.href;
                        return (
                            <Link
                                key={index}
                                href={link.href}
                                className={cn(
                                    "flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-medium transition-all duration-200 group relative",
                                    isActive
                                        ? "bg-blue-50 text-blue-700 shadow-sm dark:bg-blue-900/20 dark:text-blue-400"
                                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-900 hover:text-gray-900 dark:hover:text-gray-200"
                                )}
                            >
                                <Icon className={cn("h-5 w-5 transition-colors", isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300")} />
                                <span>{link.label}</span>
                                {isActive && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-blue-600 rounded-r-full" />
                                )}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            <div className="p-6 border-t border-gray-100 dark:border-zinc-800">
                <Button variant="outline" className="w-full justify-start gap-2 text-gray-600 dark:text-gray-400 hover:text-red-600 hover:bg-red-50 hover:border-red-100 dark:hover:bg-red-900/20 transition-all h-12 rounded-xl" asChild>
                    <Link href="/">
                        <LogOut className="h-4 w-4" />
                        Sign Out
                    </Link>
                </Button>
            </div>
        </>
    );
}
