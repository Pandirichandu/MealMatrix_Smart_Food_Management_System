"use client";

import { useEffect, useState, useCallback } from "react"
import { Users, Activity, Scan, ArrowRight, Utensils, CalendarDays, History } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { API_URL } from "@/lib/config";
import axios from "axios";
import { PreparationCard } from "@/components/owner/PreparationCard"
import { PlanningCard } from "@/components/owner/PlanningCard"
import { Badge } from "@/components/ui/badge"

const SummaryCard = ({ title, value, subtext, icon: Icon, colorClass, borderClass, loading }: any) => (
    <Card className={`shadow-sm border-l-4 ${borderClass} bg-white dark:bg-zinc-950`}>
        <CardContent className="p-4 flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-muted-foreground">{title}</p>
                {loading ? (
                    <div className="h-8 w-16 bg-gray-100 dark:bg-zinc-800 animate-pulse rounded my-1" />
                ) : (
                    <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
                )}
                <p className="text-xs text-muted-foreground">{subtext}</p>
            </div>
            <div className={`p-3 rounded-xl bg-opacity-10 ${colorClass.replace("text-", "bg-")} ${colorClass}`}>
                <Icon className="h-5 w-5" />
            </div>
        </CardContent>
    </Card>
)

export default function OwnerDashboardPage() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any>(null);
    const [todayData, setTodayData] = useState<any[]>([]);
    const [tomorrowData, setTomorrowData] = useState<any[]>([]);
    const [error, setError] = useState(false);

    const fetchDashboardData = useCallback(async (showLoading = true) => {
        try {
            if (showLoading) setLoading(true);

            const res = await axios.get(`${API_URL}/api/owner/dashboard`, { withCredentials: true });

            setStats(res.data.stats);
            setTodayData(res.data.today);
            setTomorrowData(res.data.tomorrow);
            setError(false);
        } catch (err) {
            console.error("Dashboard Error", err);
            setError(true);
        } finally {
            if (showLoading) setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Initial load
        fetchDashboardData(true);

        // Live refresh every 10 seconds (silent)
        const interval = setInterval(() => {
            fetchDashboardData(false);
        }, 10000);

        return () => clearInterval(interval);
    }, [fetchDashboardData]);

    if (error && !stats) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                <p className="text-muted-foreground">Failed to load dashboard data.</p>
                <Button onClick={() => window.location.reload()} variant="outline">Retry</Button>
            </div>
        )
    }

    return (
        <div className="flex-1 space-y-8 p-6 md:p-8 bg-gray-50/30 dark:bg-zinc-950/30 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-gray-50">Kitchen Command Center</h2>
                    <p className="text-muted-foreground">Monitor live serving and plan for upcoming meals.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Link href="/owner/scan">
                        <Button size="lg" className="shadow-lg shadow-blue-500/20 bg-primary hover:bg-primary/90 transition-all font-semibold">
                            <Scan className="mr-2 h-4 w-4" />
                            Scan QR Code
                        </Button>
                    </Link>
                </div>
            </div>

            {/* 1. COMPACT SUMMARY GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SummaryCard
                    title="Total Expected (Today)"
                    value={stats?.expectedMeals || 0}
                    subtext="Confirmed Bookings"
                    icon={Utensils}
                    colorClass="text-blue-600"
                    borderClass="border-blue-500"
                    loading={loading}
                />
                <SummaryCard
                    title="Meals Served"
                    value={stats?.actualServed || 0}
                    subtext="Live Attendance"
                    icon={Activity}
                    colorClass="text-green-600"
                    borderClass="border-green-500"
                    loading={loading}
                />
                <SummaryCard
                    title="Pending"
                    value={stats?.pending || 0}
                    subtext="Yet to be served"
                    icon={Users}
                    colorClass="text-orange-600"
                    borderClass="border-orange-500"
                    loading={loading}
                />
            </div>

            {/* 2. TODAY'S PREPARATION (LIVE) - MAIN SECTION */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="bg-red-500 h-8 w-1.5 rounded-full" />
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide">Today's Preparation</h3>
                        <p className="text-sm text-muted-foreground">Live serving status and final quantities.</p>
                    </div>

                    <Badge variant="secondary" className="ml-auto flex gap-2">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                        Live Updates
                    </Badge>
                </div>

                {loading && !todayData.length ? (
                    <div className="grid md:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => <div key={i} className="h-48 bg-gray-100 dark:bg-zinc-800 rounded-xl animate-pulse" />)}
                    </div>
                ) : (
                    <div className="grid md:grid-cols-3 gap-6">
                        {todayData.map((meal: any) => (
                            <PreparationCard
                                key={meal.type}
                                mealType={meal.type}
                                finalCount={meal.finalCount}
                                servedCount={meal.servedCount}
                                status={meal.servingStatus} // Use servingStatus from backend (or derived)
                                dishes={meal.dishes}
                            />
                        ))}
                    </div>
                )}
            </div>

            <div className="border-t border-dashed border-gray-200 dark:border-zinc-800 my-8" />

            {/* 3. TOMORROW'S PREPARATION (PLANNING) - SECONDARY SECTION */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="bg-blue-500 h-8 w-1.5 rounded-full" />
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide">Tomorrow's Preparation</h3>
                        <p className="text-sm text-muted-foreground">Upcoming bookings and production planning.</p>
                    </div>

                    <div className="ml-auto flex items-center gap-2 text-sm font-medium text-muted-foreground bg-gray-100 dark:bg-zinc-800 px-3 py-1 rounded-full">
                        <CalendarDays className="h-4 w-4" />
                        {new Date(new Date().setDate(new Date().getDate() + 1)).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                    </div>
                </div>

                {loading && !tomorrowData.length ? (
                    <div className="grid md:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-100 dark:bg-zinc-800 rounded-xl animate-pulse" />)}
                    </div>
                ) : (
                    <div className="grid md:grid-cols-3 gap-6 opacity-90 hover:opacity-100 transition-opacity">
                        {tomorrowData.map((meal: any) => (
                            <PlanningCard
                                key={meal.type}
                                mealType={meal.type}
                                expectedCount={meal.expectedCount}
                                cutoffTime={meal.cutoffTime}
                                isLocked={meal.isLocked}
                                dishes={meal.dishes}
                            />
                        ))}
                    </div>
                )}
            </div>

            <div className="flex justify-center pt-8 pb-4">
                <Link href="/owner/history" className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors">
                    <History className="mr-2 h-4 w-4" />
                    View Historical Records
                </Link>
            </div>
        </div>
    )
}
