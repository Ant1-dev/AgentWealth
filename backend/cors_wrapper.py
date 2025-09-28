# cors_wrapper.py - Add CORS to your Flask agents
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests

app = Flask(__name__)

# Enable CORS for all domains and all routes
CORS(app, origins=["http://localhost:4200", "http://localhost:3000"])

# Or more permissive for development
# CORS(app, origins="*")

# Proxy endpoints to your ADK agents
AGENT_PORTS = {
    'assessment': 8000,
    'planning': 8001, 
    'progress': 8002,
    'content': 8003
}

@app.route('/<agent_type>/run', methods=['POST', 'OPTIONS'])
def proxy_to_agent(agent_type):
    if request.method == 'OPTIONS':
        # Handle preflight request
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        return response
    
    if agent_type not in AGENT_PORTS:
        return jsonify({'error': 'Invalid agent type'}), 400
    
    try:
        # Forward request to the appropriate ADK agent
        agent_port = AGENT_PORTS[agent_type]
        agent_url = f"http://localhost:{agent_port}/run"
        
        response = requests.post(
            agent_url,
            json=request.json,
            headers={'Content-Type': 'application/json'}
        )
        
        # Return the agent's response with CORS headers
        result = jsonify(response.json())
        result.headers.add('Access-Control-Allow-Origin', '*')
        return result
        
    except Exception as e:
        error_response = jsonify({'error': str(e)})
        error_response.headers.add('Access-Control-Allow-Origin', '*')
        return error_response, 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'CORS proxy running', 'agents': AGENT_PORTS})

if __name__ == '__main__':
    print("🌐 Starting CORS proxy server on port 5001...")
    print("📡 Proxying requests to ADK agents:")
    for agent, port in AGENT_PORTS.items():
        print(f"   /{agent}/run -> http://localhost:{port}/run")
    
    app.run(host='0.0.0.0', port=5001, debug=True)