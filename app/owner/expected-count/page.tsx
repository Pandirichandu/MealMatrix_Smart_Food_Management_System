"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { API_URL } from "@/lib/config";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Users, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import Link from "next/link";

interface Student {
    _id: string;
    studentId: string;
    name: string;
    email: string;
}

interface MealData {
    present: { count: number; students: Student[] };
    notComing: { count: number; students: Student[] };
    notResponded: { count: number; students: Student[] };
}

interface ExpectedCountResponse {
    breakfast: MealData;
    lunch: MealData;
    dinner: MealData;
}

export default function ExpectedCountPage() {
    const [date, setDate] = useState<string>("");
    const [data, setData] = useState<ExpectedCountResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    // Modal State
    const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
    const [modalTitle, setModalTitle] = useState<string>("");
    const [modalOpen, setModalOpen] = useState<boolean>(false);

    useEffect(() => {
        // Default to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const yyyy = tomorrow.getFullYear();
        const mm = String(tomorrow.getMonth() + 1).padStart(2, "0");
        const dd = String(tomorrow.getDate()).padStart(2, "0");
        setDate(`${yyyy}-${mm}-${dd}`);
    }, []);

    useEffect(() => {
        if (!date) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                const res = await axios.get(`${API_URL}/api/owner/expected-count?date=${date}`, {
                    withCredentials: true,
                });
                setData(res.data?.data || res.data);
            } catch (error) {
                console.error("Failed to fetch expected count", error);
                toast.error("Failed to load expected headcount data.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [date]);

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDate(e.target.value);
    };

    const openModal = (title: string, students: Student[]) => {
        setModalTitle(title);
        setSelectedStudents(students);
        setModalOpen(true);
    };

    const renderMealCard = (mealType: string, mealData: MealData) => {
        const total = mealData.present.count + mealData.notComing.count + mealData.notResponded.count;

        return (
            <Card className="flex flex-col h-full bg-white dark:bg-zinc-950 shadow-sm border-slate-200 dark:border-zinc-800">
                <CardHeader>
                    <CardTitle className="capitalize text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-zinc-100">
                        {mealType === "breakfast" ? "🥞" : mealType === "lunch" ? "🍛" : "🍲"} {mealType}
                    </CardTitle>
                    <CardDescription>
                        Expected count based on student responses.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                    <div className="flex flex-col gap-3">
                        {/* Present */}
                        <div
                            className="p-4 rounded-xl border border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-900/30 flex justify-between items-center cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/20 transition-colors"
                            onClick={() => openModal(`${mealType} - Present`, mealData.present.students)}
                        >
                            <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-semibold">
                                <Users className="w-4 h-4" />
                                <span>Present</span>
                            </div>
                            <span className="text-xl font-bold text-green-700 dark:text-green-400">{mealData.present.count}</span>
                        </div>

                        {/* Not Coming */}
                        <div
                            className="p-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900/30 flex justify-between items-center cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                            onClick={() => openModal(`${mealType} - Not Coming`, mealData.notComing.students)}
                        >
                            <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-semibold">
                                <Users className="w-4 h-4" />
                                <span>Not Coming</span>
                            </div>
                            <span className="text-xl font-bold text-red-700 dark:text-red-400">{mealData.notComing.count}</span>
                        </div>

                        {/* Not Responded */}
                        <div
                            className="p-4 rounded-xl border border-slate-200 bg-slate-50 dark:bg-zinc-900/50 dark:border-zinc-800 flex justify-between items-center cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-800/80 transition-colors"
                            onClick={() => openModal(`${mealType} - Not Responded`, mealData.notResponded.students)}
                        >
                            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-400 font-semibold">
                                <Users className="w-4 h-4" />
                                <span>Not Responded</span>
                            </div>
                            <span className="text-xl font-bold text-slate-700 dark:text-slate-400">{mealData.notResponded.count}</span>
                        </div>
                    </div>

                    <div className="pt-4 mt-auto border-t text-sm text-muted-foreground flex justify-between">
                        <span>Total Active Students</span>
                        <span className="font-semibold text-foreground">{total}</span>
                    </div>
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-black w-full overflow-y-auto">
            <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full pb-24">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Expected Headcount</h1>
                        <p className="text-muted-foreground mt-1">
                            Monitor meal intentions to optimize food preparation and reduce waste.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="date"
                                className="pl-10 pr-4 py-2 bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 border rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all dark:text-zinc-300 w-full"
                                value={date}
                                onChange={handleDateChange}
                            />
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => {
                                const tomorrow = new Date();
                                tomorrow.setDate(tomorrow.getDate() + 1);
                                setDate(`${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`);
                            }}
                        >
                            Tomorrow
                        </Button>
                        <Link href={`/owner/expected-count/master?date=${date}`}>
                            <Button variant="default">View All Students</Button>
                        </Link>
                    </div>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-4">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        <p className="text-muted-foreground font-medium">Loading expected headcount...</p>
                    </div>
                ) : data ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {renderMealCard("breakfast", data.breakfast)}
                        {renderMealCard("lunch", data.lunch)}
                        {renderMealCard("dinner", data.dinner)}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed rounded-xl bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800">
                        <Users className="w-12 h-12 text-slate-300 dark:text-zinc-700 mb-4" />
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-zinc-100">No data available</h3>
                        <p className="text-muted-foreground text-sm max-w-sm text-center mt-1">We couldn&apos;t load the expected headcount for this date.</p>
                    </div>
                )}
            </div>

            {/* Student List Modal */}
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-slate-900 dark:text-zinc-100">
                            {modalTitle}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="max-h-[60vh] overflow-y-auto pr-2 -mr-2 space-y-2 mt-4">
                        {selectedStudents.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground bg-slate-50 dark:bg-zinc-900/50 rounded-xl border border-dashed border-slate-200 dark:border-zinc-800">
                                No students found in this category.
                            </div>
                        ) : (
                            selectedStudents.map((student) => (
                                <div key={student._id} className="p-3 bg-slate-50 dark:bg-zinc-900/50 rounded-lg border border-slate-100 dark:border-zinc-800 flex justify-between items-center group hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors">
                                    <div>
                                        <div className="font-semibold text-slate-900 dark:text-zinc-100">{student.name}</div>
                                        <div className="text-xs text-muted-foreground">{student.email}</div>
                                    </div>
                                    <div className="text-sm font-medium px-2.5 py-1 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 shadow-sm rounded-md text-slate-600 dark:text-zinc-400">
                                        {student.studentId}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
