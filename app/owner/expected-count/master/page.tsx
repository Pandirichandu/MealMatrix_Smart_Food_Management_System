"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import axios from "axios";
import { API_URL } from "@/lib/config";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Calendar, Search, Download, ArrowLeft, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface StudentIntention {
    _id: string;
    studentId: string;
    name: string;
    email: string;
    breakfast: "present" | "not_coming" | "not_responded";
    lunch: "present" | "not_coming" | "not_responded";
    dinner: "present" | "not_coming" | "not_responded";
}

function MasterIntentionView() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [date, setDate] = useState<string>(searchParams.get("date") || "");
    const [students, setStudents] = useState<StudentIntention[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Fallback date initialization if query parameter is empty
    useEffect(() => {
        if (!date) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const yyyy = tomorrow.getFullYear();
            const mm = String(tomorrow.getMonth() + 1).padStart(2, "0");
            const dd = String(tomorrow.getDate()).padStart(2, "0");
            setDate(`${yyyy}-${mm}-${dd}`);
        }
    }, [date]);

    useEffect(() => {
        if (!date) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                const res = await axios.get(`${API_URL}/api/owner/expected-count/master?date=${date}`, {
                    withCredentials: true,
                });
                setStudents(res.data?.data?.students || []);
            } catch (error) {
                console.error("Failed to fetch master intentions", error);
                toast.error("Failed to load master expected headcount data.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [date]);

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = e.target.value;
        setDate(newDate);
        // Optional: Update URL to reflect the new date without reloading
        window.history.replaceState(null, "", `?date=${newDate}`);
    };

    const handleExportCSV = () => {
        if (students.length === 0) {
            toast.error("No data available to export");
            return;
        }

        const mapStatus = (status: string) => {
            if (status === "present") return "Present";
            if (status === "not_coming") return "Not Coming";
            return "Not Responded";
        };

        const headers = ["Name", "Student ID", "Breakfast", "Lunch", "Dinner", "Date"];
        const rows = filteredStudents.map(student => [
            `"${student.name}"`,
            `"${student.studentId}"`,
            `"${mapStatus(student.breakfast)}"`,
            `"${mapStatus(student.lunch)}"`,
            `"${mapStatus(student.dinner)}"`,
            `"${date}"`
        ]);

        const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Master_Expected_Count_${date}.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filteredStudents = useMemo(() => {
        const query = searchQuery.toLowerCase();
        return students.filter(student =>
            student.name.toLowerCase().includes(query) ||
            student.studentId.toLowerCase().includes(query) ||
            (student.email && student.email.toLowerCase().includes(query))
        );
    }, [students, searchQuery]);

    const renderStatusIcon = (status: string) => {
        if (status === "present") return <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" />;
        if (status === "not_coming") return <XCircle className="w-5 h-5 text-red-500 mx-auto" />;
        return <MinusCircle className="w-5 h-5 text-slate-400 mx-auto" />;
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-black w-full overflow-y-auto">
            <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full pb-24">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div>
                        <Button
                            variant="ghost"
                            className="pl-0 hover:bg-transparent text-muted-foreground hover:text-foreground mb-2"
                            onClick={() => router.push(`/owner/expected-count?date=${date}`)}
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Summary
                        </Button>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Master Student Intentions</h1>
                        <p className="text-muted-foreground mt-1">
                            A complete roster view of all students and their declared meal intentions.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                        <div className="relative w-full sm:w-auto">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="date"
                                className="pl-10 pr-4 py-2 h-10 bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 border rounded-md text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all dark:text-zinc-300 w-full"
                                value={date}
                                onChange={handleDateChange}
                            />
                        </div>
                        <Button
                            variant="default"
                            className="w-full sm:w-auto shadow-sm"
                            onClick={handleExportCSV}
                            disabled={loading || students.length === 0}
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Export CSV
                        </Button>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-zinc-950 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm">
                    {/* Search Bar */}
                    <div className="relative w-full md:max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name, student ID, or email..."
                            className="pl-10 bg-slate-50 dark:bg-zinc-900/50"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Legend */}
                    <div className="flex items-center gap-4 text-sm font-medium pr-2 w-full md:w-auto justify-end">
                        <div className="flex items-center gap-1.5 opacity-90">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            <span>Present</span>
                        </div>
                        <div className="flex items-center gap-1.5 opacity-90">
                            <XCircle className="w-4 h-4 text-red-500" />
                            <span>Not Coming</span>
                        </div>
                        <div className="flex items-center gap-1.5 opacity-90 truncate">
                            <MinusCircle className="w-4 h-4 text-slate-400" />
                            <span>Not Responded</span>
                        </div>
                    </div>
                </div>

                {/* Content Table */}
                <Card className="shadow-sm border-slate-200 dark:border-zinc-800">
                    <CardContent className="p-0 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left align-middle border-collapse">
                                <thead className="text-xs uppercase bg-slate-50 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold tracking-wider">Student Name</th>
                                        <th className="px-6 py-4 font-semibold tracking-wider">Student ID</th>
                                        <th className="px-6 py-4 font-semibold tracking-wider text-center">Breakfast</th>
                                        <th className="px-6 py-4 font-semibold tracking-wider text-center">Lunch</th>
                                        <th className="px-6 py-4 font-semibold tracking-wider text-center">Dinner</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-32 text-center">
                                                <div className="flex flex-col items-center justify-center space-y-3">
                                                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                                    <p className="text-muted-foreground font-medium">Loading massive roster intention list...</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : filteredStudents.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-16 text-center text-muted-foreground border-b border-slate-100 dark:border-zinc-800">
                                                No students found matching your criteria.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredStudents.map((student, idx) => (
                                            <tr
                                                key={student._id}
                                                className={`
                                                    border-b border-slate-100 dark:border-zinc-800/80 last:border-0 
                                                    hover:bg-slate-50/80 dark:hover:bg-zinc-900/30 transition-colors
                                                `}
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-slate-900 dark:text-white">{student.name}</span>
                                                        <span className="text-xs text-muted-foreground font-medium">{student.email}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="font-medium px-2.5 py-1 bg-slate-100 dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 rounded-md border border-slate-200 dark:border-zinc-800">
                                                        {student.studentId}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap border-l border-slate-100 dark:border-zinc-800/50">
                                                    {renderStatusIcon(student.breakfast)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap border-l border-slate-100 dark:border-zinc-800/50">
                                                    {renderStatusIcon(student.lunch)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap border-l border-slate-100 dark:border-zinc-800/50">
                                                    {renderStatusIcon(student.dinner)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}

export default function Page() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center p-32"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
            <MasterIntentionView />
        </Suspense>
    );
}
