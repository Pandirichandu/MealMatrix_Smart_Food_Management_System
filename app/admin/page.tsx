"use client";

import { useEffect, useState } from "react"
import { Building2, Utensils, Users, AlertTriangle, ArrowUpRight, ArrowDownRight, Activity } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Overview } from "@/components/dashboard/overview"
import { WastageChart } from "@/components/dashboard/wastage-chart"
import { API_URL } from "@/lib/config";
import { Button } from "@/components/ui/button"

const AdminStatCard = ({ title, value, subtext, icon: Icon, colorClass, borderClass, trend }: any) => (
    <Card className={`shadow-sm hover:shadow-lg transition-all duration-300 border-l-4 ${borderClass} group overflow-hidden relative`}>
        <div className={`absolute right-0 top-0 h-24 w-24 rounded-bl-full opacity-5 transition-opacity group-hover:opacity-10 ${colorClass.replace("text-", "bg-")}`} />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-muted-foreground">
                {title}
            </CardTitle>
            <div className={`h-9 w-9 rounded-xl ${colorClass.replace("text-", "bg-").replace("600", "100").replace("500", "100")} flex items-center justify-center shadow-sm`}>
                <Icon className={`h-5 w-5 ${colorClass} dark:${colorClass.replace("600", "400").replace("500", "400")}`} />
            </div>
        </CardHeader>
        <CardContent className="relative z-10">
            <div className="text-3xl font-bold tracking-tight">{value}</div>
            <p className="text-xs text-muted-foreground mt-1 font-medium flex items-center gap-1">
                {trend === 'up' && <ArrowUpRight className="h-3 w-3 text-green-500" />}
                {trend === 'down' && <ArrowDownRight className="h-3 w-3 text-red-500" />}
                {subtext}
            </p>
        </CardContent>
    </Card>
)

export default function DashboardPage() {
    const [stats, setStats] = useState({
        totalHostels: 0,
        totalStudents: 0,
        todaysMeals: 0,
        alerts: []
    });
    const [analytics, setAnalytics] = useState({ mealDemand: [], wastageTrend: [], revenueTrend: [], topItems: [] });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Fetch stats using the secure HttpOnly cookie
                const statsRes = await fetch(`${API_URL}/api/admin/stats`, {
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' }
                });

                if (statsRes.status === 401 || statsRes.status === 403) {
                    window.location.href = '/login';
                    return;
                }

                const statsData = await statsRes.json();
                setStats(statsData?.data || statsData);

                // Fetch Analytics
                const analyticsRes = await fetch(`${API_URL}/api/admin/analytics`, {
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' }
                });
                const analyticsData = await analyticsRes.json();
                setAnalytics(analyticsData?.data || analyticsData);

            } catch (error) {
                console.error("Failed to fetch admin stats", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchStats();
    }, []);

    return (
        <div className="flex-1 space-y-6 p-8 pt-6 bg-slate-50 dark:bg-zinc-950 min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-extrabold tracking-tight text-foreground">System Dashboard</h2>
                    <p className="text-muted-foreground">Overview of hostels, students, and operational metrics.</p>
                </div>
                <div className="flex items-center space-x-2">
                    {/* Pilot Testing button removed temporarily */}
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {isLoading ? (
                    [1, 2, 3, 4].map(i => <div key={i} className="h-[120px] bg-slate-200 dark:bg-zinc-800 rounded-2xl animate-pulse border border-slate-100 dark:border-zinc-900" />)
                ) : (
                    <>
                        <AdminStatCard
                            title="Total Hostels"
                            value={stats.totalHostels}
                            subtext="Active Campuses & PGs"
                            icon={Building2}
                            colorClass="text-blue-600"
                            borderClass="border-l-blue-500"
                            trend="neutral"
                        />
                        <AdminStatCard
                            title="Total Students"
                            value={stats.totalStudents}
                            subtext="+5% from last month"
                            icon={Users}
                            colorClass="text-green-600"
                            borderClass="border-l-green-500"
                            trend="up"
                        />
                        <AdminStatCard
                            title="Today's Meals"
                            value={stats.todaysMeals}
                            subtext="Breakfast, Lunch & Dinner"
                            icon={Utensils}
                            colorClass="text-orange-600"
                            borderClass="border-l-orange-500"
                            trend="up"
                        />
                        <AdminStatCard
                            title="System Alerts"
                            value={stats.alerts?.length || 0}
                            subtext={stats.alerts?.length > 0 ? stats.alerts[0] : "Requires attention"}
                            icon={AlertTriangle}
                            colorClass={stats.alerts?.length > 0 ? (stats.alerts[0] === 'All systems nominal' ? "text-green-600" : "text-red-600") : "text-red-600"}
                            borderClass={stats.alerts?.length > 0 ? (stats.alerts[0] === 'All systems nominal' ? "border-l-green-500" : "border-l-red-500") : "border-l-red-500"}
                            trend={stats.alerts?.length > 0 ? (stats.alerts[0] === 'All systems nominal' ? "neutral" : "down") : "down"}
                        />
                    </>
                )}
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7 animate-in fade-in slide-in-from-bottom-6 duration-700">
                {/* Main Charts */}
                {isLoading ? (
                    <div className="col-span-4 h-[400px] bg-slate-200 dark:bg-zinc-800 rounded-2xl animate-pulse" />
                ) : (
                    <Card className="col-span-4 modern-card border-none shadow-md">
                        <CardHeader>
                            <CardTitle>Meal Demand Trends</CardTitle>
                            <CardDescription>Expected vs Actual Consumption (Weekly)</CardDescription>
                        </CardHeader>
                        <CardContent className="pl-2">
                            <Overview data={analytics.mealDemand || []} />
                        </CardContent>
                    </Card>
                )}

                {/* Side Panel: Alerts & Wastage */}
                <div className="col-span-3 space-y-6">
                    {isLoading ? (
                        <>
                            <div className="h-[250px] bg-slate-200 dark:bg-zinc-800 rounded-2xl animate-pulse" />
                            <div className="h-[250px] bg-slate-200 dark:bg-zinc-800 rounded-2xl animate-pulse" />
                        </>
                    ) : (
                        <>
                            <Card className="modern-card border-none shadow-md">
                                <CardHeader>
                                    <CardTitle>Popular Food Items</CardTitle>
                                    <CardDescription>Top rated by students</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {(analytics.topItems || []).map((item: any, i) => (
                                            <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-gray-100 dark:hover:border-zinc-800">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center font-bold text-xs text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30">
                                                        #{i + 1}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold leading-none text-gray-900 dark:text-gray-100">{item.name}</p>
                                                        <p className="text-xs text-muted-foreground mt-0.5">{item.count} orders</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="modern-card border-none shadow-md">
                                <CardHeader>
                                    <CardTitle>Wastage Reduction</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <WastageChart data={analytics.wastageTrend || []} />
                                </CardContent>
                            </Card>
                        </>
                    )}
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7 animate-in fade-in slide-in-from-bottom-8 duration-700">
                {isLoading ? (
                    <div className="col-span-4 h-[400px] bg-slate-200 dark:bg-zinc-800 rounded-2xl animate-pulse" />
                ) : (
                    <Card className="col-span-4 modern-card border-none shadow-md">
                        <CardHeader>
                            <CardTitle>Revenue Overview</CardTitle>
                            <CardDescription>Estimated revenue based on meal consumption</CardDescription>
                        </CardHeader>
                        <CardContent className="pl-2">
                            <Overview data={analytics.revenueTrend || []} />
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
