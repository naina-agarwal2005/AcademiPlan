# === FILE: app.py ===

# (1) Import the tools we need
from flask import Flask, request, jsonify
from flask_cors import CORS

# (2) Create our web server application
app = Flask(__name__)
CORS(app) # This allows our front-end to talk to our back-end

# (3) Define a specific URL for our calculator
@app.route('/api/calculate', methods=['POST'])
def calculate_bunks():
    # (4) This function runs when a request hits the URL above

    # (5) Get the data the front-end sent to us
    data = request.get_json()

    try:
        # (6) Do the core calculation
        total_classes = int(data['totalClasses'])
        attended_classes = int(data['attendedClasses'])
        min_attendance = int(data['minAttendance'])

        min_required = (total_classes * min_attendance) / 100
        bunks_possible = attended_classes - min_required

        if bunks_possible < 0:
            bunks_possible = 0

        # (7) Send the result back to the front-end in JSON format
        return jsonify({'bunksPossible': int(bunks_possible)})

    except:
        # If anything goes wrong, send an error message
        return jsonify({'error': 'Invalid input. Please check your numbers.'}), 400

# (8) This line starts the server
if __name__ == '__main__':
    app.run(debug=True)