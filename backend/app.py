from functools import wraps
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
from datetime import datetime, timedelta, timezone
from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from bson.objectid import ObjectId
import math

# --- Database & App Setup ---
MONGO_URI = "mongodb://localhost:27017/"
client = MongoClient(MONGO_URI)
db = client.academiplan_db
subjects_collection = db.subjects
attendance_records_collection = db.attendance_records
users_collection = db.users
events_collection = db.events

app = Flask(__name__)
app.config['SECRET_KEY'] = 'a-very-secret-and-unguessable-key-123'
CORS(app)

# --- Security Decorator ---
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split(" ")[1]
        if not token: return jsonify({'message': 'Token is missing!'}), 401
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = users_collection.find_one({'_id': ObjectId(data['user_id'])})
            if not current_user: return jsonify({'message': 'User not found!'}), 401
        except:
            return jsonify({'message': 'Token is invalid!'}), 401
        return f(current_user, *args, **kwargs)
    return decorated

# --- Auth Endpoints ---
@app.route('/api/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        if not username or not password: return jsonify({"error": "Username and password are required"}), 400
        if users_collection.find_one({"username": username}): return jsonify({"error": "Username already exists"}), 409
        hashed_password = generate_password_hash(password)
        users_collection.insert_one({"username": username, "password_hash": hashed_password, "createdAt": datetime.now(timezone.utc)})
        return jsonify({"message": "User registered successfully"}), 201
    except Exception as e:
        print(f"--- ERROR IN register ---: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500

@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        if not username or not password: return jsonify({"error": "Username and password are required"}), 400
        user = users_collection.find_one({"username": username})
        if not user or not check_password_hash(user['password_hash'], password):
            return jsonify({"error": "Invalid username or password"}), 401
        token = jwt.encode({'user_id': str(user['_id']), 'exp': datetime.now(timezone.utc) + timedelta(hours=24)}, app.config['SECRET_KEY'], algorithm="HS256")
        return jsonify({"message": "Login successful", "token": token, "username": user['username']}), 200
    except Exception as e:
        print(f"--- ERROR IN login ---: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500

# --- Subject & Attendance Endpoints ---
@app.route('/api/subjects', methods=['POST'])
@token_required
def add_subject(current_user):
    try:
        data = request.get_json()
        subject_doc = {"userId": current_user["_id"], "subjectName": data["subjectName"], "totalClasses": int(data["totalClasses"]), "attendedClasses": int(data.get("attendedClasses", 0)), "minAttendance": int(data.get("minAttendance", 75)), "createdAt": datetime.now(timezone.utc)}
        subjects_collection.insert_one(subject_doc)
        return jsonify({"message": "Subject added successfully"}), 201
    except Exception as e:
        print(f"--- ERROR IN add_subject ---: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500

@app.route('/api/subjects', methods=['GET'])
@token_required
def get_subjects(current_user):
    try:
        subjects = list(subjects_collection.find({'userId': current_user['_id']}).sort("createdAt", 1))
        for subject in subjects:
            subject["_id"] = str(subject["_id"]); subject["userId"] = str(subject["userId"])
            total = subject.get("totalClasses", 0); attended = subject.get("attendedClasses", 0); min_att = subject.get("minAttendance", 75)
            bunks_possible = 0; recommendation = ""; current_attendance = 100
            if total > 0:
                current_attendance = (attended / total) * 100
                bunks_possible = attended - (total * min_att / 100)
                if current_attendance < min_att:
                    numerator = (min_att * total) - (100 * attended); denominator = 100 - min_att
                    classes_to_attend = math.ceil(numerator / denominator) if denominator > 0 else 0
                    recommendation = f"Shortfall! Must attend the next {classes_to_attend} classes."
                else:
                    recommendation = "You have a healthy attendance."
            subject["currentAttendance"] = round(current_attendance, 2)
            subject["bunksPossible"] = int(bunks_possible) if bunks_possible > 0 else 0
            subject["recommendation"] = recommendation
        return jsonify(subjects)
    except Exception as e:
        print(f"--- ERROR IN get_subjects ---: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500

@app.route('/api/attendance', methods=['POST'])
@token_required
def update_attendance(current_user):
    try:
        data = request.get_json(); subject_id = data.get('subjectId'); status = data.get('status')
        update_operation = {'$inc': {'totalClasses': 1}}
        if status == 'attended': update_operation['$inc']['attendedClasses'] = 1
        result = subjects_collection.update_one({'_id': ObjectId(subject_id), 'userId': current_user['_id']}, update_operation)
        if result.matched_count == 0: return jsonify({"error": "Subject not found or permission denied"}), 404
        history_record = {"userId": current_user['_id'], "subjectId": ObjectId(subject_id), "status": status, "timestamp": datetime.now(timezone.utc)}
        attendance_records_collection.insert_one(history_record)
        return jsonify({"message": "Attendance updated successfully"}), 200
    except Exception as e:
        print(f"--- ERROR IN update_attendance ---: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500

# --- History Endpoints ---
@app.route('/api/history', methods=['GET'])
@token_required
def get_history(current_user):
    try:
        history_log = list(attendance_records_collection.find({'userId': current_user['_id']}).sort("timestamp", -1).limit(50))
        for record in history_log:
            subject = subjects_collection.find_one({"_id": record["subjectId"]})
            if subject: record["subjectName"] = subject.get("subjectName", "Unknown")
            record["_id"] = str(record["_id"]); record["subjectId"] = str(record["subjectId"]); record["userId"] = str(record["userId"])
            record["timestamp"] = record["timestamp"].strftime("%Y-%m-%d %H:%M:%S")
        return jsonify(history_log)
    except Exception as e:
        print(f"--- ERROR IN get_history ---: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500

@app.route('/api/history/<record_id>', methods=['DELETE'])
@token_required
def delete_history_record(current_user, record_id):
    try:
        record_to_delete = attendance_records_collection.find_one({'_id': ObjectId(record_id), 'userId': current_user['_id']})
        if not record_to_delete: return jsonify({"error": "Record not found or permission denied"}), 404
        status = record_to_delete.get('status'); subject_id = record_to_delete.get('subjectId')
        undo_operation = {'$inc': {'totalClasses': -1}}
        if status == 'attended': undo_operation['$inc']['attendedClasses'] = -1
        subjects_collection.update_one({'_id': subject_id, 'userId': current_user['_id']}, undo_operation)
        attendance_records_collection.delete_one({'_id': ObjectId(record_id)})
        return jsonify({"message": "Record deleted successfully"}), 200
    except Exception as e:
        print(f"--- ERROR IN delete_history_record ---: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500

# --- Planner / Event Endpoints ---
@app.route('/api/events', methods=['POST'])
@token_required
def add_event(current_user):
    try:
        data = request.get_json()
        event_doc = {"userId": current_user["_id"], "title": data["title"], "start": data["start"], "end": data.get("end"), "allDay": data.get("allDay", False)}
        events_collection.insert_one(event_doc)
        return jsonify({"message": "Event added successfully"}), 201
    except Exception as e:
        print(f"--- ERROR IN add_event ---: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500

@app.route('/api/events', methods=['GET'])
@token_required
def get_events(current_user):
    try:
        events = list(events_collection.find({'userId': current_user['_id']}))
        for event in events:
            event["_id"] = str(event["_id"]); event["userId"] = str(event["userId"])
        return jsonify(events)
    except Exception as e:
        print(f"--- ERROR IN get_events ---: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500

@app.route('/api/events/<event_id>', methods=['DELETE'])
@token_required
def delete_event(current_user, event_id):
    try:
        result = events_collection.delete_one({'_id': ObjectId(event_id), 'userId': current_user['_id']})
        if result.deleted_count == 0: return jsonify({"error": "Event not found or permission denied"}), 404
        return jsonify({"message": "Event deleted successfully"}), 200
    except Exception as e:
        print(f"--- ERROR IN delete_event ---: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500

# --- Main Execution Block ---
if __name__ == '__main__':
    app.run(debug=True)