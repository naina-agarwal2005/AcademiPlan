# === FILE: backend/app.py (Complete and Correct Version) ===

from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from datetime import datetime
import math

# --- Local Database Connection Setup ---
# Make sure this is your local connection string
MONGO_URI = "mongodb://localhost:27017/"
client = MongoClient(MONGO_URI)
db = client.bunk_app_db
calculations_collection = db.calculations

# --- Your Flask App ---
app = Flask(__name__)
CORS(app)

@app.route('/api/calculate', methods=['POST'])
def calculate_bunks():
    data = request.get_json()
    try:
        total_classes = int(data['totalClasses'])
        attended_classes = int(data['attendedClasses'])
        min_attendance = int(data['minAttendance'])
        # This line is for a future feature, but it's good to have
        strictness = data.get('strictnessLevel', 'moderate') 

        if attended_classes > total_classes or total_classes == 0:
            return jsonify({"error": "Invalid class numbers."}), 400

        current_attendance_percent = (attended_classes / total_classes) * 100
        bunks_possible = 0
        recommendation = ""

        if current_attendance_percent < min_attendance:
            numerator = (min_attendance * total_classes) - (100 * attended_classes)
            denominator = 100 - min_attendance
            if denominator == 0 and numerator > 0:
                 recommendation = "You are below 100% and can never catch up."
            else:
                classes_to_attend = math.ceil(numerator / denominator) if denominator > 0 else 0
                recommendation = f"You are short on attendance! You must attend the next {classes_to_attend} classes in a row."
            bunks_possible = 0
        else:
            # This is the logic for when attendance is OK
            bunks_possible = attended_classes - (total_classes * min_attendance / 100)
            recommendation = "You are currently meeting the attendance requirement."

        result = int(bunks_possible) if bunks_possible > 0 else 0

        # --- THIS IS THE IMPORTANT PART THAT WAS LIKELY MISSING ---
        # We build a complete dictionary with all our data here
        calculation_record = {
            "totalClasses": total_classes,
            "attendedClasses": attended_classes,
            "minAttendance": min_attendance,
            "bunksPossible": result,
            "recommendation": recommendation,
            "timestamp": datetime.utcnow()
        }
        # And then we insert that complete record
        calculations_collection.insert_one(calculation_record)
        
        return jsonify({
            'bunksPossible': result,
            'recommendation': recommendation
        })

    except Exception as e:
        print(e)
        return jsonify({'error': 'An error occurred.'}), 400

if __name__ == '__main__':
    app.run(debug=True)