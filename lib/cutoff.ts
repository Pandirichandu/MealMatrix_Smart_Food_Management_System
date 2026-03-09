/**
 * Calculate the cutoff time for a given meal and date.
 * Matches backend logic.
 * 
 * @param {string} mealType - 'breakfast', 'lunch', or 'dinner'
 * @param {string} dateStr - Date string in 'YYYY-MM-DD' format
 * @param {any} dynamicSettings - Optional dynamic mealCutoffTimes from Settings
 * @returns {Date} - The cutoff Date object (in local time)
 */
export const getCutoffTime = (mealType: string, dateStr: string, dynamicSettings?: any): Date => {
    const parts = dateStr.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);

    // Construct the meal date at 00:00:00 local time
    const mealDate = new Date(year, month, day);

    // Clone
    const cutoffDate = new Date(mealDate.getTime());

    const type = mealType.toLowerCase();

    const fallbackSettings: Record<string, { dayOffset: number, time: string }> = {
        breakfast: { dayOffset: -1, time: "22:30" },
        lunch: { dayOffset: 0, time: "09:30" },
        dinner: { dayOffset: 0, time: "14:30" }
    };

    let config: any = null;
    if (dynamicSettings && dynamicSettings[type]) {
        const [hours, minutes] = (dynamicSettings[type].time || "00:00").split(":");
        config = {
            hour: parseInt(hours, 10),
            minute: parseInt(minutes, 10),
            isPreviousDay: dynamicSettings[type].dayOffset === -1
        };
    } else if (fallbackSettings[type]) {
        const [hours, minutes] = fallbackSettings[type].time.split(":");
        config = {
            hour: parseInt(hours, 10),
            minute: parseInt(minutes, 10),
            isPreviousDay: fallbackSettings[type].dayOffset === -1
        };
    }

    if (config) {
        if (config.isPreviousDay) {
            cutoffDate.setDate(cutoffDate.getDate() - 1);
        }
        cutoffDate.setHours(config.hour, config.minute, 0, 0);
    } else {
        // Safe default: Start of day (closed)
        return new Date(mealDate.setHours(0, 0, 0, 0));
    }

    return cutoffDate;
};

/**
 * Check if booking is allowed for a given meal and date.
 */
export const isBookingAllowed = (mealType: string, dateStr: string, dynamicSettings?: any): boolean => {
    const cutoff = getCutoffTime(mealType, dateStr, dynamicSettings);
    const now = new Date();
    return now < cutoff;
};

/**
 * Get a formatted string for the cutoff time error message.
 * Example: "10:30 PM (Previous Day)" or "9:30 AM"
 */
export const getFormattedCutoffTime = (mealType: string, dynamicSettings?: any): string => {
    const type = mealType.toLowerCase();

    const fallbackSettings: Record<string, { dayOffset: number, time: string }> = {
        breakfast: { dayOffset: -1, time: "22:30" },
        lunch: { dayOffset: 0, time: "09:30" },
        dinner: { dayOffset: 0, time: "14:30" }
    };

    let config: any = null;
    if (dynamicSettings && dynamicSettings[type]) {
        const [hours, minutes] = (dynamicSettings[type].time || "00:00").split(":");
        config = {
            hour: parseInt(hours, 10),
            minute: parseInt(minutes, 10),
            isPreviousDay: dynamicSettings[type].dayOffset === -1
        };
    } else if (fallbackSettings[type]) {
        const [hours, minutes] = fallbackSettings[type].time.split(":");
        config = {
            hour: parseInt(hours, 10),
            minute: parseInt(minutes, 10),
            isPreviousDay: fallbackSettings[type].dayOffset === -1
        };
    }

    if (!config) return "";

    const date = new Date();
    date.setHours(config.hour, config.minute, 0, 0);

    const timeString = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

    if (config.isPreviousDay) {
        return `${timeString} (Previous Day)`;
    }

    return timeString;
};
