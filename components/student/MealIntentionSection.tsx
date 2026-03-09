import React from "react"
import { CheckCircle, XCircle } from "lucide-react"

interface MealIntentionSectionProps {
    mealType: "breakfast" | "lunch" | "dinner"
    intention: "present" | "not_coming" | null
    onChange: (mealType: string, status: "present" | "not_coming") => void
    disabled?: boolean
}

export function MealIntentionSection({ mealType, intention, onChange, disabled }: MealIntentionSectionProps) {
    const isPresent = intention === "present"
    const isNotComing = intention === "not_coming"

    return (
        <div className="flex flex-col gap-2 p-3 rounded-xl border bg-slate-50 dark:bg-zinc-900/50">
            <span className="text-sm font-semibold capitalize text-slate-700 dark:text-slate-300">
                {mealType}
            </span>
            <div className="flex gap-2">
                <button
                    onClick={() => onChange(mealType, "present")}
                    disabled={disabled}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${isPresent
                        ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 ring-2 ring-green-600 dark:ring-green-500 shadow-sm"
                        : "bg-white text-slate-600 border dark:bg-zinc-800 dark:border-zinc-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-700"
                        }`}
                >
                    <CheckCircle className={`w-4 h-4 ${isPresent ? "opacity-100" : "opacity-50"}`} />
                    Present
                </button>
                <button
                    onClick={() => onChange(mealType, "not_coming")}
                    disabled={disabled}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${isNotComing
                        ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 ring-2 ring-red-600 dark:ring-red-500 shadow-sm"
                        : "bg-white text-slate-600 border dark:bg-zinc-800 dark:border-zinc-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-700"
                        }`}
                >
                    <XCircle className={`w-4 h-4 ${isNotComing ? "opacity-100" : "opacity-50"}`} />
                    Skip
                </button>
            </div>
        </div>
    )
}
