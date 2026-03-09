/**
 * Get Service End Time for Today.
 * Based on server/routes/owner.js logic.
 * 
 * Breakfast: Ends 11:00 AM
 * Lunch: Ends 16:00 (4 PM)
 * Dinner: Ends 23:00 (11 PM)
 */
export const getServiceEndTime = (mealType: string): Date => {
    const now = new Date();
    const end = new Date(now);
    end.setSeconds(0);
    end.setMilliseconds(0);

    const type = mealType.toLowerCase();

    if (type === 'breakfast') {
        end.setHours(11, 0, 0);
    } else if (type === 'lunch') {
        end.setHours(16, 0, 0);
    } else if (type === 'dinner') {
        end.setHours(21, 30, 0);
    } else {
        // Default relative safety? Or throw?
        // Let's default to end of day.
        end.setHours(23, 59, 59);
    }
    return end;
};
