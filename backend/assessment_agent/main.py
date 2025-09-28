from flask import Flask, request, jsonify
from flask_cors import CORS
from .agent import root_agent

app = Flask(__name__)
CORS(app)

@app.route("/run", methods=['POST'])
def run_agent():
    data = request.json
    user_id = data.get("user_id")
    message = data.get("message")

    response = ""
    for chunk in root_agent.invoke(message, session_id=user_id):
        response += chunk

    return jsonify({"response": response})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)