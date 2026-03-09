export const HOSTELS = [
  { id: "h1", name: "Alpha Boys Hostel", capacity: 400, students: 385, warden: "Mr. Sharma", status: "Active" },
  { id: "h2", name: "Beta Girls Hostel", capacity: 350, students: 340, warden: "Mrs. Verma", status: "Active" },
  { id: "h3", name: "Gamma PG Hostel", capacity: 200, students: 150, warden: "Mr. Singh", status: "Maintenance" },
  { id: "h4", name: "Delta International", capacity: 500, students: 480, warden: "Dr. Rao", status: "Active" },
];

export const OWNERS = [
  { id: "o1", name: "Rajesh Foods", hostelId: "h1", contact: "9876543210", status: "Active", rating: 4.5 },
  { id: "o2", name: "Taste of Home", hostelId: "h2", contact: "9876543211", status: "Active", rating: 4.8 },
  { id: "o3", name: "Campus Bites", hostelId: "h3", contact: "9876543212", status: "Inactive", rating: 3.9 },
  { id: "o4", name: "Global Caterers", hostelId: "h4", contact: "9876543213", status: "Active", rating: 4.2 },
];

export const STUDENTS = [
  { id: "s1", name: "Aarav Kumar", roll: "21CS101", hostelId: "h1", room: "101", status: "Active" },
  { id: "s2", name: "Vivaan Singh", roll: "21CS102", hostelId: "h1", room: "102", status: "Active" },
  { id: "s3", name: "Diya Sharma", roll: "21EC201", hostelId: "h2", room: "201", status: "Active" },
  { id: "s4", name: "Ananya Gupta", roll: "21EC202", hostelId: "h2", room: "202", status: "On Leave" },
  { id: "s5", name: "Rohan Das", roll: "21ME301", hostelId: "h3", room: "301", status: "Active" },
];

export const MENU_ITEMS = [
  { id: "m1", name: "Aloo Paratha & Curd", type: "Veg", category: "Breakfast", calories: 350 },
  { id: "m2", name: "Omelette & Toast", type: "Non-Veg", category: "Breakfast", calories: 400 },
  { id: "m3", name: "Rice, Dal, Paneer", type: "Veg", category: "Lunch", calories: 600 },
  { id: "m4", name: "Chicken Curry & Naan", type: "Non-Veg", category: "Dinner", calories: 750 },
  { id: "m5", name: "Idli Sambar", type: "Veg", category: "Breakfast", calories: 300 },
];

export const ANALYTICS_DATA = [
  { date: "Mon", expected: 1200, served: 1150, wasted: 50 },
  { date: "Tue", expected: 1180, served: 1160, wasted: 20 },
  { date: "Wed", expected: 1250, served: 1200, wasted: 50 },
  { date: "Thu", expected: 1100, served: 1050, wasted: 50 },
  { date: "Fri", expected: 1300, served: 1280, wasted: 20 },
  { date: "Sat", expected: 900, served: 850, wasted: 50 },
  { date: "Sun", expected: 950, served: 920, wasted: 30 },
];

// Helper to get hostel name
export const getHostelName = (id: string) => HOSTELS.find(h => h.id === id)?.name || "Unknown";
