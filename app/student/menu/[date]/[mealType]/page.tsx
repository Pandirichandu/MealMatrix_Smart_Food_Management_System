"use client"

import { useState, useEffect, useCallback } from 'react'
import { isBookingAllowed, getFormattedCutoffTime } from "@/lib/cutoff"
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Check, Minus, Plus, ShoppingBag, Info, AlertCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface FoodItem {
    _id: string
    foodName: string
    imageUrl: string
    category: string
    vegOrNonVeg: 'veg' | 'non-veg'
    price: number
    mealType: string
}

interface SelectionState {
    [dishId: string]: {
        dishName: string
        quantity: number
        imageUrl: string
        vegOrNonVeg: 'veg' | 'non-veg'
    }
}

export default function MealSelectionPage() {
    const params = useParams()
    const searchParams = useSearchParams()
    const router = useRouter()

    const dateStr = params.date as string
    const mealType = params.mealType as string
    const preferredDiet = searchParams.get('diet') // 'veg' or 'non-veg'

    const [items, setItems] = useState<FoodItem[]>([])
    // Strict Independent State
    const [selections, setSelections] = useState<SelectionState>({})
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [timeError, setTimeError] = useState<string | null>(null)
    const [maxDishesAllowed, setMaxDishesAllowed] = useState<number | null>(null);
    const [dynamicSettings, setDynamicSettings] = useState<any>(null)
    const [isBooked, setIsBooked] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // REMOVED: Global Dish Limit (MAX_DISHES)
    // REMOVED: Hardcoded MAX_PLATES_PER_DISH


    // ...


    // Time Validation Helper
    const checkTimeWindow = useCallback((settings: any): string | null => {
        // Use centralized logic to check if booking is open
        const isOpen = isBookingAllowed(mealType, dateStr, settings);

        if (!isOpen) {
            const formattedTime = getFormattedCutoffTime(mealType, settings);
            const formattedMealType = mealType.charAt(0).toUpperCase() + mealType.slice(1).toLowerCase();
            return `${formattedMealType} booking closed at ${formattedTime}. Menu is now final.`;
        }

        return null;
    }, [dateStr, mealType]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('token')
                const headers = { 'Authorization': `Bearer ${token}` };

                // 1. Fetch Menu
                const menuRes = await fetch(`/api/student/today-menu?date=${dateStr}`, { headers });
                const menuData = await menuRes.json();

                // 2. Fetch Existing Booking
                const bookingRes = await fetch(`/api/student/booking?date=${dateStr}&mealType=${mealType}`, { headers });
                const bookingData = await bookingRes.json();

                // 3. Fetch Settings
                const settingsRes = await fetch(`/api/student/settings`, { headers });
                const settingsData = await settingsRes.json();
                const currentSettings = settingsData?.mealCutoffTimes;
                setDynamicSettings(currentSettings);

                // Initial Time Check with settings
                const error = checkTimeWindow(currentSettings);
                if (error) {
                    setTimeError(error);
                    setLoading(false);
                    return;
                }

                const lowerMealType = mealType.toLowerCase();
                let mealItems = menuData[lowerMealType] || [];

                // Load Configured Limit
                const limit = menuData[`${lowerMealType}MaxDishes`];
                if (limit !== undefined && limit !== null) {
                    setMaxDishesAllowed(limit);
                } else {
                    setMaxDishesAllowed(null); // No limit
                }

                if (preferredDiet) {
                    mealItems = mealItems.sort((a: any, b: any) =>
                        a.vegOrNonVeg === preferredDiet ? -1 : 1
                    );
                }
                setItems(mealItems);

                // 3. Handle Booked State
                if (bookingData.booked && bookingData.booking && bookingData.booking.items) {
                    setIsBooked(true);

                    // Pre-fill selections
                    const preSelections: SelectionState = {};
                    bookingData.booking.items.forEach((bookedItem: any) => {
                        // Find matching item details from menu for display
                        // Prefer dishId if available, else match by name
                        const menuDish = mealItems.find((d: any) =>
                            (bookedItem.dishId && d._id === bookedItem.dishId) ||
                            d.foodName === bookedItem.itemName
                        );

                        if (menuDish) {
                            preSelections[menuDish._id] = {
                                dishName: menuDish.foodName,
                                quantity: bookedItem.quantity,
                                imageUrl: menuDish.imageUrl,
                                vegOrNonVeg: menuDish.vegOrNonVeg
                            };
                        }
                    });
                    setSelections(preSelections);
                }

            } catch (error) {
                console.error("Failed to load data", error);
                toast.error("Failed to load menu items");
            } finally {
                setLoading(false);
            }
        };

        if (dateStr && mealType) {
            fetchData();
        }
    }, [dateStr, mealType, preferredDiet, checkTimeWindow]);

    const handleAdd = (item: FoodItem & { maxQuantity?: number }) => {

        setSelections(prev => {
            const currentTotal = Object.keys(prev).length;

            // Check Global Limit (Configurable)
            // If item is already selected, we are just increasing quantity, so dish count doesn't increase.
            // If item is NEW (not in prev), check if we hit the limit.
            if (!prev[item._id] && maxDishesAllowed !== null && currentTotal >= maxDishesAllowed) {
                toast.warning(`You can select up to ${maxDishesAllowed} different dishes for this meal.`);
                return prev;
            }

            const current = prev[item._id]?.quantity || 0;
            const maxAllowed = item.maxQuantity || 1; // Default to 1 if not set

            if (current >= maxAllowed) {
                toast.warning(`Max ${maxAllowed} plates allowed for this item.`);
                return prev;
            }

            return {
                ...prev,
                [item._id]: {
                    dishName: item.foodName,
                    quantity: current + 1,
                    imageUrl: item.imageUrl,
                    vegOrNonVeg: item.vegOrNonVeg
                }
            };
        });
    };

    const handleRemove = (dishId: string) => {
        setSelections(prev => {
            const current = prev[dishId]?.quantity || 0;
            if (current <= 1) {
                // Remove completely
                const next = { ...prev };
                delete next[dishId];
                return next;
            }
            return {
                ...prev,
                [dishId]: { ...prev[dishId], quantity: current - 1 }
            };
        });
    };

    const handleConfirm = async () => {
        // 1. Validation: Route Params
        if (!dateStr || !mealType) {
            toast.error("Invalid session parameters. Please reload.");
            return;
        }

        // 2. Validation: Empty Selection
        if (Object.keys(selections).length === 0) {
            toast.error("Please select at least one item");
            return;
        }

        setSubmitting(true);
        try {
            const token = localStorage.getItem('token');

            // 3. Construct Payload
            // Extract items and filter valid quantities
            const selectedItems = Object.entries(selections)
                .map(([id, val]) => ({
                    _id: id,
                    itemName: val.dishName,
                    quantity: val.quantity
                }))
                .filter(item => item.quantity > 0);

            if (selectedItems.length === 0) {
                toast.error("No items with valid quantity selected.");
                setSubmitting(false);
                return;
            }

            // Capitalize MealType (e.g., breakfast -> Breakfast)
            const formattedMealType = mealType.charAt(0).toUpperCase() + mealType.slice(1).toLowerCase();

            const payload = {
                date: dateStr,
                mealType: formattedMealType,
                items: selectedItems
            };

            console.log("Booking Payload:", payload);

            // 4. Send Request
            const res = await fetch('/api/student/select', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const result = await res.json();

            if (!res.ok) {
                toast.error(result.msg || "Selection failed");
                return;
            }

            toast.success("Confirmed! Enjoy your meal.");
            router.push('/student/menu');

        } catch (error) {
            console.error("Submission error", error);
            toast.error("Failed to submit selection");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F4F5F7] dark:bg-zinc-950">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // CHANGED: Instead of full page error, we just disable controls
    const isReadOnly = !!timeError || (isBooked && !isEditing);


    const totalSelectedDishes = Object.keys(selections).length;

    // ... (keep fetch logic) ...

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 pb-32">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-gray-200 dark:border-zinc-800">
                <div className="container max-w-lg mx-auto px-4 h-16 flex items-center justify-between">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="-ml-2">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex flex-col items-center">
                        <div className="font-semibold capitalize text-lg">{mealType} Selection</div>
                        {/* Last Updated Display */}
                        {items.length > 0 && (items[0] as any).updatedAt && (
                            <span className="text-[10px] text-muted-foreground">
                                Updated: {new Date((items[0] as any).updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        )}
                    </div>
                    <div className="w-9" />
                </div>
            </div>

            <div className="container max-w-lg mx-auto px-4 py-6 space-y-6">

                {/* READ ONLY BANNER */}
                {isReadOnly && (
                    <div className="bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200 p-4 rounded-xl flex gap-3 text-sm border border-orange-100 dark:border-orange-900 animate-in slide-in-from-top-2">
                        <AlertCircle className="h-5 w-5 shrink-0" />
                        <div>
                            <p className="font-bold mb-0.5">Booking is Closed</p>
                            <p className="opacity-90">{timeError} - Menu is now final.</p>
                        </div>
                    </div>
                )}

                {/* Info Card (Hide if Read Only to reduce clutter, or keep? Keep for policy info) */}
                {!isReadOnly && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 p-4 rounded-xl flex gap-3 text-sm border border-blue-100 dark:border-blue-900">
                        <Info className="h-5 w-5 shrink-0" />
                        <div>
                            <p className="font-semibold mb-1">Ordering Policy:</p>
                            <ul className="list-disc list-inside space-y-0.5 opacity-90">
                                <li>
                                    {maxDishesAllowed !== null
                                        ? <span>Select up to <strong>{maxDishesAllowed} dish types</strong></span>
                                        : <span>Select <strong>any number of dishes</strong></span>
                                    }
                                </li>
                                <li>Quantity limits apply <strong>per item</strong></li>
                            </ul>
                        </div>
                    </div>
                )}

                {/* Items Grid */}
                {items.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p>No items found for this meal.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {items.map((item) => {
                            const selection = selections[item._id];
                            const qty = selection?.quantity || 0;
                            const isSelected = qty > 0;

                            // Disable Add if:
                            // 1. Max plates reached for this dish
                            const maxAllowed = (item as any).maxQuantity || 1;
                            const isPlateLimitReached = qty >= maxAllowed;

                            return (
                                <Card key={item._id} className={cn("overflow-hidden border-0 shadow-sm transition-all duration-200", isSelected ? "ring-2 ring-primary bg-primary/5" : "bg-white dark:bg-zinc-900")}>
                                    <div className="flex p-3 gap-4">
                                        <div className="h-24 w-24 shrink-0 rounded-lg overflow-hidden bg-gray-100 relative">
                                            {item.imageUrl ? (
                                                <img src={item.imageUrl} alt={item.foodName} className="h-full w-full object-cover" />
                                            ) : (
                                                <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">Img</div>
                                            )}
                                        </div>
                                        <div className="flex-1 flex flex-col justify-between py-1">
                                            <div>
                                                <div className="flex justify-between items-start">
                                                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-1">{item.foodName}</h3>
                                                    <div className={cn(
                                                        "px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider",
                                                        item.vegOrNonVeg === 'veg'
                                                            ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
                                                            : "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
                                                    )}>
                                                        {item.vegOrNonVeg === 'veg' ? 'Veg' : 'Non-Veg'}
                                                    </div>
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-1 capitalize">{item.category}</p>
                                                <p className="text-[10px] text-muted-foreground mt-0.5">Max allowed: {maxAllowed}</p>
                                            </div>

                                            <div className="flex items-center justify-between mt-3">
                                                {isSelected ? (
                                                    <div className="flex items-center gap-3 bg-white dark:bg-zinc-800 rounded-lg p-1 shadow-sm border">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 rounded-md hover:bg-slate-100 text-red-500"
                                                            disabled={isReadOnly}
                                                            onClick={() => handleRemove(item._id)}
                                                        >
                                                            <Minus className="h-3 w-3" />
                                                        </Button>
                                                        <span className="font-bold text-sm min-w-[1.5rem] text-center tabular-nums">{qty}</span>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 rounded-md hover:bg-slate-100 text-green-600"
                                                            disabled={isPlateLimitReached || isReadOnly}
                                                            onClick={() => handleAdd(item)}
                                                        >
                                                            <Plus className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        className="h-8 px-5 font-semibold"
                                                        disabled={isReadOnly}
                                                        onClick={() => handleAdd(item)}
                                                    >
                                                        {isReadOnly ? 'Closed' : 'Add'}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Bottom Bar */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 dark:bg-zinc-950/95 backdrop-blur border-t border-gray-200 dark:border-zinc-800 z-30 shadow-[0_-5px_15px_-5px_rgba(0,0,0,0.1)]">
                <div className="container max-w-lg mx-auto flex items-center justify-between gap-4">
                    {isBooked && !isEditing ? (
                        <div className="w-full flex items-center justify-between">
                            <div className="flex items-center gap-2 text-green-600 font-medium">
                                <Check className="h-5 w-5" />
                                <span>Booking Confirmed</span>
                            </div>
                            <Button
                                variant="outline"
                                onClick={() => setIsEditing(true)}
                                disabled={!!timeError}
                            >
                                Edit Booking
                            </Button>
                        </div>
                    ) : (
                        <>
                            <div className="flex flex-col">
                                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Selected</span>
                                <div className="font-bold text-xl flex items-center gap-1">
                                    {totalSelectedDishes} <span className="text-sm font-normal text-muted-foreground">Dishes</span>
                                </div>
                            </div>
                            <Button
                                size="lg"
                                className="px-8 font-bold rounded-xl shadow-lg shadow-primary/25"
                                onClick={handleConfirm}
                                disabled={totalSelectedDishes === 0 || submitting}
                            >
                                {submitting ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <Check className="w-5 h-5 mr-2" />}
                                {isEditing ? "Update Booking" : "Confirm"}
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Booked State Overlay (Optional or just rely on ReadOnly state + Bottom Bar) */}
            {isBooked && !isEditing && !timeError && (
                <div className="fixed inset-0 z-20 pointer-events-none">
                    <div className="absolute inset-x-0 bottom-32 bg-gradient-to-t from-white/80 via-white/0 to-transparent dark:from-zinc-950/80 h-32" />
                </div>
            )}
        </div>
    )
}
