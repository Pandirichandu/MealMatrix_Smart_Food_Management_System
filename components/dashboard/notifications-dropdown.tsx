"use client"

import { useState, useEffect } from "react"
import { Bell, Check, CheckCheck, Trash2 } from "lucide-react"
import axios from "axios"
import { useRouter } from "next/navigation"

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5003"

interface Notification {
    _id: string
    title: string
    message: string
    type: string
    isRead: boolean
    createdAt: string
    link?: string
}

export function NotificationsDropdown() {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [isClearing, setIsClearing] = useState(false)
    const router = useRouter()

    const fetchNotifications = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/notifications?limit=10`, {
                withCredentials: true
            })
            setNotifications(res.data.notifications)
            setUnreadCount(res.data.unreadCount)
        } catch (error) {
            console.error("Failed to fetch notifications", error)
        }
    }

    // Initial fetch and polling
    useEffect(() => {
        fetchNotifications()
        const interval = setInterval(fetchNotifications, 60000) // Poll every 60s
        return () => clearInterval(interval)
    }, [])

    const handleNotificationClick = async (notification: Notification, e: React.MouseEvent) => {
        e.stopPropagation()
        try {
            // Only update backend if unread
            if (!notification.isRead) {
                await axios.patch(`${API_URL}/api/notifications/${notification._id}/read`, {}, {
                    withCredentials: true
                })
                // Optimistic UI update logic moved here so it only happens if request doesn't fail
                setNotifications(prev => prev.map(n => n._id === notification._id ? { ...n, isRead: true } : n))
                setUnreadCount(prev => Math.max(0, prev - 1))
            }

            // Handle Navigation
            if (notification.link) {
                if (notification.link.startsWith('/')) {
                    setIsOpen(false)
                    router.push(notification.link)
                } else {
                    toast.error("Invalid redirection link.")
                }
            }
        } catch (error) {
            toast.error("Failed to mark as read")
        }
    }

    const markAllAsRead = async () => {
        try {
            setLoading(true)
            await axios.put(`${API_URL}/api/notifications/read-all`, {}, {
                withCredentials: true
            })
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
            setUnreadCount(0)
            toast.success("All marked as read")
        } catch (error) {
            toast.error("Failed to mark all as read")
        } finally {
            setLoading(false)
        }
    }

    const clearAllNotifications = async () => {
        if (!window.confirm("Are you sure you want to clear all notifications?")) {
            return
        }

        try {
            setIsClearing(true)
            const res = await axios.delete(`${API_URL}/api/notifications`, {
                withCredentials: true
            })
            if (res.data.success) {
                setNotifications([])
                setUnreadCount(0)
                setIsOpen(false)
                toast.success("All notifications cleared")
            }
        } catch (error) {
            toast.error("Failed to clear notifications")
        } finally {
            setIsClearing(false)
        }
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric'
        }).format(date)
    }

    const getIconColor = (type: string) => {
        switch (type) {
            case 'MENU_UPDATE': return 'text-blue-500'
            case 'MEAL_REMINDER': return 'text-orange-500'
            case 'MISSED_MEAL': return 'text-red-500'
            case 'ATTENDANCE_CONFIRMED': return 'text-green-500'
            case 'ANNOUNCEMENT': return 'text-purple-500'
            default: return 'text-gray-500'
        }
    }

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5 text-muted-foreground" />
                    {unreadCount > 0 && (
                        <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-red-600 ring-2 ring-white dark:ring-slate-950" />
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80" align="end" forceMount>
                <DropdownMenuLabel className="font-normal flex justify-between items-center">
                    <span className="font-semibold">Notifications</span>
                    {unreadCount > 0 && (
                        <Badge variant="secondary" className="text-xs">
                            {unreadCount} New
                        </Badge>
                    )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {/* Scrollable Area */}
                <div className="max-h-[350px] overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            No notifications
                        </div>
                    ) : (
                        <DropdownMenuGroup>
                            {notifications.map((notification) => (
                                <DropdownMenuItem
                                    key={notification._id}
                                    className={`flex flex-col items-start gap-1 p-3 cursor-pointer transition-colors duration-200 hover:bg-slate-100 dark:hover:bg-slate-800 ${!notification.isRead ? 'bg-slate-50 dark:bg-slate-900/50' : ''}`}
                                    onClick={(e) => handleNotificationClick(notification, e)}
                                >
                                    <div className="flex w-full justify-between items-start">
                                        <span className={`text-sm font-medium ${getIconColor(notification.type)}`}>
                                            {notification.title}
                                        </span>
                                        {!notification.isRead && (
                                            <span className="h-2 w-2 rounded-full bg-blue-500 mt-1" />
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                        {notification.message}
                                    </p>
                                    <span className="text-[10px] text-slate-400 mt-1">
                                        {formatDate(notification.createdAt)}
                                    </span>
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuGroup>
                    )}
                </div>

                <DropdownMenuSeparator />
                <div className="p-2 flex flex-col gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs h-8 justify-start"
                        onClick={markAllAsRead}
                        disabled={unreadCount === 0 || loading}
                    >
                        <CheckCheck className="mr-2 h-3 w-3" />
                        Mark all as read
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs h-8 justify-start text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-950/50"
                        onClick={clearAllNotifications}
                        disabled={notifications.length === 0 || isClearing}
                    >
                        <Trash2 className="mr-2 h-3 w-3" />
                        Clear All
                    </Button>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
