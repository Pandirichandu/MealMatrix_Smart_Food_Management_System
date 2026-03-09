"use client"

import { useState, useEffect } from 'react'
import { getCutoffTime, isBookingAllowed } from "@/lib/cutoff"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Utensils, ShoppingBag, Leaf, Flame, Moon, ArrowRight, ChevronRight, Info, CalendarDays, Sun } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from 'next/navigation'
import { cn } from "@/lib/utils"

interface FoodItem {
    _id: string
    foodName: string
    imageUrl: string
    mealType: string
    price: number
    category: string
    vegOrNonVeg: 'veg' | 'non-veg'
}

interface Menu {
    _id: string
    date: string
    breakfast: FoodItem[]
    lunch: FoodItem[]
    dinner: FoodItem[]
    breakfastStatus?: string
    lunchStatus?: string
    dinnerStatus?: string
}

export default function StudentMenuPage() {
    const [menus, setMenus] = useState<Menu[]>([])
    const [dynamicSettings, setDynamicSettings] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()

    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

    useEffect(() => {
        const cached = localStorage.getItem('student_menu_cache')
        if (cached) {
            try {
                const parsed = JSON.parse(cached)
                if (Array.isArray(parsed)) {
                    setMenus(parsed)
                    setLoading(false) // Show cached data immediately
                }
            } catch (e) {
                console.error("Cache parse error", e)
            }
        }
        fetchMenus()
    }, [])

    // State for UX enhancements
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastChecked, setLastChecked] = useState<Date | null>(null);

    const handleRefresh = async () => {
        if (isRefreshing) return;

        setIsRefreshing(true);
        // Minimum delay to show the loading state (UX)
        const minDelay = new Promise(resolve => setTimeout(resolve, 800));

        await Promise.all([fetchMenus(true), minDelay]);

        setLastChecked(new Date());
        setIsRefreshing(false);
        toast.success("Menu updated");
    };

    const fetchMenus = async (isBackgroundRefresh = false) => {
        try {
            if (!isBackgroundRefresh) setLoading(true);
            setError(null)
            const token = localStorage.getItem('token')
            if (!token) {
                // Handle missing token gracefully if needed, or rely on API to return 401
            }
            const [response, settingsRes] = await Promise.all([
                fetch('/api/student/menu', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/student/settings', { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (settingsRes.ok) {
                const settingsData = await settingsRes.json();
                setDynamicSettings(settingsData?.mealCutoffTimes);
            }

            if (response.ok) {
                const data = await response.json()
                if (Array.isArray(data)) {
                    setMenus(data)
                    localStorage.setItem('student_menu_cache', JSON.stringify(data))
                } else {
                    console.error("API returned non-array data:", data)
                    setMenus([])
                }
            } else {
                console.error("Failed to fetch menu:", response.status)
                if (response.status !== 404) setError("Failed to load menu")
            }
        } catch (error) {
            console.error('Error fetching menus:', error)
            setError("Connection failed")
            toast.error("Failed to load menu")
        } finally {
            if (!isBackgroundRefresh) setLoading(false)
        }
    }

    const getMealTime = (type: string) => {
        switch (type.toLowerCase()) {
            case 'breakfast': return "7:30 AM - 9:30 AM"
            case 'lunch': return "12:30 PM - 2:30 PM"
            case 'dinner': return "7:30 PM - 9:30 PM"
            default: return ""
        }
    }


    // ... imports


    const MealSummaryCard = ({ menu, mealType, icon: Icon, colorClass, gradientClass, title, dateStr, dynamicSettings }: {
        menu: Menu,
        mealType: 'breakfast' | 'lunch' | 'dinner',
        icon: any,
        colorClass: string,
        gradientClass: string,
        title: string,
        dateStr: string,
        dynamicSettings?: any
    }) => {
        // Helper to check availability
        // Now strictly enforces status === 'PUBLISHED'
        const isMenuAvailable = (items: any[], status: string) => {
            if (!items || items.length === 0) return false;
            if (status === 'DRAFT') return false;
            return true;
        };

        const statusKey = `${mealType}Status` as keyof Menu;
        const status = menu[statusKey] as string;

        const hasItems = isMenuAvailable(menu[mealType], status);
        const items = hasItems ? menu[mealType] : [];

        // --- EMPTY STATE LOGIC START ---
        const getEmptyStateContent = () => {
            const now = new Date();
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const menuDay = new Date(dateStr);
            menuDay.setHours(0, 0, 0, 0);

            // 1. Past Date -> Always "Ended"
            if (menuDay < today) {
                return {
                    title: "Menu Not Available",
                    message: "This date has passed.",
                    icon: Utensils
                };
            }

            // 2. Future Date -> Always "Coming Soon"
            // Actually, future dates might be open for booking if published!
            // But if no items, it's "Not Yet Updated".
            if (!hasItems) {
                if (menuDay > today) {
                    return {
                        title: "Not Yet Updated",
                        message: "Menu not published yet.",
                        icon: CalendarDays
                    };
                }
            }

            // 3. Check Booking Window using Centralized Logic
            // We only show "Meal Time Ended" if booking is closed AND we are on the relevant day (or past cutoff)
            const isOpen = isBookingAllowed(mealType, dateStr, dynamicSettings);

            if (!isOpen) {
                return {
                    title: "Meal Time Ended",
                    message: "This menu is no longer available.",
                    icon: Moon
                };
            } else {
                // If it's open but no items, and we are here, it means it's not published or empty
                return {
                    title: "Menu Not Available Yet",
                    message: "This meal will be updated by the hostel shortly.",
                    icon: Utensils
                };
            }
        };

        const emptyState = getEmptyStateContent();
        // --- EMPTY STATE LOGIC END ---

        return (
            <div className={cn(
                "group relative overflow-hidden rounded-3xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 shadow-sm transition-all duration-300",
                hasItems ? "hover:shadow-xl" : "opacity-90"
            )}>
                {hasItems && (
                    <div className={`absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-500 ${gradientClass}`} />
                )}

                <div className="p-6 relative z-10">
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "p-3 rounded-2xl border", // Added border for extra definition
                                hasItems
                                    ? colorClass.replace('bg-', 'bg-').replace('500', '50') + " " + colorClass.replace('bg-', 'border-').replace('500', '100') + " dark:bg-opacity-10 dark:border-opacity-10" // e.g. bg-green-50 border-green-100
                                    : "bg-gray-50 border-gray-100 dark:bg-zinc-800 dark:border-zinc-700"
                            )}>
                                <Icon className={cn(
                                    "w-6 h-6",
                                    hasItems ? colorClass.replace('bg-', 'text-').replace('500', '600') : "text-gray-400" // Darker text (600)
                                )} />
                            </div>
                            <div>
                                <h3 className={cn("text-2xl font-bold", hasItems ? "text-gray-900 dark:text-gray-100" : "text-gray-500 dark:text-gray-500")}>{title}</h3>
                                <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mt-1">
                                    <span className={cn("w-2 h-2 rounded-full", hasItems ? colorClass.replace('bg-', 'bg-').replace('500', '600') : "bg-gray-300")} />
                                    {getMealTime(mealType)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {!hasItems ? (
                        <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
                            <div className="w-12 h-12 rounded-full bg-gray-50 dark:bg-zinc-800/50 flex items-center justify-center">
                                {/* Dynamic Icon based on state */}
                                <emptyState.icon className="w-5 h-5 text-gray-300 dark:text-zinc-600" />
                            </div>
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{emptyState.title}</h4>
                            <p className="text-xs text-muted-foreground/70 max-w-[200px]">{emptyState.message}</p>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-4 mb-8">
                                {items.slice(0, 3).map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-3 group/item">
                                        <div className="h-12 w-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-zinc-800 flex-shrink-0 border border-gray-100 dark:border-zinc-700">
                                            {item.imageUrl ? (
                                                <img src={item.imageUrl} alt={item.foodName} className="h-full w-full object-cover" />
                                            ) : (
                                                <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">Img</div>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.vegOrNonVeg === 'veg' ? 'bg-green-500' : 'bg-red-500'}`} />
                                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 truncate group-hover/item:text-primary transition-colors">{item.foodName}</span>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground line-clamp-1">{item.category}</p>
                                        </div>
                                    </div>
                                ))}
                                {items.length > 3 && (
                                    <div className="pl-15 pt-1">
                                        <p className="text-xs text-muted-foreground font-medium hover:text-primary cursor-pointer transition-colors">+ {items.length - 3} more items...</p>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <Button
                                    className="w-full bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-300 border border-green-200 dark:border-green-800 font-bold h-11"
                                    onClick={() => router.push(`/student/menu/${dateStr}/${mealType}?diet=veg`)}
                                >
                                    <Leaf className="w-4 h-4 mr-2" />
                                    Veg
                                </Button>
                                <Button
                                    className="w-full bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300 border border-red-200 dark:border-red-800 font-bold h-11"
                                    onClick={() => router.push(`/student/menu/${dateStr}/${mealType}?diet=non-veg`)}
                                >
                                    <Flame className="w-4 h-4 mr-2" />
                                    Non-Veg
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        )
    }

    if (loading && menus.length === 0) {
        return (
            <div className="container mx-auto p-4 md:p-8 max-w-7xl animate-pulse space-y-8">
                <div className="h-10 w-48 bg-gray-200 rounded-lg" />
                <div className="flex gap-4 overflow-hidden py-2">
                    {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-20 w-16 bg-gray-200 rounded-2xl flex-shrink-0" />)}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => <div key={i} className="h-80 bg-gray-200 rounded-2xl" />)}
                </div>
            </div>
        )
    }

    if (error && menus.length === 0) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
                <div className="text-red-500 font-bold text-lg">{error}</div>
                <Button onClick={() => fetchMenus()} variant="outline">Retry</Button>
            </div>
        )
    }

    // Process dates safely
    const menusByDate = new Map<string, Menu>()
    if (Array.isArray(menus)) {
        menus.forEach(menu => {
            try {
                if (menu.date) {
                    const date = new Date(menu.date).toISOString().split('T')[0]
                    menusByDate.set(date, menu)
                }
            } catch (e) {
                console.error("Error processing menu date:", menu, e)
            }
        })
    }

    // Generate dates for the next 7 days
    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() + i);

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const localDateStr = `${year}-${month}-${day}`;

        return {
            label: date.toLocaleDateString('en-US', { weekday: 'short' }),
            fullLabel: date.toLocaleDateString('en-US', { weekday: 'long' }),
            dateStr: date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
            dateValue: localDateStr,
            dayNum: date.getDate(),
        };
    });

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 pb-24 font-sans selection:bg-primary/20">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-gray-200/50 supports-[backdrop-filter]:bg-white/60">
                <div className="container mx-auto px-4 py-4 max-w-7xl flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 p-2.5 rounded-xl text-white shadow-lg shadow-emerald-500/20">
                            <Utensils className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight leading-none">Hostel Menu</h1>
                            <p className="text-xs text-muted-foreground font-medium mt-1">Plan your meals for the week</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Date Tabs */}
            <div className="container mx-auto px-4 mt-8 max-w-7xl">
                <Tabs defaultValue={weekDays[0].dateValue} className="space-y-8">
                    {/* Desktop: Grid / Mobile: Scrollable Flex */}
                    <div className="relative">
                        <TabsList className="w-full h-auto bg-transparent p-0 gap-3 md:gap-4 overflow-x-auto flex md:grid md:grid-cols-7 no-scrollbar pb-4 snap-x snap-mandatory">
                            {weekDays.map(day => (
                                <TabsTrigger
                                    key={day.dateValue}
                                    value={day.dateValue}
                                    className="group snap-center flex-col items-center justify-center h-20 md:h-24 min-w-[4.5rem] rounded-2xl border bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:border-blue-600 transition-all duration-300 shadow-sm hover:border-blue-600/50 hover:shadow-md data-[state=active]:shadow-blue-500/25 data-[state=active]:scale-[1.02] cursor-pointer hover:bg-gray-50 data-[state=active]:hover:bg-blue-700"
                                    title={`View menu for ${day.fullLabel}`}
                                >
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1 group-data-[state=active]:text-blue-100 group-hover:text-gray-900 group-data-[state=active]:group-hover:text-blue-100">{day.label}</span>
                                    <span className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100 group-data-[state=active]:text-white">{day.dayNum}</span>
                                </TabsTrigger>
                            ))}
                        </TabsList>
                        {/* Mobile Scroll Hint (Optional - visible only on mobile if content overflows) */}
                        <div className="md:hidden absolute right-0 top-0 bottom-4 w-8 bg-gradient-to-l from-[#F4F5F7] to-transparent pointer-events-none dark:from-zinc-950" />
                    </div>

                    {weekDays.map(day => {
                        const menu = menusByDate.get(day.dateValue)
                        const isMealPublished = (items: any[], status: any) => {
                            return (items && items.length > 0) && (status !== 'DRAFT');
                        };

                        const hasMenu = menu && (
                            isMealPublished(menu.breakfast, menu.breakfastStatus) ||
                            isMealPublished(menu.lunch, menu.lunchStatus) ||
                            isMealPublished(menu.dinner, menu.dinnerStatus)
                        )

                        return (
                            <TabsContent key={day.dateValue} value={day.dateValue} className="animate-in fade-in-50 slide-in-from-bottom-4 duration-500 focus-visible:outline-none min-h-[50vh]">
                                {loading ? (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
                                        {[1, 2, 3].map(i => <div key={i} className="h-96 bg-gray-200 dark:bg-zinc-800 rounded-3xl" />)}
                                    </div>
                                ) : hasMenu && menu ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        <MealSummaryCard
                                            menu={menu}
                                            mealType="breakfast"
                                            title="Breakfast"
                                            icon={Sun}
                                            colorClass="bg-green-500"
                                            gradientClass="bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500"
                                            dateStr={day.dateValue}
                                            dynamicSettings={dynamicSettings}
                                        />
                                        <MealSummaryCard
                                            menu={menu}
                                            mealType="lunch"
                                            title="Lunch"
                                            icon={Utensils}
                                            colorClass="bg-orange-500"
                                            gradientClass="bg-gradient-to-br from-orange-500 via-red-500 to-pink-500"
                                            dateStr={day.dateValue}
                                            dynamicSettings={dynamicSettings}
                                        />
                                        <MealSummaryCard
                                            menu={menu}
                                            mealType="dinner"
                                            title="Dinner"
                                            icon={Moon}
                                            colorClass="bg-indigo-500"
                                            gradientClass="bg-gradient-to-br from-indigo-500 via-purple-500 to-violet-500"
                                            dateStr={day.dateValue}
                                            dynamicSettings={dynamicSettings}
                                        />
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-24 text-center bg-white/50 dark:bg-zinc-900/50 rounded-3xl border border-dashed border-gray-300 dark:border-zinc-700">
                                        <div className="w-20 h-20 bg-gray-100 dark:bg-zinc-800/80 rounded-full flex items-center justify-center mb-6">
                                            <Utensils className="w-8 h-8 text-gray-400" />
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Menu not updated yet</h3>
                                        <p className="text-muted-foreground mt-2 max-w-sm px-6">
                                            The mess manager hasn't posted the menu for {day.fullLabel} ({day.dateStr}) yet.
                                        </p>
                                        <div className="mt-6 flex flex-col items-center gap-2">
                                            <Button
                                                variant="outline"
                                                onClick={handleRefresh}
                                                disabled={isRefreshing}
                                                className="min-w-[150px]"
                                            >
                                                {isRefreshing ? (
                                                    // Assuming Loader2 is available, or use specific icon
                                                    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                                                ) : "Check for Updates"}
                                                {isRefreshing ? "Checking..." : ""}
                                            </Button>
                                            {lastChecked && (
                                                <span className="text-[10px] text-muted-foreground animate-in fade-in">
                                                    Last checked: {lastChecked.toLocaleTimeString()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </TabsContent>
                        )
                    })}
                </Tabs>
            </div>
        </div>
    )
}
