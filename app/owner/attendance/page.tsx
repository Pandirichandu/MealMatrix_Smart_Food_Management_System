"use client";

import { useEffect, useState, useRef } from "react";
import axios from "axios";
import {
    Search,
    Download,
    CheckCircle2,
    XCircle,
    Clock,
    Minus,
    AlertCircle
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { API_URL } from "@/lib/config";
import { cn } from "@/lib/utils";

// Types
interface AttendanceStatus {
    status: string;
    time: string;
}

interface StudentGridRow {
    studentId: string; // Changed from _id to studentId to match response
    name: string;
    rollNumber: string;
    status: 'active' | 'inactive';
    attendance: {
        breakfast: boolean;
        lunch: boolean;
        dinner: boolean;
    };
}

export default function AttendancePage() {
    // State
    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState<StudentGridRow[]>([]);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [search, setSearch] = useState("");
    const [currentTime, setCurrentTime] = useState(new Date());

    // Update Time every minute for status logic
    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(interval);
    }, []);

    // Fetch Data
    const fetchGrid = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/api/owner/attendance-grid`, {
                params: { date, search },
                withCredentials: true
            });
            setStudents(res.data.grid);
        } catch (err) {
            console.error("Failed to fetch attendance grid:", err);
        } finally {
            setLoading(false);
        }
    };

    // Initial Load & Debounce Search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchGrid();
        }, 500);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [date, search]);

    // Auto-Refresh Grid every 15 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            // Background refresh (silent)
            axios.get(`${API_URL}/api/owner/attendance-grid`, {
                params: { date, search },
                withCredentials: true
            }).then(res => setStudents(res.data.grid)).catch(console.error);
        }, 15000);
        return () => clearInterval(interval);
    }, [date, search]);

    // Export Handler
    const handleExport = () => {
        const url = `${API_URL}/api/owner/attendance/export?date=${date}&search=${search}`;
        window.open(url, '_blank');
    };

    // Helper: Determine Meal Status Icon
    const getMealStatusIcon = (mealType: 'breakfast' | 'lunch' | 'dinner', attended: boolean) => {
        // 1. If Attended -> Green Check
        if (attended) {
            return (
                <div className="flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-green-500 animate-in zoom-in duration-300" />
                </div>
            )
        }

        // 2. Logic for Time Windows
        // Get limits from requirement
        // Breakfast: 7:30 - 9:30
        // Lunch: 12:30 - 14:30
        // Dinner: 19:30 - 21:30

        // Parse System Time
        const now = currentTime;
        const currentHour = now.getHours();
        const currentMin = now.getMinutes();
        const timeVal = currentHour + currentMin / 60;

        // Verify Date: Is the selected date TODAY?
        const selectedDate = new Date(date);
        const todayStr = new Date().toISOString().split('T')[0];

        // Simple string comparison for dates YYYY-MM-DD
        const isToday = date === todayStr;
        const isPastDate = date < todayStr;
        const isFutureDate = date > todayStr;

        if (isFutureDate) return <span className="text-muted-foreground font-mono">-</span>;

        if (isPastDate) {
            // If past date and no attendance -> Missed
            return (
                <div className="flex items-center justify-center">
                    <XCircle className="h-5 w-5 text-red-300 dark:text-red-900/50" />
                </div>
            );
        }

        // It is TODAY. Check windows.
        let start, end;
        if (mealType === 'breakfast') { start = 7.5; end = 9.5; } // 7:30 - 9:30
        else if (mealType === 'lunch') { start = 12.5; end = 14.5; } // 12:30 - 14:30
        else { start = 19.5; end = 21.5; } // 19:30 - 21:30

        if (timeVal < start) {
            // Before session
            return <span className="text-muted-foreground font-mono">-</span>;
        } else if (timeVal >= start && timeVal <= end) {
            // Active Session -> Pending (Hourglass)
            return (
                <div className="flex items-center justify-center animate-pulse">
                    <Clock className="h-5 w-5 text-amber-500" />
                </div>
            );
        } else {
            // After session -> Missed (Cross)
            return (
                <div className="flex items-center justify-center">
                    <XCircle className="h-5 w-5 text-red-300 dark:text-red-900/50" />
                </div>
            );
        }
    };

    return (
        <div className="flex-1 space-y-6 p-8 min-h-screen bg-slate-50/50 dark:bg-black/20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 glass p-6 rounded-2xl shadow-sm border border-white/20">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
                        Attendance Grid
                        <span className="text-xs font-normal px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-muted-foreground">
                            {date}
                        </span>
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">Real-time attendance tracking across all meal sessions.</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Date Picker */}
                    <Input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-[180px] bg-white dark:bg-zinc-900 border-gray-200 rounded-xl h-10"
                    />
                    <Button variant="outline" onClick={handleExport} className="h-10 px-4 rounded-xl border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-400 dark:hover:bg-blue-900/20 font-medium transition-all shadow-sm gap-2">
                        <Download className="h-4 w-4" />
                        Export
                    </Button>
                </div>
            </div>

            {/* Controls Row (Search Only) */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search by student name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 w-full bg-white dark:bg-zinc-900 border-gray-200 rounded-xl h-10 shadow-sm focus:ring-1 focus:ring-primary/20"
                />
            </div>

            {/* Data Grid */}
            <div className="modern-card bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
                <Table>
                    <TableHeader className="bg-slate-50 dark:bg-zinc-900/50">
                        <TableRow className="hover:bg-transparent border-gray-100 dark:border-zinc-800">
                            <TableHead className="py-4 pl-6 font-semibold w-[30%] text-gray-900 dark:text-gray-100">Student</TableHead>
                            <TableHead className="py-4 font-semibold w-[10%] text-gray-900 dark:text-gray-100">Status</TableHead>
                            <TableHead className="py-4 font-semibold text-center w-[20%] text-gray-900 dark:text-gray-100">Breakfast</TableHead>
                            <TableHead className="py-4 font-semibold text-center w-[20%] text-gray-900 dark:text-gray-100">Lunch</TableHead>
                            <TableHead className="py-4 font-semibold text-center w-[20%] text-gray-900 dark:text-gray-100">Dinner</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                        Details loading...
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : students.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                    No students found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            students.map((student) => {
                                const isInactive = student.status === 'inactive';

                                return (
                                    <TableRow
                                        key={student.studentId}
                                        className={cn(
                                            "transition-colors border-gray-50 dark:border-zinc-800/50",
                                            isInactive ? "bg-gray-100/80 dark:bg-zinc-900/90 opacity-60 grayscale cursor-not-allowed" : "hover:bg-slate-50 dark:hover:bg-white/5",
                                        )}
                                    >
                                        <TableCell className="py-3 pl-6">
                                            <div>
                                                <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                                    {student.name}
                                                </div>
                                                <div className="text-xs text-muted-foreground font-mono mt-0.5">{student.rollNumber || "ID: " + student.studentId?.substring(student.studentId.length - 6)}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-3">
                                            <Badge variant={isInactive ? "destructive" : "secondary"} className={cn("capitalize", isInactive ? "opacity-100" : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400")}>
                                                {student.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center py-3 border-l border-r border-gray-50 dark:border-white/5">
                                            {getMealStatusIcon('breakfast', student.attendance.breakfast)}
                                        </TableCell>
                                        <TableCell className="text-center py-3 border-r border-gray-50 dark:border-white/5">
                                            {getMealStatusIcon('lunch', student.attendance.lunch)}
                                        </TableCell>
                                        <TableCell className="text-center py-3">
                                            {getMealStatusIcon('dinner', student.attendance.dinner)}
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="flex justify-center gap-6 text-xs text-muted-foreground mt-4 font-medium opacity-80">
                <div className="flex items-center gap-1.5"><span className="font-mono text-base">-</span> Upcoming</div>
                <div className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-amber-500" /> Session Active</div>
                <div className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> Present</div>
                <div className="flex items-center gap-1.5"><XCircle className="h-3.5 w-3.5 text-red-300" /> Absent</div>
            </div>
        </div>
    );
}
