# === FILE: backend/app.py (FINAL COMPLETE VERSION) ===

from functools import wraps
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
from datetime import timedelta,timezone
from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from bson.objectid import ObjectId
from datetime import datetime
import math

# --- Local Database Connection Setup ---
MONGO_URI = "mongodb://localhost:27017/"
client = MongoClient(MONGO_URI)
db = client.academiplan_db
subjects_collection = db.subjects
attendance_records_collection = db.attendance_records
users_collection = db.users

# --- Flask App Initialization ---
app = Flask(__name__)
app.config['SECRET_KEY'] = 'a-very-secret-and-unguessable-key-123' # In production, this should be a random string
CORS(app)
# Decorator to protect routes that require a valid token
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        # Check if the 'Authorization' header is in the request
        if 'Authorization' in request.headers:
            # Get the token from the header (it's in the format "Bearer <token>")
            token = request.headers['Authorization'].split(" ")[1]

        if not token:
            return jsonify({'message': 'Token is missing!'}), 401

        try:
            # Decode the token using our secret key
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            # Find the user in the database
            current_user = users_collection.find_one({'_id': ObjectId(data['user_id'])})
        except:
            return jsonify({'message': 'Token is invalid!'}), 401

        # Pass the logged-in user's information to the actual route function
        return f(current_user, *args, **kwargs)
    return decorated

# Add this new function for User Registration to your app.py file

@app.route('/api/register', methods=['POST'])
def register():
    """
    Endpoint to register a new user.
    """
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')

        if not username or not password:
            return jsonify({"error": "Username and password are required"}), 400

        # Check if a user with this username already exists
        if users_collection.find_one({"username": username}):
            return jsonify({"error": "Username already exists"}), 409 # 409 is the "Conflict" status code

        # Hash the password for security before storing it
        hashed_password = generate_password_hash(password)

        # Create and insert the new user document
        user_id = users_collection.insert_one({
            "username": username,
            "password_hash": hashed_password,
            "createdAt": datetime.utcnow()
        }).inserted_id

        return jsonify({"message": "User registered successfully", "userId": str(user_id)}), 201
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
# Add this new function for User Login to your app.py file

