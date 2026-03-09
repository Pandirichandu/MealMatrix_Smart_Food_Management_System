"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { UtensilsCrossed, Plus, Minus, AlertCircle } from "lucide-react"
import { CutoffTimer } from "./CutoffTimer"
import { getCutoffTime } from "@/lib/cutoff"
import { MealIcon } from "@/components/common/MealIcon"

interface MealSectionProps {
    title: string
    type: string // 'breakfast' | 'lunch' | 'dinner'
    timeslot: string
    menuData: any
    dynamicSettings?: any
    cart: Record<string, Record<string, number>>
    onUpdateQuantity: (date: string, mealType: string, itemId: string, delta: number, max: number) => void
    onBook: (date: string, mealType: string) => void
    bookingLoading: boolean
    status?: any // Passed down from DynamicMealState or page.tsx
    intention?: string // Passed from page.tsx (e.g. 'present' or 'not_coming')
}

export function MealSection({ title, type, timeslot, menuData, dynamicSettings, cart, onUpdateQuantity, onBook, bookingLoading, status, intention }: MealSectionProps) {
    // Initialize state strictly based on checking time to avoid hydration mismatch/flash if possible
    // Note: getCutoffTime returns local time limit. new Date() is local time.
    const [isBookingClosed, setIsBookingClosed] = useState(() => {
        if (!menuData?.date) return true
        return new Date() > getCutoffTime(type, menuData.date, dynamicSettings)
    })

    const items = menuData ? menuData[type] || [] : []
    const vegItems = items.filter((i: any) => i.vegOrNonVeg === 'veg')
    const nonVegItems = items.filter((i: any) => i.vegOrNonVeg === 'non-veg')

    const cartKey = `${menuData?.date}-${type}`;
    const mealCart = cart[cartKey] || {};
    const totalItems = Object.values(mealCart).reduce((a, b) => a + b, 0);

    const handleCutoffPass = (closed: boolean) => {
        setIsBookingClosed(closed)
    }

    const bookingState = status?.bookingState || 'OPEN'; // OPEN, CLOSED
    const isClosed = bookingState === 'CLOSED' || isBookingClosed;
    const isSkipping = intention === 'not_coming';

    // Handle Closed explicitly
    if (isClosed) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-4">
                    <div className="flex items-center gap-3">
                        <MealIcon type={type} size={20} />
                        <h3 className="text-xl font-bold">{title}</h3>
                    </div>
                </div>
                <div className="p-6 text-center bg-red-50 dark:bg-red-900/10 rounded-xl border border-dashed border-red-200 dark:border-red-900/30">
                    <h3 className="text-lg font-bold text-red-800 dark:text-red-200">Booking Closed</h3>
                    <p className="text-sm text-red-700 dark:text-red-300">
                        The time window for this meal has elapsed.
                    </p>
                </div>
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <MealIcon type={type} size={24} />
                        {title}
                        <Badge variant="outline" className="ml-2 font-normal text-muted-foreground">{timeslot}</Badge>
                    </h3>
                </div>
                <div className="py-8 text-center text-muted-foreground bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-dashed border-blue-200 dark:border-blue-900/30">
                    <UtensilsCrossed className="w-10 h-10 mx-auto mb-3" />
                    <p>No dishes have been added for {title} yet.</p>
                </div>
            </div>
        )
    }

    // ItemCard Component (Internal or could be separate)
    const ItemCard = ({ item }: { item: any }) => {
        const qty = mealCart[item._id] || 0;
        const max = item.maxQuantity || 3; // Default max 3

        return (
            <Card className={`overflow-hidden transition-all ${qty > 0 ? 'ring-2 ring-primary border-primary' : 'hover:shadow-md'}`}>
                <div className="aspect-video w-full overflow-hidden relative">
                    <img
                        src={item.imageUrl || "/menu-images/placeholder.jpg"}
                        alt={item.foodName}
                        className="h-full w-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = '/menu-images/placeholder.jpg' }}
                    />
                    {qty > 0 && (
                        <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-full shadow-sm">
                            {qty} in cart
                        </div>
                    )}
                    <Badge variant={item.vegOrNonVeg === 'veg' ? 'default' : 'destructive'}
                        className={`absolute bottom-2 left-2 text-[10px] h-5 ${item.vegOrNonVeg === 'veg' ? 'bg-green-600' : 'bg-red-600'}`}>
                        {item.vegOrNonVeg === 'veg' ? 'VEG' : 'NON-VEG'}
                    </Badge>
                </div>
                <CardContent className="p-4">
                    <h4 className="font-semibold text-lg line-clamp-1">{item.foodName}</h4>
                    <p className="text-sm text-muted-foreground capitalize mb-3">{item.category}</p>

                    <div className="flex items-center justify-between mt-2">
                        <div className="text-sm font-medium text-gray-500">
                            Max: {max}
                        </div>
                        <div className="flex items-center gap-3 bg-gray-100 dark:bg-zinc-800 rounded-lg p-1">
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 rounded-md"
                                onClick={() => onUpdateQuantity(menuData.date, type, item._id, -1, max)}
                                disabled={qty === 0 || isBookingClosed || isSkipping}
                            >
                                <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-4 text-center font-bold text-sm">{qty}</span>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 rounded-md"
                                onClick={() => onUpdateQuantity(menuData.date, type, item._id, 1, max)}
                                disabled={qty >= max || isBookingClosed || isSkipping}
                            >
                                <Plus className="h-3 w-3" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-3">
                    <MealIcon type={type} size={20} />
                    <h3 className="text-xl font-bold">{title}</h3>
                    <Badge variant="outline" className="font-normal text-muted-foreground hidden sm:flex">{timeslot}</Badge>
                    <CutoffTimer mealType={type} date={menuData.date} dynamicSettings={dynamicSettings} onStatusChange={handleCutoffPass} />
                </div>
                {!isClosed && (
                    <Button onClick={() => onBook(menuData.date, type)} disabled={bookingLoading || isSkipping || !intention} size="sm">
                        {bookingLoading ? "Booking..." : totalItems > 0 ? `Confirm ${title} (${totalItems})` : "Confirm Presence"}
                    </Button>
                )}
            </div>

            {!intention && !isClosed && (
                <div className="flex items-center gap-2 p-3 text-sm text-blue-800 bg-blue-50 rounded-lg border border-blue-200 mb-2">
                    <AlertCircle className="w-4 h-4 text-blue-600 shrink-0" />
                    <p>Please select Present or Skip below to book your meal.</p>
                </div>
            )}

            {isSkipping && (
                <div className="flex items-center gap-2 p-3 text-sm text-amber-800 bg-amber-50 rounded-lg border border-amber-200">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <p>You have selected Skip for this meal. Change to Present to book.</p>
                </div>
            )}

            {vegItems.length > 0 && (
                <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-green-700 flex items-center gap-2 uppercase tracking-wide">
                        <div className="w-2 h-2 rounded-full bg-green-600" />
                        Vegetarian
                    </h4>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {vegItems.map((item: any, idx: number) => (
                            <ItemCard key={`${item._id}-${idx}`} item={item} />
                        ))}
                    </div>
                </div>
            )}

            {nonVegItems.length > 0 && (
                <div className="space-y-3 pt-2">
                    <h4 className="text-sm font-semibold text-red-700 flex items-center gap-2 uppercase tracking-wide">
                        <div className="w-2 h-2 rounded-full bg-red-600" />
                        Non-Vegetarian
                    </h4>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {nonVegItems.map((item: any, idx: number) => (
                            <ItemCard key={`nonveg-${idx}`} item={item} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
