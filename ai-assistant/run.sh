#!/usr/bin/with-contenv bashio
# Note: Using bashio functions if available, or fallback to standard bash/sh

echo "=================================================="
echo "Starting AI Center Assistant Add-on..."
echo "=================================================="

# Path to Home Assistant configuration options
OPTIONS_FILE="/data/options.json"

if [ -f "$OPTIONS_FILE" ]; then
    echo "Loading configuration options..."
    
    # Read Gemini API Key
    export GEMINI_API_KEY=$(jq -r '.gemini_api_key // ""' "$OPTIONS_FILE")
    if [ -z "$GEMINI_API_KEY" ]; then
        echo "WARNING: gemini_api_key option is not set. Chat features will not work."
    else
        echo "Gemini API key loaded."
    fi
    
    # Read Home Assistant URL
    export HASS_URL=$(jq -r '.hass_url // "http://supervisor/core/api"' "$OPTIONS_FILE")
    echo "Home Assistant API URL: $HASS_URL"
    
    # Use supervisor token if injected by HA
    if [ -n "$SUPERVISOR_TOKEN" ]; then
        export HASS_TOKEN="$SUPERVISOR_TOKEN"
        echo "Using Supervisor authentication token."
    else
        echo "WARNING: SUPERVISOR_TOKEN not found. Assistent might not have access to your Home Assistant."
    fi
else
    echo "WARNING: No configuration file found at $OPTIONS_FILE. Using environment defaults."
fi

# Start Node.js server
echo "Launching Node.js backend server..."
cd /app
exec node server.js
