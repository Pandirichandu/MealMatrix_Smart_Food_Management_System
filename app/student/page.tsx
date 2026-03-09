"use client"
import { useEffect, useState, useCallback } from "react"
import { CalendarDays, Clock, UtensilsCrossed, AlertCircle, Plus, Minus, ShoppingBag } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import axios from "axios"
import { API_URL } from "@/lib/config"
import { MealSection } from "@/components/student/MealSection"
import { DynamicMealState } from "@/components/student/DynamicMealState"
import { MealIntentionSection } from "@/components/student/MealIntentionSection" // Added

import { useRouter } from "next/navigation"

export default function StudentDashboard() {
    const router = useRouter()
    const [selectedDateFilter, setSelectedDateFilter] = useState<"today" | "tomorrow">("today")

    // Separate state for each tab to prevent race conditions/flickering
    const [todayMenu, setTodayMenu] = useState<any>(null)
    const [tomorrowMenu, setTomorrowMenu] = useState<any>(null)

    const [loadingToday, setLoadingToday] = useState(true)
    const [loadingTomorrow, setLoadingTomorrow] = useState(true)

    // Meal Statuses explicit state fetched from the backend calculation
    const [todayStatuses, setTodayStatuses] = useState<any>(null)
    const [tomorrowStatuses, setTomorrowStatuses] = useState<any>(null)

    // Intention state
    const [todayIntentions, setTodayIntentions] = useState<any>({ breakfast: null, lunch: null, dinner: null })
    const [tomorrowIntentions, setTomorrowIntentions] = useState<any>({ breakfast: null, lunch: null, dinner: null })

    // Booking State: { [dateStr-mealType]: { [itemId]: quantity } }
    const [cart, setCart] = useState<Record<string, Record<string, number>>>({})
    const [bookingLoading, setBookingLoading] = useState(false)

    const fetchMenu = useCallback(async (type: "today" | "tomorrow") => {
        // Set specific loading state
        if (type === "today") setLoadingToday(true)
        else setLoadingTomorrow(true)

        try {
            const date = new Date()
            if (type === "tomorrow") {
                date.setDate(date.getDate() + 1)
            }

            // FIX: Generate YYYY-MM-DD from local browser time reliably
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;

            // Parallel fetch menu, dynamic statuses, and intentions
            if (type === "today") {
                const [menuRes, statusRes, intentionsRes] = await Promise.all([
                    axios.get(`${API_URL}/api/student/today-menu?date=${dateStr}`, { withCredentials: true }),
                    axios.get(`${API_URL}/api/student/meal-status?date=${dateStr}`, { withCredentials: true }),
                    axios.get(`${API_URL}/api/student/meal-intention?date=${dateStr}`, { withCredentials: true })
                ]);

                const data = menuRes.data;
                const isEmpty = (!data.breakfast || data.breakfast.length === 0) &&
                    (!data.lunch || data.lunch.length === 0) &&
                    (!data.dinner || data.dinner.length === 0);

                setTodayMenu(isEmpty ? null : { ...data, date: dateStr })
                setTodayStatuses(statusRes.data.statuses)
                setTodayIntentions(intentionsRes.data?.data || intentionsRes.data)
            } else {
                const [menuRes, statusRes, intentionsRes] = await Promise.all([
                    axios.get(`${API_URL}/api/student/today-menu?date=${dateStr}`, { withCredentials: true }),
                    axios.get(`${API_URL}/api/student/meal-status?date=${dateStr}`, { withCredentials: true }),
                    axios.get(`${API_URL}/api/student/meal-intention?date=${dateStr}`, { withCredentials: true })
                ]);

                const data = menuRes.data;
                const isEmpty = (!data.breakfast || data.breakfast.length === 0) &&
                    (!data.lunch || data.lunch.length === 0) &&
                    (!data.dinner || data.dinner.length === 0);

                setTomorrowMenu(isEmpty ? null : { ...data, date: dateStr })
                setTomorrowStatuses(statusRes.data.statuses)
                setTomorrowIntentions(intentionsRes.data?.data || intentionsRes.data)
            }

        } catch (error: any) {
            if (type === "today") {
                setTodayMenu(null);
                setTodayStatuses(null);
                setTodayIntentions({ breakfast: null, lunch: null, dinner: null });
            } else {
                setTomorrowMenu(null);
                setTomorrowStatuses(null);
            }

            console.error(`Dashboard Load Error (${type}):`, error);

            // Handle Session Expiry (Only trigger once ideally, but handled here for safety)
            if (error.response?.status === 401) {
                toast.error("Session expired. Please login again.");
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                router.push('/login');
                return;
            }
        } finally {
            if (type === "today") setLoadingToday(false)
            else setLoadingTomorrow(false)
        }
    }, [router])

    useEffect(() => {
        // Fetch BOTH on mount to ensure data is ready and prevent flickering
        fetchMenu("today")
        fetchMenu("tomorrow")
    }, [fetchMenu])



    const updateQuantity = (date: string, mealType: string, itemId: string, delta: number, max: number) => {
        const key = `${date}-${mealType}`;
        setCart(prev => {
            const currentMealCart = prev[key] || {};
            const currentQty = currentMealCart[itemId] || 0;
            const newQty = Math.max(0, Math.min(max, currentQty + delta));

            if (newQty === 0) {
                const { [itemId]: _, ...rest } = currentMealCart;
                return { ...prev, [key]: rest };
            }

            return { ...prev, [key]: { ...currentMealCart, [itemId]: newQty } };
        });
    };

    const handleBook = async (date: string, mealType: string) => {
        const key = `${date}-${mealType}`;
        const items = cart[key] || {};

        setBookingLoading(true);
        try {
            const payloadItems = Object.entries(items).map(([id, qty]) => ({
                _id: id,
                quantity: qty
            }));

            // Find item names (optional but good for debugging if backend needs names)
            // Ideally backend relies on ID.
            const menuSource = date === todayMenu?.date ? todayMenu : tomorrowMenu;
            const allItems = [...(menuSource?.[mealType] || [])];

            const enrichedItems = payloadItems.map(p => {
                const found = allItems.find(i => i._id === p._id);
                return {
                    _id: p._id,
                    itemName: found?.foodName,
                    quantity: p.quantity
                }
            });

            await axios.post(`${API_URL}/api/student/select`, {
                date,
                mealType,
                items: enrichedItems
            }, { withCredentials: true });

            toast.success("Booking confirmed!");
            // Refresh logic if needed? 
            // Ideally we assume success and keep cart or clear it? 
            // Usually booking is persistent, so we keep the counts shown as "Booked".
            // But for now, let's just show success.
        } catch (error: any) {
            console.error("Booking failed", error);
            toast.error(error.response?.data?.msg || "Booking failed");
        } finally {
            setBookingLoading(false);
        }
    };

    const handleIntentionChange = async (mealType: string, status: "present" | "not_coming", isToday: boolean = false) => {
        // Optimistic UI Update
        if (isToday) {
            setTodayIntentions((prev: any) => ({
                ...prev,
                [mealType]: prev[mealType] === status ? null : status
            }));
        } else {
            setTomorrowIntentions((prev: any) => ({
                ...prev,
                [mealType]: prev[mealType] === status ? null : status
            }));
        }

        try {
            const date = new Date();
            if (!isToday) {
                date.setDate(date.getDate() + 1);
            }
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;

            await axios.post(`${API_URL}/api/student/meal-intention`, {
                date: dateStr,
                mealType,
                status
            }, { withCredentials: true });
        } catch (error) {
            console.error("Failed to update intention", error);
            toast.error("Failed to update confirmation");
            // Revert on error
            fetchMenu(isToday ? "today" : "tomorrow");
        }
    };



    // Status Check State
    const [isInactive, setIsInactive] = useState(false);
    const [statusLoading, setStatusLoading] = useState(true);

    // Fetch User Status on Mount
    useEffect(() => {
        const checkStatus = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/auth/me`, { withCredentials: true });
                if (res.data && res.data.status === 'inactive') {
                    setIsInactive(true);
                    toast.error("Account is Inactive. Please contact your Hostel Owner.");
                }
            } catch (err) {
                console.error("Status Check Error:", err);
            } finally {
                setStatusLoading(false);
            }
        };
        checkStatus();
    }, []);

    // ... existing fetchMenu ... 

    if (statusLoading) {
        return <div className="flex h-screen items-center justify-center">Loading...</div>;
    }

    if (isInactive) {
        return (
            <div className="flex h-[80vh] flex-col items-center justify-center space-y-4 text-center px-4">
                <div className="p-4 rounded-full bg-red-100 text-red-600 mb-2">
                    <AlertCircle className="w-12 h-12" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight">Account Inactive</h2>
                <p className="text-muted-foreground max-w-md">
                    Your student account is currently inactive. You cannot book meals or scan QR codes.
                    <br />
                    Please contact your <strong>Hostel Owner</strong> or <strong>Admin</strong> to reactivate your account.
                </p>
                <Button variant="outline" onClick={() => router.push('/login')}>
                    Back to Login
                </Button>
            </div>
        );
    }

    return (
        <div className="flex-1 space-y-6 p-6 md:p-8 pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Today&apos;s Menu</h2>
                    <p className="text-muted-foreground">Select your meals below.</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 shadow-sm ring-1 ring-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-900/40 dark:ring-blue-900/30 rounded-full text-sm font-medium">
                    <CalendarDays className="h-4 w-4" />
                    <span>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                </div>
            </div>

            <Tabs defaultValue="today" onValueChange={(v: string) => setSelectedDateFilter(v as "today" | "tomorrow")} className="space-y-6">
                <TabsList className="grid w-full max-w-sm grid-cols-2">
                    <TabsTrigger value="today">Today</TabsTrigger>
                    <TabsTrigger value="tomorrow">Tomorrow</TabsTrigger>
                </TabsList>

                <TabsContent value="today" className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                    {loadingToday ? (
                        <div className="py-20 flex flex-col items-center gap-6 w-full animate-in fade-in duration-500">
                            <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-[200px] w-full rounded-2xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 animate-pulse" />
                                ))}
                            </div>
                        </div>
                    ) : todayMenu ? (
                        <>
                            <div className="mb-6 p-5 sm:p-6 bg-white dark:bg-zinc-950 border ring-1 ring-slate-100 dark:ring-zinc-800 rounded-2xl shadow-sm">
                                <div className="flex items-start gap-3 mb-4">
                                    <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                                        <AlertCircle className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg leading-tight">Today Meal Confirmation</h3>
                                        <p className="text-sm text-muted-foreground mt-1">Please confirm if you will eat today to help reduce food waste.</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <MealIntentionSection
                                        mealType="breakfast"
                                        intention={todayIntentions?.breakfast}
                                        onChange={(t, s) => handleIntentionChange(t, s, true)}
                                        disabled={todayStatuses?.breakfast?.bookingState === 'CLOSED'}
                                    />
                                    <MealIntentionSection
                                        mealType="lunch"
                                        intention={todayIntentions?.lunch}
                                        onChange={(t, s) => handleIntentionChange(t, s, true)}
                                        disabled={todayStatuses?.lunch?.bookingState === 'CLOSED'}
                                    />
                                    <MealIntentionSection
                                        mealType="dinner"
                                        intention={todayIntentions?.dinner}
                                        onChange={(t, s) => handleIntentionChange(t, s, true)}
                                        disabled={todayStatuses?.dinner?.bookingState === 'CLOSED'}
                                    />
                                </div>
                            </div>
                            <DynamicMealState type="breakfast" title="Breakfast" status={todayStatuses?.breakfast}>
                                <MealSection
                                    title="Breakfast"
                                    type="breakfast"
                                    timeslot="07:30 AM - 09:30 AM"
                                    menuData={todayMenu}
                                    cart={cart}
                                    onUpdateQuantity={updateQuantity}
                                    onBook={handleBook}
                                    bookingLoading={bookingLoading}
                                    status={todayStatuses?.breakfast}
                                    intention={todayIntentions?.breakfast}
                                />
                            </DynamicMealState>
                            <div className="h-px bg-border/50" />
                            <DynamicMealState type="lunch" title="Lunch" status={todayStatuses?.lunch}>
                                <MealSection
                                    title="Lunch"
                                    type="lunch"
                                    timeslot="12:30 PM - 02:30 PM"
                                    menuData={todayMenu}
                                    cart={cart}
                                    onUpdateQuantity={updateQuantity}
                                    onBook={handleBook}
                                    bookingLoading={bookingLoading}
                                    status={todayStatuses?.lunch}
                                    intention={todayIntentions?.lunch}
                                />
                            </DynamicMealState>
                            <div className="h-px bg-border/50" />
                            <DynamicMealState type="dinner" title="Dinner" status={todayStatuses?.dinner}>
                                <MealSection
                                    title="Dinner"
                                    type="dinner"
                                    timeslot="07:30 PM - 09:30 PM"
                                    menuData={todayMenu}
                                    cart={cart}
                                    onUpdateQuantity={updateQuantity}
                                    onBook={handleBook}
                                    bookingLoading={bookingLoading}
                                    status={todayStatuses?.dinner}
                                    intention={todayIntentions?.dinner}
                                />
                            </DynamicMealState>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-dashed border-blue-200 dark:border-blue-900/30">
                            <h3 className="text-lg font-semibold mb-1">Menu Not Available</h3>
                            <p className="text-muted-foreground">Is the mess closed today?</p>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="tomorrow" className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                    {loadingTomorrow ? (
                        <div className="py-20 flex flex-col items-center gap-6 w-full animate-in fade-in duration-500">
                            <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-[200px] w-full rounded-2xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 animate-pulse" />
                                ))}
                            </div>
                        </div>
                    ) : tomorrowMenu ? (
                        <>
                            {/* TOMORROW MEAL CONFIRMATION (EXPECTED HEADCOUNT SYSTEM) */}
                            <div className="mb-6 p-5 sm:p-6 bg-white dark:bg-zinc-950 border ring-1 ring-slate-100 dark:ring-zinc-800 rounded-2xl shadow-sm">
                                <div className="flex items-start gap-3 mb-4">
                                    <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                                        <AlertCircle className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg leading-tight">Tomorrow Meal Confirmation</h3>
                                        <p className="text-sm text-muted-foreground mt-1">Please confirm if you will eat tomorrow to help reduce food waste.</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <MealIntentionSection
                                        mealType="breakfast"
                                        intention={tomorrowIntentions?.breakfast}
                                        onChange={(t, s) => handleIntentionChange(t, s, false)}
                                    />
                                    <MealIntentionSection
                                        mealType="lunch"
                                        intention={tomorrowIntentions?.lunch}
                                        onChange={(t, s) => handleIntentionChange(t, s, false)}
                                    />
                                    <MealIntentionSection
                                        mealType="dinner"
                                        intention={tomorrowIntentions?.dinner}
                                        onChange={(t, s) => handleIntentionChange(t, s, false)}
                                    />
                                </div>
                            </div>

                            <DynamicMealState type="breakfast" title="Breakfast" status={tomorrowStatuses?.breakfast}>
                                <MealSection
                                    title="Breakfast"
                                    type="breakfast"
                                    timeslot="07:30 AM - 09:30 AM"
                                    menuData={tomorrowMenu}
                                    cart={cart}
                                    onUpdateQuantity={updateQuantity}
                                    onBook={handleBook}
                                    bookingLoading={bookingLoading}
                                    status={tomorrowStatuses?.breakfast}
                                    intention={tomorrowIntentions?.breakfast}
                                />
                            </DynamicMealState>
                            <div className="h-px bg-border/50" />
                            <DynamicMealState type="lunch" title="Lunch" status={tomorrowStatuses?.lunch}>
                                <MealSection
                                    title="Lunch"
                                    type="lunch"
                                    timeslot="12:30 PM - 02:30 PM"
                                    menuData={tomorrowMenu}
                                    cart={cart}
                                    onUpdateQuantity={updateQuantity}
                                    onBook={handleBook}
                                    bookingLoading={bookingLoading}
                                    status={tomorrowStatuses?.lunch}
                                    intention={tomorrowIntentions?.lunch}
                                />
                            </DynamicMealState>
                            <div className="h-px bg-border/50" />
                            <DynamicMealState type="dinner" title="Dinner" status={tomorrowStatuses?.dinner}>
                                <MealSection
                                    title="Dinner"
                                    type="dinner"
                                    timeslot="07:30 PM - 09:30 PM"
                                    menuData={tomorrowMenu}
                                    cart={cart}
                                    onUpdateQuantity={updateQuantity}
                                    onBook={handleBook}
                                    bookingLoading={bookingLoading}
                                    status={tomorrowStatuses?.dinner}
                                    intention={tomorrowIntentions?.dinner}
                                />
                            </DynamicMealState>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-dashed border-blue-200 dark:border-blue-900/30">
                            <Clock className="w-8 h-8 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-1">Tomorrow&apos;s Menu Not Updated</h3>
                            <p className="text-muted-foreground">Check back later tonight!</p>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    )
}