@app.route('/api/login', methods=['POST'])
def login():
    """
    Endpoint to log in a user and return a JWT.
    """
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')

        if not username or not password:
            return jsonify({"error": "Username and password are required"}), 400

        # Find the user in the database
        user = users_collection.find_one({"username": username})

        # Check if user exists and the password hash matches the password provided
        if not user or not check_password_hash(user['password_hash'], password):
            return jsonify({"error": "Invalid username or password"}), 401 # 401 is "Unauthorized"

        # If credentials are valid, create the JWT token
        token = jwt.encode({
            'user_id': str(user['_id']),
            'exp': datetime.utcnow() + timedelta(hours=24) # Token expires in 24 hours
        }, app.config['SECRET_KEY'], algorithm="HS256")

        return jsonify({"message": "Login successful", "token": token}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- API Endpoint to Add a New Subject ---
# In backend/app.py, replace the add_subject function

# In backend/app.py, replace the entire add_subject function with this one

@app.route('/api/subjects', methods=['POST'])
@token_required
def add_subject(current_user):
    try:
        data = request.get_json()
        if not data or 'subjectName' not in data or 'totalClasses' not in data:
            return jsonify({"error": "Missing required fields"}), 400

        subject_doc = {
            "userId": current_user["_id"],
            "subjectName": data["subjectName"],
            "totalClasses": int(data["totalClasses"]),
            "attendedClasses": int(data.get("attendedClasses", 0)),
            "minAttendance": int(data.get("minAttendance", 75)),
            "createdAt": datetime.now(timezone.utc)
        }
        subjects_collection.insert_one(subject_doc)
        return jsonify({"message": "Subject added successfully"}), 201
        
    except Exception as e:
        # --- THIS IS THE IMPORTANT PART ---
        # We will print the specific error to the terminal for debugging
        print(f"--- ERROR IN add_subject ---: {e}") 
        return jsonify({"error": "An internal error occurred on the server"}), 500

@app.route('/api/subjects', methods=['GET'])
@token_required
def get_subjects(current_user):
    try:
        # SECURE: We now filter subjects by the logged-in user's ID
        subjects = list(subjects_collection.find({'userId': current_user['_id']}).sort("createdAt", 1))
        
        for subject in subjects:
            subject["_id"] = str(subject["_id"])
            subject["userId"] = str(subject["userId"])
            total = subject.get("totalClasses", 0)
            attended = subject.get("attendedClasses", 0)
            min_att = subject.get("minAttendance", 75)
            strictness = subject.get("strictness", "moderate")
            bunks_possible = 0
            recommendation = ""
            current_attendance = 100
            if total > 0:
                current_attendance = (attended / total) * 100
                bunks_possible = attended - (total * min_att / 100)
                if current_attendance < min_att:
                    numerator = (min_att * total) - (100 * attended)
                    denominator = 100 - min_att
                    classes_to_attend = math.ceil(numerator / denominator) if denominator > 0 else 0
                    if strictness == 'strict':
                        recommendation = f"Warning: Prof is strict! You MUST attend the next {classes_to_attend} classes."
                    else:
                        recommendation = f"Shortfall! You need to attend the next {classes_to_attend} classes."
                else:
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

@app.route('/api/attendance', methods=['POST'])
@token_required
def update_attendance(current_user):
    try:
        data = request.get_json()
        subject_id = data.get('subjectId')
        status = data.get('status')
        if not subject_id or status not in ['attended', 'bunked']:
            return jsonify({"error": "Invalid data provided"}), 400

        update_operation = {'$inc': {'totalClasses': 1}}
        if status == 'attended':
            update_operation['$inc']['attendedClasses'] = 1
        
        # SECURE: We add the userId to the filter here
        result = subjects_collection.update_one(
            {'_id': ObjectId(subject_id), 'userId': current_user['_id']},
            update_operation
        )

        if result.matched_count == 0:
            return jsonify({"error": "Subject not found or you do not have permission"}), 404
        
        history_record = {
            "userId": current_user['_id'],
            "subjectId": ObjectId(subject_id),
            "status": status,
            "timestamp": datetime.now(timezone.utc)
        }
        attendance_records_collection.insert_one(history_record)
        return jsonify({"message": "Attendance updated successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# In backend/app.py, replace the entire get_history function with this one

@app.route('/api/history', methods=['GET'])
@token_required
def get_history(current_user):
    try:
        # We will now print to confirm the function starts
        print("--- Fetching history for user:", current_user['username'])

        history_log = list(attendance_records_collection.find({'userId': current_user['_id']}).sort("timestamp", -1).limit(50))
        
        # We will now print the records we found
        print(f"--- Found {len(history_log)} history records ---")

        for record in history_log:
            subject = subjects_collection.find_one({"_id": record["subjectId"]})
            if subject:
                record["subjectName"] = subject.get("subjectName", "Unknown Subject")
            
            record["_id"] = str(record["_id"])
            record["subjectId"] = str(record["subjectId"])
            record["userId"] = str(record["userId"])
            record["timestamp"] = record["timestamp"].strftime("%Y-%m-%d %H:%M:%S")

        return jsonify(history_log)

    except Exception as e:
        # --- THIS IS THE CRUCIAL FIX ---
        # We will now print the specific error to the terminal
        print(f"--- ERROR IN get_history ---: {e}") 
        return jsonify({"error": "An internal error occurred while fetching history"}), 500
    
    # Add this new function to app.py to handle deleting history records

@app.route('/api/history/<record_id>', methods=['DELETE'])
@token_required
def delete_history_record(current_user, record_id):
    """
    Endpoint to delete a single attendance record and reverse the count.
    """
    try:
        # First, find the history record to see what we need to undo
        record_to_delete = attendance_records_collection.find_one(
            {'_id': ObjectId(record_id), 'userId': current_user['_id']}
        )

        if not record_to_delete:
            return jsonify({"error": "History record not found or permission denied"}), 404

        status = record_to_delete.get('status')
        subject_id = record_to_delete.get('subjectId')

        # --- The "Undo" Logic ---
        # Create an update operation to reverse the original action
        undo_operation = {'$inc': {'totalClasses': -1}} # Always decrease total classes by 1
        if status == 'attended':
            undo_operation['$inc']['attendedClasses'] = -1 # If it was 'attended', also decrease attended by 1
        
        # Apply the undo operation to the subjects collection
        subjects_collection.update_one(
            {'_id': subject_id, 'userId': current_user['_id']},
            undo_operation
        )

        # Now, delete the original history record
        attendance_records_collection.delete_one({'_id': ObjectId(record_id)})
        
        return jsonify({"message": "Record deleted and attendance updated successfully"}), 200

    except Exception as e:
        print(f"--- ERROR IN delete_history_record ---: {e}")
        return jsonify({"error": str(e)}), 500
    
# --- Main Execution Block ---
if __name__ == '__main__':
    app.run(debug=True)