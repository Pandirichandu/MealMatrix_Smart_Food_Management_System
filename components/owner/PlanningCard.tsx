"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Lock, Clock } from "lucide-react"
import { useEffect, useState } from "react"
import { MealIcon } from "@/components/common/MealIcon"

interface PlanningCardProps {
    mealType: string
    expectedCount: number
    cutoffTime: string // ISO Date String
    isLocked: boolean
    dishes?: { name: string; quantity: number }[]
}

export function PlanningCard({ mealType, expectedCount, cutoffTime, isLocked, dishes = [] }: PlanningCardProps) {
    const [timeLeft, setTimeLeft] = useState("")

    useEffect(() => {
        if (isLocked) return

        const calculateTimeLeft = () => {
            const now = new Date()
            const cutoff = new Date(cutoffTime)
            const diff = cutoff.getTime() - now.getTime()

            if (diff <= 0) {
                setTimeLeft("Locked")
            } else {
                const hours = Math.floor(diff / (1000 * 60 * 60))
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
                const seconds = Math.floor((diff % (1000 * 60)) / 1000)
                setTimeLeft(`${hours}h ${minutes}m ${seconds}s`)
            }
        }

        const interval = setInterval(calculateTimeLeft, 1000)
        calculateTimeLeft() // Initial call

        return () => clearInterval(interval)
    }, [cutoffTime, isLocked])

    const formattedCutoff = new Date(cutoffTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    return (
        <Card className="shadow-sm border border-dashed border-gray-300 dark:border-zinc-700 bg-gray-50/50 dark:bg-zinc-900/50">
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2 capitalize text-muted-foreground">
                        <MealIcon type={mealType} size={20} />
                        {mealType}
                    </CardTitle>
                    {isLocked ? (
                        <Badge variant="secondary" className="bg-gray-200 text-gray-600 dark:bg-zinc-800 dark:text-gray-400 flex items-center gap-1">
                            <Lock className="h-3 w-3" /> Locked
                        </Badge>
                    ) : (
                        <div className="flex flex-col items-end">
                            <Badge variant="outline" className="border-green-500 text-green-600 bg-green-50 dark:bg-green-900/10 flex items-center gap-1 animate-pulse">
                                <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Booking Open
                            </Badge>
                        </div>

                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div>
                        <p className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
                            {expectedCount}
                        </p>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Expected</p>
                    </div>

                    {/* Dish Breakdown Section */}
                    <div className="pt-4 border-t border-dashed border-gray-200 dark:border-zinc-800">
                        <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Expected Quantities</h4>
                        {dishes && dishes.length > 0 ? (
                            <div className="space-y-2">
                                {dishes.map((dish, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-sm">
                                        <span className="text-gray-700 dark:text-gray-300 truncate max-w-[70%]">
                                            {dish.name}
                                        </span>
                                        <Badge variant="secondary" className="bg-white border-gray-200 dark:bg-zinc-800 dark:border-zinc-700 text-gray-900 dark:text-gray-100 font-mono border">
                                            {dish.quantity}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground italic">No bookings yet.</p>
                        )}
                    </div>

                    <div className="pt-2 border-t border-dashed border-gray-200 dark:border-zinc-800">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" /> Cutoff
                            </span>
                            <span className="font-medium">{formattedCutoff}</span>
                        </div>
                        {!isLocked && (
                            <div className="mt-1 text-right text-xs font-mono text-primary font-bold">
                                {timeLeft}
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
