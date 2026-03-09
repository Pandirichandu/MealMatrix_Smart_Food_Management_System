const Settings = require('../models/Settings');

/**
 * Calculates the exact cutoff time for a given meal and date.
 * Relies on the database dynamic settings, with safe fallbacks.
 * 
 * @param {string} mealType - 'breakfast', 'lunch', or 'dinner'
 * @param {string} dateStr - The target date string (YYYY-MM-DD)
 * @returns {Promise<Date>} - The calculated UTC Date object representing the cutoff
 */
const getCutoffTime = async (mealType, dateStr) => {
    const parts = dateStr.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);

    const settings = await Settings.findOne();
    let cutoffHours = settings ? settings.mealBookingCutoffHours : 4;
    let dayOffset = 0;
    let timeStr = null;

    if (settings && settings.mealCutoffTimes && settings.mealCutoffTimes[mealType]) {
        dayOffset = settings.mealCutoffTimes[mealType].dayOffset;
        timeStr = settings.mealCutoffTimes[mealType].time;
    } else {
        // Fallback to legacy structure if the new dynamic system isn't found
        if (mealType === 'breakfast') {
            timeStr = '07:30';
        } else if (mealType === 'lunch') {
            timeStr = '12:30';
        } else if (mealType === 'dinner') {
            timeStr = '19:30';
        }
    }

    const endTime = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
    endTime.setUTCDate(endTime.getUTCDate() + dayOffset);

    if (timeStr) {
        const [hours, mins] = timeStr.split(':');
        endTime.setUTCHours(parseInt(hours, 10), parseInt(mins, 10), 0, 0);
    } else {
        endTime.setUTCHours(endTime.getUTCHours() - cutoffHours);
    }

    return endTime;
};

module.exports = { getCutoffTime };
