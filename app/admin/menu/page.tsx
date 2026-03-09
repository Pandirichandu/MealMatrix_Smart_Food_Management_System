"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CalendarDays, ChefHat, Loader2, Utensils } from "lucide-react";
import { API_URL } from "@/lib/config";
import { toast } from "sonner";
import axios from "axios";

export default function MenuPage() {
    const [loading, setLoading] = useState(true);
    const [menuData, setMenuData] = useState<any>(null);
    const [hostels, setHostels] = useState<any[]>([]);
    const [selectedHostel, setSelectedHostel] = useState<string>("");
    const [dates, setDates] = useState<string[]>([]);

    useEffect(() => {
        const fetchHostels = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/admin/hostels`, { withCredentials: true });
                setHostels(res.data);
                if (res.data.length > 0) {
                    setSelectedHostel(res.data[0]._id);
                } else {
                    setLoading(false);
                }
            } catch (error) {
                console.error("Failed to fetch hostels", error);
                toast.error("Failed to load hostels");
                setLoading(false);
            }
        };
        fetchHostels();
    }, []);

    useEffect(() => {
        if (!selectedHostel) return;

        const fetchMenu = async () => {
            setLoading(true);
            try {
                const res = await axios.get(`${API_URL}/api/admin/menu/weekly?hostelId=${selectedHostel}`, {
                    withCredentials: true
                });
                setMenuData(res.data.menu);
                setDates(Object.keys(res.data.menu));
            } catch (error) {
                console.error("Failed to fetch menu", error);
                toast.error("Failed to load menu data");
            } finally {
                setLoading(false);
            }
        };

        fetchMenu();
    }, [selectedHostel]);

    if (loading && !menuData) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-100px)]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // Generate YYYY-MM-DD from local time to match Owner/Student consistency
    const todayObj = new Date();
    const year = todayObj.getFullYear();
    const month = String(todayObj.getMonth() + 1).padStart(2, '0');
    const day = String(todayObj.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    // Calculate next 7 days for Tabs
    const next7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dy = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${dy}`;
    });

    // ... (imports remain)

    // ... (data fetching remains)

    // Helper to check if a menu is published and has items
    const isMenuAvailable = (items: any[]) => {
        // In the future this can also check for status === 'PUBLISHED'
        // For now, cleaner data means empty array = not updated.
        return items && items.length > 0;
    };

    return (
        <div className="flex-1 space-y-6 p-8 pt-6 bg-gray-50/50 dark:bg-zinc-950 min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50">Menu Overview</h2>
                    <p className="text-muted-foreground">View the weekly approved meal plan across hostels.</p>
                </div>
                <div className="w-full md:w-[250px]">
                    <Select value={selectedHostel} onValueChange={setSelectedHostel}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select Hostel" />
                        </SelectTrigger>
                        <SelectContent>
                            {hostels.map((h) => (
                                <SelectItem key={h._id} value={h._id}>{h.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Tabs defaultValue={next7Days[0]} className="space-y-6">
                <div className="overflow-x-auto pb-2">
                    <TabsList className="w-full flex justify-start h-auto p-1 bg-transparent gap-2">
                        {next7Days.map((dateStr) => {
                            const date = new Date(dateStr);
                            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                            const dayNum = date.getDate();
                            const isToday = dateStr === todayStr;

                            return (
                                <TabsTrigger
                                    key={dateStr}
                                    value={dateStr}
                                    className={`flex flex-col items-center h-16 w-16 gap-1 rounded-xl border data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary transition-all ${isToday ? 'border-blue-200 bg-blue-50/50' : 'border-transparent bg-white dark:bg-zinc-900'}`}
                                >
                                    <span className="text-xs font-medium uppercase opacity-70">{dayName}</span>
                                    <span className="text-lg font-bold">{dayNum}</span>
                                </TabsTrigger>
                            );
                        })}
                    </TabsList>
                </div>

                {next7Days.map((dateStr) => {
                    // Safe access if menuData is null/undefined
                    const dayMenu = (menuData && menuData[dateStr]) || { breakfast: [], lunch: [], dinner: [] };

                    // Helper for status check (reused from previous step logic)
                    // We pass raw items + status to MealCard to let it decide layout

                    return (
                        <TabsContent key={dateStr} value={dateStr} className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="grid gap-6 md:grid-cols-3">
                                {/* Breakfast */}
                                <MealCard
                                    title="Breakfast"
                                    time="7:30 AM - 9:30 AM"
                                    items={dayMenu.breakfast || []}
                                    status={dayMenu.breakfastStatus}
                                    icon={<Utensils className="h-4 w-4" />}
                                />

                                {/* Lunch */}
                                <MealCard
                                    title="Lunch"
                                    time="12:30 PM - 2:30 PM"
                                    items={dayMenu.lunch || []}
                                    status={dayMenu.lunchStatus}
                                    icon={<Utensils className="h-4 w-4" />}
                                />

                                {/* Dinner */}
                                <MealCard
                                    title="Dinner"
                                    time="7:30 PM - 9:30 PM"
                                    items={dayMenu.dinner || []}
                                    status={dayMenu.dinnerStatus}
                                    icon={<Utensils className="h-4 w-4" />}
                                />
                            </div>
                        </TabsContent>
                    );
                })}
            </Tabs>
        </div>
    );
}

function MealCard({ title, time, items, status, icon }: { title: string, time: string, items: any[], status?: string, icon: any }) {
    // Determine explicit state for Badges and Empty Messages
    const isDraft = status === 'DRAFT';
    const isPublished = status === 'PUBLISHED';
    const hasItems = items && items.length > 0;

    // Status Badge Logic
    let statusBadge = null;
    if (isDraft) {
        statusBadge = <Badge variant="secondary" className="bg-gray-200 text-gray-700 hover:bg-gray-200">DRAFT</Badge>;
    } else if (isPublished && hasItems) {
        statusBadge = <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">PUBLISHED</Badge>;
    } else if (hasItems) {
        // Fallback if status undefined but has items -> Assume Published
        statusBadge = <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">PUBLISHED</Badge>;
    }

    // Empty State Logic
    if (!hasItems) {
        let emptyMessage = "Menu Not Created";
        let emptyIcon = <AlertCircle className="h-6 w-6 text-gray-300" />;

        if (isDraft) {
            emptyMessage = "Menu Saved as Draft";
            emptyIcon = <Loader2 className="h-6 w-6 text-blue-300" />; // Or specific Draft icon
        } else if (isPublished) {
            // Should theoretically not happen if validation prevents publishing empty, but handle it
            emptyMessage = "Published (Empty)";
        }

        return (
            <Card className="h-full border-dashed bg-gray-50/50 dark:bg-zinc-900/50 opacity-100 border-2">
                <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                        <CardTitle className="flex items-center gap-2 text-lg text-muted-foreground opacity-70">
                            {icon} {title}
                        </CardTitle>
                        {isDraft && statusBadge}
                    </div>
                </CardHeader>
                <CardContent className="h-40 flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
                    <div className="p-3 bg-gray-100 dark:bg-zinc-800 rounded-full opacity-50">
                        {emptyIcon}
                    </div>
                    <span className="font-medium text-gray-500">{emptyMessage}</span>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="h-full overflow-hidden hover:shadow-lg transition-all duration-300 border-gray-200 dark:border-zinc-800">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-white dark:from-zinc-900 dark:to-zinc-900/50 border-b pb-4">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-xl font-bold">
                            {icon} {title}
                        </CardTitle>
                        <CardDescription className="mt-1 font-medium text-xs bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full inline-block">
                            {time}
                        </CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-0">
                            {items.length} Dishes
                        </Badge>
                        {statusBadge}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-3">
                    {items.map((item: any, idx: number) => (
                        <div key={idx} className="group relative flex flex-col rounded-xl overflow-hidden border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:border-primary/30 transition-all">
                            <div className="aspect-[4/3] w-full bg-gray-100 overflow-hidden relative">
                                {item.imageUrl ? (
                                    <img
                                        src={item.imageUrl}
                                        alt={item.foodName}
                                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                ) : (
                                    <div className="h-full w-full flex items-center justify-center bg-gray-50 dark:bg-zinc-800">
                                        <ChefHat className="h-8 w-8 text-muted-foreground/30" />
                                    </div>
                                )}
                                <div className="absolute top-2 left-2">
                                    <Badge
                                        variant={item.vegOrNonVeg === 'veg' ? 'default' : 'destructive'}
                                        className={`h-5 px-1.5 text-[10px] shadow-sm backdrop-blur-md ${item.vegOrNonVeg === 'veg' ? 'bg-green-500/90 text-white' : 'bg-red-500/90 text-white'}`}
                                    >
                                        {item.vegOrNonVeg === 'veg' ? 'VEG' : 'NON-VEG'}
                                    </Badge>
                                </div>
                            </div>
                            <div className="p-2.5 flex flex-col gap-1">
                                <span className="font-semibold text-xs line-clamp-2 leading-tight min-h-[2.5em]" title={item.foodName}>
                                    {item.foodName}
                                </span>
                                {item.isCustomDish && (
                                    <span className="text-[10px] text-orange-600 font-medium bg-orange-50 dark:bg-orange-900/20 px-1 rounded w-fit">
                                        Special
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
