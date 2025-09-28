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
    
    data = request.json
    
    user_id = data.get("userId")
    message_data = data.get("newMessage", {})
    message = message_data.get("text") if isinstance(message_data, dict) else None
    
    if not user_id or not message:
        print("Validation failed: 'userId' or 'newMessage.text' key is missing or invalid in payload.")
        return jsonify({"error": "Invalid request payload"}), 400

    response_text = ""
    
    try:
        session_id = user_id 
        
        # Check if a session already exists in the database for this user.
        existing_session = run_async(runner.session_service.get_session(
            app_name=runner.app_name, user_id=user_id, session_id=session_id
        ))

        # If no session is found, create a new one.
        if existing_session is None:
            print(f"No session found for user '{user_id}'. Creating a new one.")
            new_session = run_async(runner.session_service.create_session(
                app_name=runner.app_name, user_id=user_id, session_id=session_id
            ))
            session_id = new_session.id
        else:
            print(f"Found existing session for user '{user_id}'.")

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
    app.run(host="0.0.0.0", port=8003)

