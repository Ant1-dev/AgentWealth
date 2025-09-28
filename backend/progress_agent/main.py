from flask import Flask, request, jsonify
from flask_cors import CORS
from .agent import runner
from google.genai import types
import asyncio
import sys
import os

# Add the parent 'backend' directory to the Python path to find the 'shared' module
_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_BACKEND_DIR = os.path.abspath(os.path.join(_SCRIPT_DIR, '..'))
sys.path.append(_BACKEND_DIR)

# Import the shared database service
from shared.db_service import db

app = Flask(__name__)
CORS(app)

# The ADK's session methods are asynchronous, but Flask routes are synchronous.
# This helper function allows us to call the async methods from our Flask code.
def run_async(coro):
    # This ensures we have an event loop in the current thread
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:  # 'RuntimeError: There is no current event loop...'
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)

@app.route("/run", methods=['POST'])
def run_agent():
    data = request.json
    user_id = data.get("userId")
    message_data = data.get("newMessage", {})
    message = message_data.get("text") if isinstance(message_data, dict) else None
    
    if not user_id or not message:
        return jsonify({"error": "Invalid request payload"}), 400

    response_text = ""
    try:
        session_id = user_id
        existing_session = run_async(runner.session_service.get_session(
            app_name=runner.app_name, user_id=user_id, session_id=session_id
        ))

        if existing_session is None:
            new_session = run_async(runner.session_service.create_session(
                app_name=runner.app_name, user_id=user_id, session_id=session_id
            ))
            session_id = new_session.id

        content = types.Content(
            role='user',
            parts=[types.Part.from_text(text=message)]
        )
        
        for event in runner.run(user_id=user_id, session_id=session_id, new_message=content):
            if event.content and event.content.parts and event.content.parts[0].text:
                response_text += event.content.parts[0].text
    
        return jsonify({"response": response_text})
    except Exception as e:
        print(f"An error occurred during agent run: {e}")
        return jsonify({"response": f"An internal server error occurred: {e}"}), 500

# --- NEW ENDPOINT FOR DASHBOARD DATA ---
@app.route("/dashboard-data", methods=['GET'])
def get_dashboard_data():
    user_id = request.args.get('userId')
    if not user_id:
        return jsonify({"error": "userId parameter is required"}), 400

    try:
        # Fetch learning path and progress from the shared database service
        learning_path_data = db.get_user_learning_path(user_id)
        progress_data = db.get_user_progress(user_id)
        
        # If no learning path exists, return a clear message
        if not learning_path_data:
            return jsonify({
                "learningPath": None,
                "progress": {}
            })
            
        # Process progress data into a more usable format (module_id -> progress %)
        processed_progress = {}
        for module_id, step, score, date in progress_data:
             # Find the latest progress entry for each module
            if module_id not in processed_progress:
                processed_progress[module_id] = step
            else:
                if step > processed_progress[module_id]:
                    processed_progress[module_id] = step

        dashboard_payload = {
            "learningPath": learning_path_data.get("path_data", {}),
            "progress": processed_progress
        }
        
        return jsonify(dashboard_payload)
        
    except Exception as e:
        print(f"An error occurred fetching dashboard data: {e}")
        return jsonify({"error": f"An internal server error occurred: {e}"}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8002)

