"use client"

import { useEffect, useState } from "react"
import { Overview } from "@/components/dashboard/overview"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, IndianRupee, Utensils, TrendingUp, Loader2 } from "lucide-react"
import axios from "axios"
import { toast } from "sonner"
import { API_URL } from "@/lib/config"

export default function AnalyticsPage() {
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<any>(null)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/admin/analytics`, {
                    withCredentials: true
                })
                setData(res.data?.data || res.data)
            } catch (error) {
                console.error("Failed to fetch analytics", error)
                toast.error("Failed to load analytics data")
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-100px)]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!data) {
        return (
            <div className="flex-1 p-8 pt-6">
                <div className="flex items-center justify-center h-[50vh] text-muted-foreground">
                    <div className="text-center">
                        <AlertCircle className="mx-auto h-10 w-10 mb-4 opacity-50" />
                        <h3 className="text-lg font-medium">No Data Available</h3>
                        <p>Could not retrieve analytics data at this time.</p>
                    </div>
                </div>
            </div>
        )
    }

    // Calculate totals for summary cards
    const totalRevenue = data.revenueTrend?.reduce((acc: number, item: any) => acc + (item.total || 0), 0) || 0
    const totalWastage = data.wastageTrend?.reduce((acc: number, item: any) => acc + (item.today || 0), 0) || 0
    const topItem = data.topItems?.[0]?.name || "N/A"

    return (
        <div className="flex-1 space-y-6 p-8 pt-6 bg-gray-50/50 dark:bg-zinc-950 min-h-screen">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50">System Analytics</h2>
                    <p className="text-muted-foreground">Detailed breakdown of revenue, consumption, and wastage.</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Card className="shadow-sm hover:shadow-lg transition-all">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Weekly Revenue
                        </CardTitle>
                        <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                            <IndianRupee className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{totalRevenue.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Estimated based on meal consumption
                        </p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm hover:shadow-lg transition-all">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Avg. Daily Wastage
                        </CardTitle>
                        <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                            <TrendingUp className="h-4 w-4 text-red-600 dark:text-red-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{Math.round(totalWastage / 7)} plates</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Reported wastage across hostels
                        </p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm hover:shadow-lg transition-all">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Top Dish
                        </CardTitle>
                        <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                            <Utensils className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold truncate">{topItem}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Most popular item this week
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4 shadow-md border-0 ring-1 ring-gray-100 dark:ring-zinc-800">
                    <CardHeader>
                        <CardTitle>Meals Served</CardTitle>
                        <CardDescription>
                            Daily meal consumption over the last 7 days
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <Overview data={data.mealDemand || []} />
                    </CardContent>
                </Card>
                <Card className="col-span-3 shadow-md border-0 ring-1 ring-gray-100 dark:ring-zinc-800">
                    <CardHeader>
                        <CardTitle>Top Dishes Consumption</CardTitle>
                        <CardDescription>
                            Total plates ordered this week
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {!data.topItems || data.topItems.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No selections yet.</p>
                            ) : data.topItems.map((food: any, idx: number) => (
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
                        </div>
                    </CardContent>
                </Card>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4 shadow-md border-0 ring-1 ring-gray-100 dark:ring-zinc-800">
                    <CardHeader>
                        <CardTitle>Revenue Trend</CardTitle>
                        <CardDescription>
                            Estimated daily revenue
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <Overview data={data.revenueTrend || []} />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
