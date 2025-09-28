#!/bin/bash

# This script stops the Flask agent servers running on ports 8000-8003.

echo "Shutting down all agent servers..."

# Find and kill the process running on each port
kill $(lsof -t -i:8000) 2>/dev/null && echo "Stopped Assessment Agent on port 8000."
kill $(lsof -t -i:8001) 2>/dev/null && echo "Stopped Planning Agent on port 8001."
kill $(lsof -t -i:8002) 2>/dev/null && echo "Stopped Progress Agent on port 8002."
kill $(lsof -t -i:8003) 2>/dev/null && echo "Stopped Content Delivery Agent on port 8003."

echo "All agent servers have been stopped."
