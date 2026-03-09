import sys
import json
import numpy as np
import warnings

# Suppress warnings
warnings.filterwarnings("ignore")

try:
    from sklearn.ensemble import RandomForestRegressor
    import pandas as pd
except ImportError:
    # If scikit-learn/pandas not installed, print error JSON
    print(json.dumps({"error": "Missing dependencies. Run: pip install scikit-learn pandas numpy"}))
    sys.exit(1)

# Dummy Historical Data (Day, MealType(0=B,1=L,2=D), TotalStudents, PrevAttendance, Target)
# Days: 0=Mon, 6=Sun
data = [
    [0, 1, 100, 90, 92], [0, 1, 100, 85, 88], [0, 1, 100, 95, 96],
    [1, 1, 100, 88, 90], [1, 1, 100, 80, 82],
    [2, 1, 100, 92, 94],
    [0, 2, 100, 70, 75], [1, 2, 100, 65, 68]
]

# Train Model (In production, load saved model)
X = [d[:4] for d in data]
y = [d[4] for d in data]

model = RandomForestRegressor(n_estimators=10, random_state=42)
model.fit(X, y)

def predict():
    try:
        # Read args: Day(str), Meal(str), Total(int), Prev(int)
        # Assuming args passed: script.py <Day> <Meal> <Total> <Prev>
        if len(sys.argv) < 5:
            # Default/Test values
            day_map = {'Monday': 0, 'Tuesday': 1}
            meal_map = {'Breakfast': 0, 'Lunch': 1, 'Dinner': 2}
            features = [0, 1, 100, 90]
        else:
            day_map = {'Monday': 0, 'Tuesday': 1, 'Wednesday': 2, 'Thursday': 3, 'Friday': 4, 'Saturday': 5, 'Sunday': 6}
            meal_map = {'Breakfast': 0, 'Lunch': 1, 'Dinner': 2}
            
            day = day_map.get(sys.argv[1], 0)
            meal = meal_map.get(sys.argv[2], 1)
            total = int(sys.argv[3])
            prev = int(sys.argv[4])
            features = [day, meal, total, prev]

        prediction = model.predict([features])[0]
        
        # Return JSON output
        result = {
            "prediction": int(prediction),
            "confidence": 0.85 # Dummy confidence
        }
        print(json.dumps(result))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    predict()
