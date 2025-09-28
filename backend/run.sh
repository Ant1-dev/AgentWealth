#!/bin/bash

# Set the PYTHONPATH to include the current directory
export PYTHONPATH=.

# Start the assessment agent
echo "Starting Assessment Agent on port 8000..."
flask run --no-reload -h 0.0.0.0 -p 8000 --app assessment_agent.main &

# Start the planning agent
echo "Starting Planning Agent on port 8001..."
flask run --no-reload -h 0.0.0.0 -p 8001 --app planning_agent.main &

# Start the progress agent
echo "Starting Progress Agent on port 8002..."
flask run --no-reload -h 0.0.0.0 -p 8002 --app progress_agent.main &

# Start the content delivery agent
echo "Starting Content Delivery Agent on port 8003..."
flask run --no-reload -h 0.0.0.0 -p 8003 --app content_delivery_agent.main &

echo "All agents are running."