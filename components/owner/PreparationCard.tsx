import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { CheckCircle2, Clock } from "lucide-react"
import { useEffect, useState } from "react"
import { getServiceEndTime } from "@/lib/serving"
import { MealIcon } from "@/components/common/MealIcon"

interface PreparationCardProps {
    mealType: string
    finalCount: number
    servedCount: number
    status: string // Backend status (fallback/informational)
    dishes?: { name: string; quantity: number }[]
}

export function PreparationCard({ mealType, finalCount, servedCount, status: backendStatus, dishes = [] }: PreparationCardProps) {
    // ... (rest of logic unchanged until return)
    const [now, setNow] = useState(new Date())

    // Auto-update time every 10 seconds
    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 10000)
        return () => clearInterval(interval)
    }, [])

    const percentage = finalCount > 0 ? (servedCount / finalCount) * 100 : 0
    const remaining = Math.max(0, finalCount - servedCount)

    // Status Logic
    const serviceEndTime = getServiceEndTime(mealType)
    const isTimeCompleted = now > serviceEndTime
    const isServiceCompleted = servedCount >= finalCount && finalCount > 0

    // Determine Display Status
    let displayStatus = "Serving Live"
    let statusColor = "bg-green-600 hover:bg-green-600 animate-pulse"
    let isBlurred = false

    if (isTimeCompleted) {
        displayStatus = "Time Completed"
        isBlurred = true
    } else if (isServiceCompleted) {
        displayStatus = "Service Completed"
        statusColor = "bg-green-600 hover:bg-green-600" // Solid green, no pulse
    } else {
        // Serving Live (Default)
        displayStatus = "Serving Live"
    }

    // Force blur if time completed (overrides everything)
    const containerClasses = isBlurred
        ? "relative overflow-hidden group transition-all duration-300 backdrop-blur-md bg-white/50 dark:bg-zinc-900/50 opacity-90 pointer-events-none select-none shadow-sm"
        : "shadow-lg border-l-4 border-l-primary relative overflow-hidden group bg-white dark:bg-zinc-950"

    return (
        <Card className={containerClasses}>
            {/* Time-Based Completion Overlay */}
            {isBlurred && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/30 dark:bg-black/30 backdrop-blur-[2px]">
                    <Badge className="text-lg px-6 py-2 bg-green-600 hover:bg-green-700 text-white shadow-xl flex items-center gap-2 transform scale-110">
                        <CheckCircle2 className="h-6 w-6" />
                        COMPLETED
                    </Badge>
                </div>
            )}

            {!isBlurred && (
                <div className="absolute right-0 top-0 h-24 w-24 bg-primary/5 rounded-bl-full -z-10 transition-transform group-hover:scale-110" />
            )}

            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <CardTitle className="text-xl font-bold flex items-center gap-2 capitalize">
                        <MealIcon type={mealType} size={24} />
                        {mealType}
                    </CardTitle>

                    {/* Header Badge (Hidden if blurred to clean up UI, or keep if preferred? Request said "No Serving Live visible") */}
                    {!isBlurred && (
                        <Badge className={`${statusColor} text-white border-0`}>
                            {displayStatus}
                        </Badge>
                    )}
                </div>
            </CardHeader>

            <CardContent>
                <div className="space-y-4">
                    <div className="flex justify-between items-end">
                        <div>
                            <p className="text-3xl font-extrabold">{servedCount}</p>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Served</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xl font-bold text-muted-foreground">/ {finalCount}</p>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Final Count</p>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <Progress value={percentage} className="h-3" />
                        <div className="flex justify-between text-xs font-medium text-muted-foreground">
                            <span>{percentage.toFixed(0)}% Done</span>
                            <span>{remaining} Pending</span>
                        </div>
                    </div>

                    {/* Dish Breakdown Section */}
                    <div className="pt-4 border-t border-dashed border-gray-200 dark:border-zinc-800">
                        <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Dish Quantities</h4>
                        {dishes && dishes.length > 0 ? (
                            <div className="space-y-2">
                                {dishes.map((dish, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-sm">
                                        <span className="text-gray-700 dark:text-gray-300 truncate max-w-[70%]">
                                            {dish.name}
                                        </span>
                                        <Badge variant="secondary" className="bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-gray-100 font-mono">
                                            {dish.quantity} plates
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground italic">No dishes confirmed.</p>
                        )}
                    </div>

                    {/* Footer Messages */}
                    {!isBlurred && remaining > 0 && !isServiceCompleted && (
                        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/20 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
                            <div className="h-2 w-2 rounded-full bg-yellow-500 animate-ping" />
                            <p className="text-sm text-yellow-800 dark:text-yellow-500 font-semibold">
                                Kitchen is Live!
                            </p>
                        </div>
                    )}

                    {!isBlurred && isServiceCompleted && (
                        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 rounded-lg flex items-center gap-2 text-blue-700 dark:text-blue-400 animate-in fade-in">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-sm font-semibold">Service Completed</span>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
