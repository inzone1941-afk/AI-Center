import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 7682;

// Home Assistant Configuration
const HASS_URL = process.env.HASS_URL || 'http://supervisor/core/api';
const HASS_TOKEN = process.env.HASS_TOKEN || process.env.SUPERVISOR_TOKEN;

// Initialize Google Gen AI
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
let ai;
if (GEMINI_API_KEY) {
  ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
} else {
  console.warn("WARNING: GEMINI_API_KEY is not set. Chat features will not work.");
}

// Helper function to call Home Assistant API
async function callHass(endpoint, method = 'GET', body = null) {
  if (!HASS_TOKEN) {
    throw new Error('Home Assistant authentication token not configured. Please set HASS_TOKEN or SUPERVISOR_TOKEN.');
  }

  const url = `${HASS_URL.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;
  const headers = {
    'Authorization': `Bearer ${HASS_TOKEN}`,
    'Content-Type': 'application/json'
  };

  const options = {
    method,
    headers
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  console.log(`[Home Assistant API] Request: ${method} ${url}`);
  const response = await fetch(url, options);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Home Assistant API error (${response.status}): ${errorText}`);
  }

  return response.json();
}

// Tool definitions for Gemini
const tools = [
  {
    functionDeclarations: [
      {
        name: 'getHomeAssistantStates',
        description: 'Get the current state and attributes of all entities in Home Assistant, or filter by a specific entity ID. Use this to check if lights are on, read sensor values, see thermostat settings, or find other devices.',
        parameters: {
          type: 'OBJECT',
          properties: {
            entityId: {
              type: 'STRING',
              description: 'Optional entity ID (e.g. "light.living_room", "climate.bedroom") to get the state of a single specific entity.'
            }
          }
        }
      },
      {
        name: 'callHomeAssistantService',
        description: 'Call a service in Home Assistant to control devices. For example, turn on/off lights, set temperature, lock doors, run scripts, or trigger automation.',
        parameters: {
          type: 'OBJECT',
          properties: {
            domain: {
              type: 'STRING',
              description: 'The service domain (e.g. "light", "switch", "climate", "script", "homeassistant").'
            },
            service: {
              type: 'STRING',
              description: 'The service name (e.g. "turn_on", "turn_off", "toggle", "set_temperature").'
            },
            serviceData: {
              type: 'OBJECT',
              description: 'Optional JSON object of arguments for the service call (e.g. {"entity_id": "light.living_room", "brightness": 255} or {"entity_id": "climate.hallway", "temperature": 21}).'
            }
          },
          required: ['domain', 'service']
        }
      },
      {
        name: 'getHomeAssistantHistory',
        description: 'Get the history of state changes for specific entities over a period of time.',
        parameters: {
          type: 'OBJECT',
          properties: {
            entityIds: {
              type: 'STRING',
              description: 'Comma-separated list of entity IDs (e.g. "sensor.temperature,sensor.humidity").'
            },
            startTime: {
              type: 'STRING',
              description: 'Optional start time in ISO 8601 format (e.g. "2026-06-06T12:00:00Z"). Defaults to 24 hours ago.'
            }
          },
          required: ['entityIds']
        }
      }
    ]
  }
];

// Helper to handle Gemini function calls
async function handleToolCall(toolCall) {
  const { name, args } = toolCall;
  console.log(`[Gemini Tool Exec] ${name} with args:`, args);

  switch (name) {
    case 'getHomeAssistantStates': {
      if (args.entityId) {
        return await callHass(`states/${args.entityId}`);
      } else {
        return await callHass('states');
      }
    }
    case 'callHomeAssistantService': {
      return await callHass(`services/${args.domain}/${args.service}`, 'POST', args.serviceData);
    }
    case 'getHomeAssistantHistory': {
      const startTime = args.startTime || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      return await callHass(`history/period/${startTime}?filter_entity_id=${args.entityIds}`);
    }
    default:
      throw new Error(`Unknown tool call: ${name}`);
  }
}

// Endpoint to check configuration status
app.get('/api/status', (req, res) => {
  res.json({
    geminiConfigured: !!GEMINI_API_KEY,
    hassConfigured: !!HASS_TOKEN,
    hassUrl: HASS_URL,
    localTime: new Date().toISOString()
  });
});

// Endpoint to run the chat
app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;

  if (!ai) {
    return res.status(500).json({ error: 'Gemini API key is not configured. Please set GEMINI_API_KEY in configuration.' });
  }
  if (!HASS_TOKEN) {
    return res.status(500).json({ error: 'Home Assistant Token is not configured. Please set HASS_TOKEN.' });
  }

  try {
    // Format history for the chat session:
    // messages: [{role: 'user'|'assistant', content: string}]
    // We want the last message as the current message and others as history.
    const history = messages.slice(0, -1).map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));
    const currentMessage = messages[messages.length - 1].content;

    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: `You are an advanced AI home assistant named Jarvis, integrated into Home Assistant.
You have direct control over lights, switches, climates, media players, and can query state history, and current status of all devices.
Be extremely helpful, conversational, and precise.
If asked about health, lights, or anything else, check the current states of the devices using the tools first to see what exists in the system.
If the user asks to turn on or toggle a light, use the callHomeAssistantService tool.
When formatting replies, use friendly tone and clean markdown.`,
        tools: tools
      },
      history: history
    });

    let response = await chat.sendMessage({ message: currentMessage });

    // Handle tool calls in a loop until model produces final text
    while (response.functionCalls && response.functionCalls.length > 0) {
      const functionCallResults = [];

      for (const call of response.functionCalls) {
        try {
          const result = await handleToolCall(call);
          functionCallResults.push({
            functionResponse: {
              name: call.name,
              response: { result }
            }
          });
        } catch (error) {
          console.error(`Error executing tool ${call.name}:`, error);
          functionCallResults.push({
            functionResponse: {
              name: call.name,
              response: { error: error.message }
            }
          });
        }
      }

      // Send the tool results back to Gemini
      response = await chat.sendMessage({ message: functionCallResults });
    }

    res.json({ content: response.text });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Serve frontend static files in production
app.use(express.static(path.join(__dirname, 'dist')));

app.get('*any', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`AI Center assistant running on http://0.0.0.0:${PORT}`);
});
