const fs = require('fs');
const path = require('path');

const studentRoutePath = path.join(__dirname, '../server/routes/student.js');
const studentMenuPagePath = path.join(__dirname, '../app/student/menu/page.tsx');
const bookingPagePath = path.join(__dirname, '../app/student/menu/[date]/[mealType]/page.tsx'); // Adjusted path manually as glob is not available here or simple check

// Function to check file content
function checkFileContent(filePath, checks) {
    if (!fs.existsSync(filePath)) {
        console.error(`❌ FAILED: File not found ${filePath}`);
        return;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    let passed = true;
    checks.forEach(check => {
        if (!content.includes(check.str)) {
            console.error(`❌ FAILED: ${path.basename(filePath)} missing "${check.str}"`);
            passed = false;
        } else {
            console.log(`✅ PASSED: ${path.basename(filePath)} contains "${check.str}"`);
        }
    });
    return passed;
}

console.log("Verifying Smart Cutoff Implementation...");

// 1. Verify Backend Logic
const backendChecks = [
    { str: 'currentMinutes < 480' }, // Breakfast 8:00
    { str: 'currentMinutes < 780' }, // Lunch 13:00
    { str: 'currentMinutes < 1200' }, // Dinner 20:00
    { str: '"Breakfast booking closed at 8:00 AM"' }
];

// 2. Verify Frontend Dashboard
const dashboardChecks = [
    { str: 'breakfast: 8 * 60' },
    { str: 'lunch: 13 * 60' },
    { str: 'dinner: 20 * 60' }
];

// 3. Verify Booking Page Logic
// We need to handle the dynamic path. For this script, I'll hardcode the likely location relative to root or just skip if too complex to resolve without glob.
// But wait, I know the path structure. I can try to read it if I know the exact checking path.
// The task boundary said 'app/student/menu/[date]/[mealType]/page.tsx'. 
// Windows paths might be tricky with brackets.
const bookingChecks = [
    { str: 'minutes >= 480' },
    { str: 'minutes >= 780' },
    { str: 'minutes >= 1200' },
    { str: '"Breakfast booking closed at 8:00 AM"' }
];

console.log("\n--- Backend Checks ---");
checkFileContent(studentRoutePath, backendChecks);

console.log("\n--- Dashboard Checks ---");
checkFileContent(studentMenuPagePath, dashboardChecks);

console.log("\n--- Booking Page Checks ---");
// Use absolute path directly to avoid relative path issues with nested structure
const dynamicPath = 'c:/Python/Python314/Scripts/Sample_website_project(1)/app/student/menu/[date]/[mealType]/page.tsx';
checkFileContent(dynamicPath, bookingChecks);
