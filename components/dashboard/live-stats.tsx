"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, QrCode, UserMinus } from "lucide-react"

export interface LiveStatsData {
    totalBooked: number
    sessionTotalPresent?: number
    totalScanned: number
    remaining: number
    mealType?: string
}

interface LiveStatsProps {
    stats: LiveStatsData | null
    loading?: boolean
}

export function LiveStats({ stats, loading = false }: LiveStatsProps) {
    if (!stats) return null

    return (
        <div className="grid gap-4 md:grid-cols-4 w-full animate-in fade-in-50 duration-500">
            {/* 1. Total Booked */}
            <Card className="bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        Total Booked
                    </CardTitle>
                    <Users className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                        {loading ? "..." : stats.totalBooked}
                    </div>
                    <p className="text-xs text-blue-600/60 dark:text-blue-400/60">
                        Planned {stats.mealType || 'current meal'}
                    </p>
                </CardContent>
            </Card>

            {/* 2. Session Total Present */}
            <Card className="bg-indigo-50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-indigo-900 dark:text-indigo-100">
                        Session Total Present
                    </CardTitle>
                    <Users className="h-4 w-4 text-indigo-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
                        {loading ? "..." : (stats.sessionTotalPresent ?? 0)}
                    </div>
                    <p className="text-xs text-indigo-600/60 dark:text-indigo-400/60">
                        Marked present intentions
                    </p>
                </CardContent>
            </Card>

            {/* 3. Served (Scanned) */}
            <Card className="bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-green-900 dark:text-green-100">
                        Served (Scanned)
                    </CardTitle>
                    <QrCode className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                        {loading ? "..." : stats.totalScanned}
                    </div>
                    <p className="text-xs text-green-600/60 dark:text-green-400/60">
                        Attendance Marked
                    </p>
                </CardContent>
            </Card>

            {/* 4. Remaining */}
            <Card className="bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-orange-900 dark:text-orange-100">
                        Remaining
                    </CardTitle>
                    <UserMinus className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                        {loading ? "..." : stats.remaining}
                    </div>
                    <p className="text-xs text-orange-600/60 dark:text-orange-400/60">
                        Expected to eat
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
