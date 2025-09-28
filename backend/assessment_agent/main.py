from flask import Flask, request, jsonify
from flask_cors import CORS
from .agent import runner
from google.genai import types
import asyncio

app = Flask(__name__)
CORS(app)

# The ADK's session methods are asynchronous, but Flask routes are synchronous.
# This helper function allows us to call the async methods from our Flask code.
def run_async(coro):
    return asyncio.run(coro)

@app.route("/run", methods=['POST'])
def run_agent():
    # --- Start of Debugging Logs ---
    # Log the incoming request headers and raw data to diagnose the issue.
    print("--- New Request ---")
    print("Request Headers:", request.headers)
    print("Request Raw Body:", request.data)
    # --- End of Debugging Logs ---
    
    data = request.json
    
    # --- Start of Debugging Logs ---
    print("Parsed JSON Body:", data)
    # --- End of Debugging Logs ---

    # --- START OF FIX ---
    # Changed the keys to match the incoming payload from the Angular frontend.
    user_id = data.get("userId")
    message_data = data.get("newMessage", {})
    message = message_data.get("text") if isinstance(message_data, dict) else None
    
    if not user_id or not message:
        print("Validation failed: 'userId' or 'newMessage.text' key is missing or invalid in payload.")
        return jsonify({"error": "Invalid request payload"}), 400
    # --- END OF FIX ---
    
    response_text = ""
    
    try:
        # --- START OF SESSION MANAGEMENT ---
        # 1. For simplicity, we'll use the user's ID as the session ID.
        session_id = user_id 
        
        # 2. Check if a session already exists in the database for this user.
        existing_session = run_async(runner.session_service.get_session(
            app_name=runner.app_name, user_id=user_id, session_id=session_id
        ))

        # 3. If no session is found, create a new one.
        if existing_session is None:
            print(f"No session found for user '{user_id}'. Creating a new one.")
            new_session = run_async(runner.session_service.create_session(
                app_name=runner.app_name, user_id=user_id, session_id=session_id
            ))
            session_id = new_session.id
        else:
            print(f"Found existing session for user '{user_id}'.")
        # --- END OF SESSION MANAGEMENT ---

        content = types.Content(
            role='user',
            parts=[types.Part.from_text(text=message)]
        )
        
        for event in runner.run(user_id=user_id, session_id=session_id, new_message=content):
            if event.content and event.content.parts and event.content.parts[0].text:
                response_text += event.content.parts[0].text
    
        return jsonify({"response": response_text})

    except Exception as e:
        print(f"An error occurred: {e}")
        return jsonify({"response": f"An internal server error occurred: {e}"}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)

