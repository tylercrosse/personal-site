#!/bin/bash
# Start a simple Python HTTP server on port 8000
echo "Starting local server for DP Visualization..."
echo "Open http://localhost:8000 in your browser."
python3 -m http.server 8000 --bind 127.0.0.1
