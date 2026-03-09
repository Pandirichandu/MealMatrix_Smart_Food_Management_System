"use client"
import { Overview } from "@/components/dashboard/overview";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import axios from "axios";
import { API_URL } from "@/lib/config";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

// ... imports
import { Users, IndianRupee, TrendingUp, TrendingDown } from "lucide-react";

export default function OwnerReportsPage() {
    // ... state ...
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [stats, setStats] = useState({
        chartData: [],
        revenueTrend: [],
        totalStudents: 0,
        estimatedRevenue: {
            total: 0
        },
        topItems: [],
        wastageTrend: []
    });

    const fetchReports = async () => {
        setLoading(true);
        setError(false);
        try {
            const res = await axios.get(`${API_URL}/api/owner/reports/performance`, { withCredentials: true });
            const data = res.data;
            console.log("Reports API FULL Response:", data);

            const { chartData, revenueTrend, totalStudents, topItems, wastageTrend } = data;

            // Calculate total exact revenue
            const totalRevenueExact = (revenueTrend || []).reduce((acc: number, item: any) => acc + (item.total || 0), 0);

            setStats({
                chartData: chartData || [],
                revenueTrend: revenueTrend || [],
                totalStudents: totalStudents || 0,
                estimatedRevenue: { total: totalRevenueExact },
                topItems: topItems || [],
                wastageTrend: wastageTrend || []
            });

        } catch (err) {
            console.error("Reports Fetch Error:", err);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, []);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    // ... loading / error states ... (keep existing)

    return (
        <div className="flex-1 space-y-6 p-8 pt-6 min-h-screen bg-gray-50 dark:bg-zinc-950">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-gray-50">Analytics & Reports</h2>
                    <p className="text-muted-foreground mt-1">Real-time insights on meal consumption and estimated costs.</p>
                </div>
                <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-full shadow-sm border border-gray-200 dark:border-zinc-800">
                    <div className={`h-2.5 w-2.5 rounded-full ${loading ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{loading ? 'Updating...' : 'Live System'}</span>
                </div>
            </div>

            {/* KPI CARDS */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="modern-card border-none shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Est. Weekly Revenue</CardTitle>
                        <IndianRupee className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900 dark:text-gray-50">{formatCurrency(stats.estimatedRevenue.total)}</div>
                        <p className="text-xs text-muted-foreground mt-1">Exact sum of item prices * quantity</p>
                    </CardContent>
                </Card>
                <Card className="modern-card border-none shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Served</CardTitle>
                        <Users className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900 dark:text-gray-50">
                            {(stats.chartData.reduce((acc: number, curr: any) => acc + (curr.total || 0), 0) as number).toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Meals served this week</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4 modern-card border-none shadow-md">
                    <CardHeader>
                        <CardTitle>Meal Consumption Trends</CardTitle>
                        <CardDescription>Daily breakdown of Breakfast, Lunch, and Dinner.</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <Overview data={stats.chartData} />
                    </CardContent>
                </Card>

                <Card className="col-span-3 modern-card border-none shadow-md bg-white/50 backdrop-blur-sm dark:bg-zinc-900/50">
                    <CardHeader>
                        <CardTitle>Top Performing Items</CardTitle>
                        <CardDescription>
                            Highest quantity consumed this week.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {stats.topItems?.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No dishes ordered yet.</p>
                            ) : stats.topItems?.map((food: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-xs text-gray-500 border border-gray-200 dark:border-zinc-700">
                                            #{idx + 1}
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium leading-none line-clamp-1">{food.name}</p>
                                            <p className="text-xs text-muted-foreground">{food.count} plates</p>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <div className="pt-4 mt-4 border-t border-gray-100 dark:border-zinc-800 flex justify-between items-center bg-gray-50 dark:bg-zinc-800/50 p-3 rounded-lg">
                                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Total Calculated Revenue</span>
                                <span className="text-lg font-bold text-green-600 dark:text-green-400">
                                    {formatCurrency(stats.estimatedRevenue.total)}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
