#!/bin/bash

# Set the PYTHONPATH to include the project's root directory
export PYTHONPATH=.

# Start the assessment agent
echo "Starting Assessment Agent on port 8000..."
export FLASK_APP=assessment_agent.main
flask run --no-reload -h 0.0.0.0 -p 8000 &

# Start the planning agent
echo "Starting Planning Agent on port 8001..."
export FLASK_APP=planning_agent.main
flask run --no-reload -h 0.0.0.0 -p 8001 &

# Start the progress agent
echo "Starting Progress Agent on port 8002..."
export FLASK_APP=progress_agent.main
flask run --no-reload -h 0.0.0.0 -p 8002 &

# Start the content delivery agent
echo "Starting Content Delivery Agent on port 8003..."
export FLASK_APP=content_delivery_agent.main
flask run --no-reload -h 0.0.0.0 -p 8003 &

echo "All agents are running."
