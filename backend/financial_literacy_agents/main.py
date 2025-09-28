# financial-literacy-agents/main.py
from flask import Flask, request, jsonify
from flask_cors import CORS
from assessment_agent.tools.assessment_tools import save_user_assessment
# Import the planning tool
from planning_agent.tools.planning_tools import create_learning_path

app = Flask(__name__)
CORS(app)

@app.route('/assess', methods=['POST'])
def assess_user():
    # ... (existing code for this route)
    data = request.json
    user_id = data.get('userId')
    user_response = data.get('response')
    topic = data.get('topic', 'investment_basics')
    if not all([user_id, user_response]):
        return jsonify({"error": "Missing userId or response"}), 400
    result = save_user_assessment(
        user_id=user_id,
        topic=topic,
        user_response=user_response
    )
    return jsonify({"message": result})

# --- ADD THE NEW ENDPOINT FOR THE PLANNING AGENT ---
@app.route('/plan', methods=['POST'])
def create_plan():
    """
    Endpoint to interact with the planning agent.
    """
    data = request.json
    user_id = data.get('userId')

    if not user_id:
        return jsonify({"error": "Missing userId"}), 400

    # Call the planning agent's tool function
    result = create_learning_path(user_id=user_id)

    return jsonify({"message": result})
# --- END OF NEW ENDPOINT ---

if __name__ == '__main__':
    app.run(port=5000, debug=True)