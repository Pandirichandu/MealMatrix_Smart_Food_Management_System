"use client";

import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

interface DynamicMealStateProps {
    type: string;
    title: string;
    status: {
        state: 'ACTIVE' | 'SCANNED' | 'COMPLETED' | 'FUTURE';
        isBooked: boolean;
        isScanned: boolean;
        endTime: string;
    } | null;
    children: React.ReactNode;
}

const mealIcons: Record<string, string> = {
    breakfast: '☀',
    lunch: '🍛',
    dinner: '🌙'
};

export function DynamicMealState({ type, title, status, children }: DynamicMealStateProps) {
    const router = useRouter();
    const mealIcon = mealIcons[type.toLowerCase()] || '';
    const titleWithIcon = title.includes(mealIcon) ? title : `${mealIcon} ${title}`;

    const animationProps = {
        initial: { opacity: 0.95, scale: 0.98 },
        animate: { opacity: 1, scale: 1 },
        transition: { duration: 0.25, ease: 'easeOut' as const }
    };

    if (!status) {
        // Fallback to active if status is loading or fails
        return (
            <motion.div {...animationProps}>
                {React.isValidElement(children)
                    ? React.cloneElement(children as React.ReactElement<any>, { title: titleWithIcon })
                    : children}
            </motion.div>
        );
    }

    if (status.state === 'SCANNED') {
        return (
            <motion.div {...animationProps}>
                <Card className="overflow-hidden border-green-200 bg-green-50/50 dark:border-green-900/50 dark:bg-green-900/10">
                    <CardContent className="p-8 flex flex-col items-center justify-center text-center space-y-6">
                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mb-2">
                            <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold tracking-tight text-green-900 dark:text-green-100">
                                Thank You for {titleWithIcon}!
                            </h3>
                            <p className="text-muted-foreground max-w-md mx-auto">
                                We hope you enjoyed your {type}. Your feedback helps us improve and serve you better.
                            </p>
                        </div>
                        <Button
                            onClick={() => router.push(`/student/feedback?mealType=${type}`)}
                            className="mt-4 gap-2 bg-green-600 hover:bg-green-700 text-white hover:-translate-y-[1px] transition-all duration-150"
                        >
                            <Star className="w-4 h-4 fill-current" />
                            Give Feedback
                        </Button>
                    </CardContent>
                </Card>
            </motion.div>
        );
    }

    if (status.state === 'COMPLETED') {
        return (
            <motion.div {...animationProps}>
                <Card className="overflow-hidden border-dashed bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-900/30 pointer-events-none">
                    <CardContent className="p-8 flex flex-col items-center justify-center text-center space-y-6">
                        <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-2">
                            <Clock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold tracking-tight text-amber-900 dark:text-amber-100">
                                ⏰ {titleWithIcon} Session Completed
                            </h3>
                            <p className="text-muted-foreground">
                                The {type} service has ended for today. We look forward to serving you at the next meal.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        );
    }

    // STATE ACTIVE: Render the actual MealSection passed as children
    return (
        <motion.div {...animationProps}>
            {React.isValidElement(children)
                ? React.cloneElement(children as React.ReactElement<any>, { title: titleWithIcon })
                : children}
        </motion.div>
    );
}
