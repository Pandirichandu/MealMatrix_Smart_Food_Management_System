"use client"

import { UserNav } from "@/components/dashboard/user-nav"
// import { ModeToggle } from "@/components/ui/checkbox" // ModeToggle not implemented yet
import { NotificationsDropdown } from "@/components/dashboard/notifications-dropdown"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Header({ title }: { title?: string }) {
    return (
        <div className="border-b bg-white dark:bg-slate-950 px-6 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm">
            <div className="flex items-center gap-4">
                {/* Mobile Menu Trigger could go here */}
                <h1 className="text-lg font-semibold tracking-tight text-foreground">
                    {title || "Dashboard"}
                </h1>
            </div>

            <div className="flex items-center gap-4">
                {/* Notification Bell */}
                <NotificationsDropdown />

                <div className="h-6 w-px bg-border mx-1" />

                <UserNav />
            </div>
        </div>
    )
}
