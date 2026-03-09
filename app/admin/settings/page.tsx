"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import axios from "axios";
import { API_URL } from "@/lib/config";
import { Loader2, Save, Clock } from "lucide-react";

type MealCutoff = {
    dayOffset: number;
    time: string;
};

type MealCutoffTimes = {
    breakfast: MealCutoff;
    lunch: MealCutoff;
    dinner: MealCutoff;
};

export default function SettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState({
        academicSession: "",
        mealBookingCutoffHours: 4,
        updatedAt: ""
    });
    const [mealCutoffTimes, setMealCutoffTimes] = useState<MealCutoffTimes>({
        breakfast: { dayOffset: -1, time: "22:30" },
        lunch: { dayOffset: 0, time: "09:30" },
        dinner: { dayOffset: 0, time: "14:30" },
    });

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/admin/settings`, { withCredentials: true });
                setSettings({
                    academicSession: res.data.academicSession || "",
                    mealBookingCutoffHours: res.data.mealBookingCutoffHours || 4,
                    updatedAt: res.data.updatedAt || new Date().toISOString()
                });
                if (res.data.mealCutoffTimes) {
                    setMealCutoffTimes({
                        breakfast: res.data.mealCutoffTimes.breakfast || { dayOffset: -1, time: "22:30" },
                        lunch: res.data.mealCutoffTimes.lunch || { dayOffset: 0, time: "09:30" },
                        dinner: res.data.mealCutoffTimes.dinner || { dayOffset: 0, time: "14:30" },
                    });
                }
            } catch (error) {
                console.error("Failed to fetch settings", error);
                toast.error("Failed to load settings");
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async () => {
        if (!settings.academicSession) {
            toast.error("Academic Session is required");
            return;
        }

        setSaving(true);
        try {
            const res = await axios.put(`${API_URL}/api/admin/settings`, {
                academicSession: settings.academicSession,
                mealBookingCutoffHours: Number(settings.mealBookingCutoffHours),
                mealCutoffTimes: mealCutoffTimes
            }, { withCredentials: true });

            toast.success("Settings updated successfully");
            setSettings({
                academicSession: res.data.academicSession,
                mealBookingCutoffHours: res.data.mealBookingCutoffHours,
                updatedAt: res.data.updatedAt
            });
            if (res.data.mealCutoffTimes) {
                setMealCutoffTimes(res.data.mealCutoffTimes);
            }
        } catch (error) {
            console.error("Failed to save settings", error);
            toast.error("Failed to update settings");
        } finally {
            setSaving(false);
        }
    };

    const formatDisplayTime = (time24: string) => {
        const [hours, minutes] = time24.split(":");
        let h = parseInt(hours, 10);
        const ampm = h >= 12 ? "PM" : "AM";
        h = h % 12;
        h = h ? h : 12; // the hour '0' should be '12'
        return `${h}:${minutes} ${ampm}`;
    };

    const updateCutoff = (meal: keyof MealCutoffTimes, field: keyof MealCutoff, value: any) => {
        setMealCutoffTimes(prev => ({
            ...prev,
            [meal]: {
                ...prev[meal],
                [field]: value
            }
        }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-100px)]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const mealCards: { key: keyof MealCutoffTimes, title: string, color: string }[] = [
        { key: 'breakfast', title: 'Breakfast', color: 'border-green-200 dark:border-green-900/30' },
        { key: 'lunch', title: 'Lunch', color: 'border-orange-200 dark:border-orange-900/30' },
        { key: 'dinner', title: 'Dinner', color: 'border-indigo-200 dark:border-indigo-900/30' }
    ];

    return (
        <div className="flex-1 space-y-6 p-8 pt-6 bg-gray-50/50 dark:bg-zinc-950 min-h-screen pb-24">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50">System Settings</h2>
            </div>

            <div className="grid gap-6 max-w-4xl">
                <Card className="modern-card border-none shadow-md">
                    <CardHeader>
                        <CardTitle>Global Configurations</CardTitle>
                        <CardDescription>Manage academic year parameters.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid gap-3">
                            <Label htmlFor="session" className="text-sm font-medium">Academic Session</Label>
                            <Input
                                id="session"
                                value={settings.academicSession}
                                onChange={(e) => setSettings({ ...settings, academicSession: e.target.value })}
                                placeholder="e.g. 2025-2026"
                                className="max-w-md"
                            />
                            <p className="text-[0.8rem] text-muted-foreground">
                                Displayed on reports and dashboard.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="modern-card border-none shadow-md">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <Clock className="w-5 h-5 text-primary" />
                            Meal Booking Cutoff Configuration
                        </CardTitle>
                        <CardDescription>
                            Configure exactly when students must book or cancel their meals.
                            Set the Day relative to the meal date (e.g. Previous Day or Same Day) and the exact Time.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid md:grid-cols-3 gap-4">
                            {mealCards.map(({ key, title, color }) => (
                                <Card key={key} className={`border bg-card shadow-sm ${color}`}>
                                    <div className="p-5 space-y-4">
                                        <div className="font-semibold text-lg border-b pb-2">{title}</div>
                                        <div className="space-y-3">
                                            <div className="space-y-1">
                                                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Day Offset</Label>
                                                <Select
                                                    value={mealCutoffTimes[key].dayOffset.toString()}
                                                    onValueChange={(val) => updateCutoff(key, "dayOffset", parseInt(val))}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="-1">Previous Day</SelectItem>
                                                        <SelectItem value="0">Same Day</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Exact Time</Label>
                                                <Input
                                                    type="time"
                                                    value={mealCutoffTimes[key].time}
                                                    onChange={(e) => updateCutoff(key, "time", e.target.value)}
                                                />
                                            </div>
                                            <div className="pt-2">
                                                <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-zinc-900 border dark:border-zinc-800 p-2 rounded-md">
                                                    Students cannot book {title} after <strong className="font-semibold"> {mealCutoffTimes[key].dayOffset === -1 ? 'Previous Day' : 'Same Day'} {formatDisplayTime(mealCutoffTimes[key].time)}</strong>.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <div className="flex items-center justify-between pt-6 border-t">
                    <div className="text-xs text-muted-foreground">
                        Last Updated: {new Date(settings.updatedAt).toLocaleString()}
                    </div>
                    <Button onClick={handleSave} disabled={saving} size="lg" className="w-full md:w-auto md:min-w-48 font-semibold shadow-xl shadow-primary/20">
                        {saving ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Saving Changes
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-5 w-5" /> Save Configuration
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}

