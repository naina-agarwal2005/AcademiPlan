# === FILE: backend/app.py (NEW PER-SUBJECT VERSION) ===

from bson.objectid import ObjectId
from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from datetime import datetime
import math

# --- Local Database Connection Setup ---
MONGO_URI = "mongodb://localhost:27017/"
client = MongoClient(MONGO_URI)
db = client.academiplan_db # Using a new database name for our new structure
subjects_collection = db.subjects # Our new collection for subjects
# We'll use this later for the detailed history
# attendance_records_collection = db.attendance_records

app = Flask(__name__)
CORS(app)

# --- API Endpoints for Subjects ---

@app.route('/api/subjects', methods=['POST'])
def add_subject():
    """
    Endpoint to add a new subject.
    Expects JSON like: { "subjectName": "Data Structures", "totalClasses": 20, "attendedClasses": 18, "minAttendance": 75 }
    """
    try:
        data = request.get_json()
        
        # Basic validation
        if not data or 'subjectName' not in data or 'totalClasses' not in data:
            return jsonify({"error": "Missing required fields"}), 400

        subject_doc = {
            "subjectName": data["subjectName"],
            "totalClasses": int(data["totalClasses"]),
            "attendedClasses": int(data.get("attendedClasses", 0)), # Default to 0 if not provided
            "minAttendance": int(data.get("minAttendance", 75)), # Default to 75 if not provided
            "createdAt": datetime.utcnow()
        }

        result = subjects_collection.insert_one(subject_doc)
        return jsonify({"message": "Subject added successfully", "id": str(result.inserted_id)}), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# In backend/app.py, replace the current get_subjects function with this final version.

# In backend/app.py, replace the get_subjects function with this corrected version

@app.route('/api/subjects', methods=['GET'])
def get_subjects():
    """
    Endpoint to get all subjects with corrected bunk calculation and smart recommendations.
    """
    try:
        subjects = list(subjects_collection.find())
        
        for subject in subjects:
            subject["_id"] = str(subject["_id"])
            
            total = subject.get("totalClasses", 0)
            attended = subject.get("attendedClasses", 0)
            min_att = subject.get("minAttendance", 75)
            strictness = subject.get("strictness", "moderate")

            bunks_possible = 0
            recommendation = ""
            current_attendance = 100

            if total > 0:
                current_attendance = (attended / total) * 100
                
                # --- This is the corrected bunks calculation ---
                # It's always based on the absolute minimum attendance
                bunks_possible = attended - (total * min_att / 100)

                # Now, we determine the recommendation based on the situation
                if current_attendance < min_att:
                    numerator = (min_att * total) - (100 * attended)
                    denominator = 100 - min_att
                    classes_to_attend = math.ceil(numerator / denominator) if denominator > 0 else 0
                    if strictness == 'strict':
                        recommendation = f"Warning: Prof is strict! You MUST attend the next {classes_to_attend} classes."
                    else:
                        recommendation = f"Shortfall! You need to attend the next {classes_to_attend} classes."
                else: # Attendance is OK, so give advice based on strictness
                    if strictness == 'strict' and current_attendance < min_att + 10:
                        recommendation = "Strict Prof: You're safe, but build a higher buffer."
                    elif strictness == 'moderate' and current_attendance < min_att + 5:
                        recommendation = "Moderate Prof: You have a small, but safe buffer."
                    else:
                        recommendation = "You have a healthy attendance. Your call!"
            
            subject["currentAttendance"] = round(current_attendance, 2)
            subject["bunksPossible"] = int(bunks_possible) if bunks_possible > 0 else 0
            subject["recommendation"] = recommendation
        
        return jsonify(subjects)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Add this new function to your app.py file

@app.route('/api/attendance', methods=['POST'])
def update_attendance():
    """
    Endpoint to mark attendance for a specific subject.
    Expects JSON like: { "subjectId": "...", "status": "attended" or "bunked" }
    """
    try:
        data = request.get_json()
        subject_id = data.get('subjectId')
        status = data.get('status')

        # Basic validation of the incoming data
        if not subject_id or status not in ['attended', 'bunked']:
            return jsonify({"error": "Invalid data provided: subjectId and status are required."}), 400

        # Define the update operation using MongoDB's efficient '$inc' operator
        # We always increment the total number of classes
        update_operation = {'$inc': {'totalClasses': 1}}
        # We only increment attended classes if the status is 'attended'
        if status == 'attended':
            update_operation['$inc']['attendedClasses'] = 1

        # Find the subject by its ID and apply the update
        result = subjects_collection.update_one(
            {'_id': ObjectId(subject_id)},
            update_operation
        )

        # Check if a document was actually found and updated
        if result.matched_count == 0:
            return jsonify({"error": "Subject not found"}), 404

        return jsonify({"message": "Attendance updated successfully"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# This is the main execution block
if __name__ == '__main__':
    app.run(debug=True)