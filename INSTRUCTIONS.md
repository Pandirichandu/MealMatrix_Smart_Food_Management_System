# MealMatrix Systems - Setup Instructions

MealMatrix Systems is a Hostel & Mess Management System with an AI-based meal demand prediction module.

## Prerequisites
1. **Node.js**: v18+ installed.
2. **MongoDB**: Installed and running locally on default port (27017).
3. **Python**: v3.8+ (for ML module).

## 1. Backend Setup

The backend handles APIs, Authentication, and AI integration.

1. Navigate to the `server` directory:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```
   *Note: This installs `express`, `mongoose`, `start`, etc.*

3. **ML Connection**: Ensure Python dependencies are installed.
   ```bash
   pip install scikit-learn pandas numpy
   ```
   *(If you don't have Python/Pip configured, the backend handles this gracefully by returning mock predictions, but for full features install them).*

4. **Seed Database**: Populate MongoDB with initial Admin, Owner, and Student data.
   ```bash
   node seed.js
   ```
   **Output Credentials:**
   - **Admin**: `admin@mealmatrix.com` / `123456`
   - **Owner**: `owner@mealmatrix.com` / `123456`
   - **Student**: `student@mealmatrix.com` / `123456`

5. Start the Server:
   ```bash
   node server.js
   ```
   *Server runs on `http://localhost:5003`*

## 2. Frontend Setup

The frontend is a Next.js application.

1. Open a new terminal and navigate to the root directory (project folder).

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 3. How to Test

### Admin Portal
- Go to `/admin` (or Login as Admin).
- View Dashboard stats (fetched from backend if integrated, currently displaying realistic mock data for stability).
- Manage Hostels and Owners.

### Owner Portal
- Go to `/owner` (or Login as Owner).
- View "Expected Meals" (AI Prediction) vs "Actual Served".
- Go to **Scanner**. In a real scenario, use a mobile camera. For testing, simulate API calls.

### Student Portal
- Go to `/student`.
- "Opt-in" for tomorrow's lunch.
- View "My QR Code".

## Troubleshooting

- **MongoDB Error**: Ensure `mongod` service is running.
- **Python Error**: If `predict.py` fails, check if `python` is in your system PATH.
- **API Connection**: Ensure the backend is running on port 5000 before starting frontend.

