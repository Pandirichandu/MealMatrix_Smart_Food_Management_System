import { Sun, Utensils, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

type MealType = 'breakfast' | 'lunch' | 'dinner' | string;

interface MealIconProps {
    type: MealType;
    size?: number;
    className?: string;
}

export function MealIcon({ type, size = 20, className }: MealIconProps) {
    const safeType = type.toLowerCase();

    // Default: Lunch style if unknown
    let icon = <Utensils size={size} className="text-orange-600" />;
    let bgClass = "bg-orange-100";
    let borderClass = "";

    if (safeType === 'breakfast') {
        icon = <Sun size={size} className="text-green-600" />;
        bgClass = "bg-green-100";
    } else if (safeType === 'lunch') {
        icon = <Utensils size={size} className="text-orange-600" />;
        bgClass = "bg-orange-100";
    } else if (safeType === 'dinner') {
        icon = <Moon size={size} className="text-gray-800" />;
        bgClass = "bg-gray-100";
        borderClass = "border border-gray-300";
    }

    return (
        <div className={cn(
            "flex items-center justify-center rounded-xl w-10 h-10 transition-transform hover:scale-105",
            bgClass,
            borderClass,
            className
        )}>
            {icon}
        </div>
    );
}
