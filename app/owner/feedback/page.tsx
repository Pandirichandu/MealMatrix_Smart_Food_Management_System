"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";
import { API_URL } from "@/lib/config";

export default function OwnerFeedbackPage() {
    const [feedbacks, setFeedbacks] = useState<any[]>([]);
    const [summary, setSummary] = useState({ averageRating: 0, totalReviews: 0 });
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("Overall");

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                let query = "";
                if (filter !== "Overall") {
                    query = `?mealType=${filter.toLowerCase()}`;
                }
                const [feedbackRes, summaryRes] = await Promise.all([
                    axios.get(`${API_URL}/api/owner/feedback${query}`, { withCredentials: true }),
                    axios.get(`${API_URL}/api/owner/feedback/summary${query}`, { withCredentials: true })
                ]);
                setFeedbacks(feedbackRes.data);
                setSummary(summaryRes.data);
            } catch (err) {
                console.error("Failed to fetch data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [filter]);

    const formatDate = (dateString: string) => {
        if (!dateString) return "Recently";
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            hour12: true
        }).format(date);
    };

    return (
        <div className="flex-1 space-y-6 p-8 pt-6 min-h-screen bg-gray-50 dark:bg-zinc-950">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-gray-50">Student Feedback</h2>
                    <p className="text-muted-foreground mt-1">Recent ratings and reviews from students.</p>
                </div>

                {/* Summary Card */}
                {!loading && (
                    <Card className="border-none shadow-sm bg-blue-600 text-white min-w-[200px]">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                <Star className="h-6 w-6 text-yellow-300 fill-yellow-300" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold leading-none">
                                    {summary.averageRating} <span className="text-sm font-normal opacity-80">/ 5</span>
                                </div>
                                <div className="text-xs opacity-80 mt-1 font-medium select-none">
                                    {summary.totalReviews} Reviews
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 border-b border-gray-200 dark:border-zinc-800 pb-px overflow-x-auto scroolbar-hide">
                {['Overall', 'Breakfast', 'Lunch', 'Dinner'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setFilter(tab)}
                        className={`px-5 py-2.5 text-sm font-semibold whitespace-nowrap transition-all border-b-2 ${filter === tab
                            ? "border-blue-600 text-blue-600 dark:text-blue-400"
                            : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-zinc-700"
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {loading ? (
                    <div className="col-span-full text-center py-20 text-muted-foreground">Loading feedback...</div>
                ) : feedbacks.length > 0 ? (
                    feedbacks.map(f => (
                        <Card key={f._id} className="modern-card border-none shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden group">
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-lg shadow-sm border border-blue-100 dark:border-blue-800">
                                            {f.studentId?.name?.charAt(0) || "?"}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm leading-none text-gray-900 dark:text-gray-100">{f.studentId?.name || "Unknown Student"}</h4>
                                            <span className="text-xs text-muted-foreground mt-0.5 block">
                                                {formatDate(f.createdAt)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-0.5 rounded-full border border-yellow-100 dark:border-yellow-800 shadow-sm">
                                        <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500 relative top-[1px]" />
                                        <span className="text-xs font-bold text-yellow-700 dark:text-yellow-500">{f.rating}.0</span>
                                    </div>
                                </div>

                                <blockquote className="relative mt-2">
                                    <span className="absolute -top-3 -left-1 text-4xl text-gray-200 dark:text-zinc-800 pointer-events-none font-serif">“</span>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed pl-3 relative z-10 min-h-[40px]">
                                        {f.comment || "No comment provided."}
                                    </p>
                                </blockquote>
                                {f.mealType && (
                                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-zinc-800 flex justify-end">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-gray-50 dark:bg-zinc-800 px-2 py-1 rounded border border-gray-100 dark:border-zinc-700">
                                            {f.mealType}
                                        </span>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-zinc-900 rounded-xl border-dashed border-2 border-gray-200 dark:border-zinc-800">
                        <div className="h-20 w-20 bg-gray-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                            <Star className="h-10 w-10 text-gray-300 dark:text-gray-600" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">No Feedback Yet</h3>
                        <p className="text-muted-foreground max-w-sm mt-2 text-sm">
                            Feedback from students regarding their meals will appear here.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
