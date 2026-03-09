"use client";

import { useState, useEffect, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Star, MessageSquare, Send } from "lucide-react";
import { Textarea } from "@/components/ui/textarea"; // Assuming you have a Textarea component, or standard textarea styled
import { API_URL } from "@/lib/config";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";

function StudentFeedbackContent() {
    const searchParams = useSearchParams();
    const queryMealType = searchParams.get('mealType');
    const validMeals = ['breakfast', 'lunch', 'dinner'];
    const initialMealType = validMeals.includes(queryMealType?.toLowerCase() || '') ? queryMealType!.toLowerCase() : "";

    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState("");
    const [mealType, setMealType] = useState(initialMealType);
    const [submitted, setSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (initialMealType) {
            const el = document.getElementById('rating-section');
            if (el) {
                setTimeout(() => {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 150);
            }
        }
    }, [initialMealType]);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            await fetch(`${API_URL}/api/student/feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ rating, comment, mealType })
            });
            setSubmitted(true);
            toast.success("Thank you for your feedback!");
        } catch (err) {
            console.error(err);
            toast.error("Something went wrong. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50/50 dark:bg-zinc-950 p-6">
                <Card className="max-w-md w-full text-center p-8 shadow-xl border-dashed border-2 border-green-200 dark:border-green-900 bg-white dark:bg-zinc-900 animate-in zoom-in-95 duration-300">
                    <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
                        <Star className="h-8 w-8 text-green-600 dark:text-green-400 fill-green-600 dark:fill-green-400" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Feedback Received!</CardTitle>
                    <CardDescription className="text-base">
                        Your input helps us serve you better meals every day.
                    </CardDescription>
                    <Button className="mt-8 w-full bg-green-600 hover:bg-green-700 text-white" onClick={() => { setSubmitted(false); setRating(0); setComment(""); setMealType(""); }}>
                        Submit Another Response
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex-1 min-h-screen bg-gray-50 dark:bg-zinc-950 p-8 pt-10">
            <div className="max-w-2xl mx-auto space-y-8">
                <div className="text-center space-y-2">
                    <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-gray-50">Student Feedback</h2>
                    <p className="text-muted-foreground mt-1">Share your dining experience with us.</p>
                </div>

                <Card id="rating-section" className="modern-card border-none shadow-lg bg-white dark:bg-zinc-900 overflow-hidden">
                    <div className="h-2 w-full bg-gradient-to-r from-blue-600 to-emerald-500" />
                    <CardHeader className="pb-4">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2.5 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-100 dark:border-yellow-900/30">
                                <MessageSquare className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                            </div>
                            <div>
                                <CardTitle className="text-xl">
                                    {mealType ? `Feedback for ${mealType.charAt(0).toUpperCase() + mealType.slice(1)}` : "Rate your Meal"}
                                </CardTitle>
                                <CardDescription>How was the food quality and taste today?</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        {/* Star Rating */}
                        <div className="space-y-4 text-center py-6 bg-gray-50 dark:bg-zinc-900/50 rounded-2xl border border-gray-100 dark:border-zinc-800">
                            <Label className="text-muted-foreground uppercase tracking-wider text-xs font-bold">Select Rating</Label>
                            <div className="flex justify-center gap-3">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        onClick={() => setRating(star)}
                                        className="group relative focus:outline-none transition-transform active:scale-95"
                                        title={`${star} Stars`}
                                    >
                                        <Star
                                            className={`h-10 w-10 transition-all duration-300 ${star <= rating
                                                ? "text-yellow-500 fill-yellow-500 scale-110 drop-shadow-sm"
                                                : "text-gray-300 dark:text-zinc-700 hover:text-yellow-400"
                                                }`}
                                        />
                                    </button>
                                ))}
                            </div>
                            <div className="h-6">
                                {rating > 0 && (
                                    <span className="text-sm font-bold text-yellow-600 dark:text-yellow-400 animate-in fade-in slide-in-from-bottom-1">
                                        {rating === 5 && "Excellent! 😍"}
                                        {rating === 4 && "Good! 🙂"}
                                        {rating === 3 && "Average 😐"}
                                        {rating === 2 && "Poor 😕"}
                                        {rating === 1 && "Terrible 😫"}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Meal Selection */}
                        <div className="space-y-4">
                            <Label className="font-semibold text-gray-900 dark:text-gray-100">Which meal are you rating? <span className="text-red-500">*</span></Label>
                            <div className="grid grid-cols-3 gap-3">
                                {['Breakfast', 'Lunch', 'Dinner'].map((meal) => (
                                    <button
                                        key={meal}
                                        onClick={() => setMealType(meal.toLowerCase())}
                                        className={`py-3 px-4 rounded-xl border font-semibold text-sm transition-all focus:outline-none flex justify-center items-center ${mealType === meal.toLowerCase()
                                            ? "bg-blue-600 border-blue-600 text-white shadow-md scale-105"
                                            : "bg-white dark:bg-zinc-950 border-gray-200 dark:border-zinc-800 text-gray-700 dark:text-gray-300 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                            }`}
                                    >
                                        {meal}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Comments */}
                        <div className="space-y-3">
                            <Label htmlFor="comment" className="font-semibold text-gray-900 dark:text-gray-100">Additional Comments</Label>
                            <Textarea
                                id="comment"
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                className="min-h-[120px] resize-y bg-white dark:bg-zinc-950 border-gray-200 dark:border-zinc-800 focus:ring-blue-500"
                                placeholder="Tell us what you liked or how we can improve..."
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="bg-gray-50 dark:bg-zinc-900/50 p-6 pt-4 border-t border-gray-100 dark:border-zinc-800">
                        <Button
                            className="w-full h-12 text-base font-semibold shadow-md bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white"
                            onClick={handleSubmit}
                            disabled={rating === 0 || !mealType || isSubmitting}
                        >
                            {isSubmitting ? (
                                "Submitting..."
                            ) : (
                                <>
                                    Submit Feedback <Send className="ml-2 h-4 w-4" />
                                </>
                            )}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}

export default function StudentFeedbackPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <StudentFeedbackContent />
        </Suspense>
    );
}
