"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Clock, AlertCircle } from "lucide-react"
import { getCutoffTime } from "@/lib/cutoff"

interface CutoffTimerProps {
    mealType: string
    date: string // YYYY-MM-DD
    dynamicSettings?: any
    onStatusChange?: (isClosed: boolean) => void
}

export function CutoffTimer({ mealType, date, dynamicSettings, onStatusChange }: CutoffTimerProps) {
    const [status, setStatus] = useState<"OPEN" | "CLOSED">("OPEN")
    const [timeLeft, setTimeLeft] = useState<string>("")

    useEffect(() => {
        const calculateStatus = () => {
            const now = new Date()
            const cutoff = getCutoffTime(mealType, date, dynamicSettings)
            const diff = cutoff.getTime() - now.getTime()

            if (diff <= 0) {
                if (status !== "CLOSED") {
                    setStatus("CLOSED")
                    onStatusChange?.(true)
                }
                setTimeLeft("00:00:00")
            } else {
                if (status !== "OPEN") {
                    setStatus("OPEN")
                    onStatusChange?.(false)
                }

                // Format countdown
                const hours = Math.floor(diff / (1000 * 60 * 60))
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
                const seconds = Math.floor((diff % (1000 * 60)) / 1000)

                setTimeLeft(
                    `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
                )
            }
        }

        // Initial check
        calculateStatus()

        // Loop
        const interval = setInterval(calculateStatus, 1000)

        return () => clearInterval(interval)
    }, [mealType, date, status, dynamicSettings, onStatusChange])

    if (status === "CLOSED") {
        return (
            <Badge variant="destructive" className="flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Booking Closed
            </Badge>
        )
    }

    return (
        <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
                <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse" />
                Booking Open
            </Badge>
            <span className="text-xs font-mono font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded-md border border-blue-100 dark:border-blue-900/30">
                <Clock className="w-3.5 h-3.5" />
                Closes in {timeLeft}
            </span>
        </div>
    )
}
