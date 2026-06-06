# AI Center: Jarvis AI Assistant for Home Assistant

Welcome to the **AI Center**! This repository is a fully-configured Home Assistant Add-on repository hosting the **AI Center Assistant** (Jarvis) — a premium, custom-built AI Home Assistant interface powered by Google's advanced **Gemini 2.5 Flash** model.

Unlike standard text-based terminals, this add-on provides a gorgeous, modern chat interface embedded directly into your Home Assistant sidebar, giving Gemini native, real-time control over your smart home entities (lights, climates, switches, history, and system health).

---

## 🚀 Key Features

* **🤖 Premium Custom Web UI**: Designed with modern web standards featuring a sleek dark theme, glassmorphic panels, responsive layout, and interactive micro-animations.
* **🔗 Deep Home Assistant Integration**: Pre-configured with native tool execution allowing Gemini to:
  * Check the state of your devices (`getHomeAssistantStates`).
  * Turn on, off, toggle, or set parameters for entities (`callHomeAssistantService`).
  * Look back at sensor history (`getHomeAssistantHistory`).
* **🔑 Zero-Configuration Authentication**: Automatically utilizes the Home Assistant Supervisor token (`SUPERVISOR_TOKEN`) when running inside Home Assistant—no manual API tokens needed for your smart home!
* **⚡ Gemini 2.5 Flash Engine**: Leverages Google's fast, high-context Gemini model for quick responses and intelligent tool calling.
* **💬 Quick Action Suggestions**: Interactive buttons for common smart home prompts (e.g., checking active lights or indoor temperature) to minimize typing.

---

## 📁 Repository Structure

All source files are modular and contained within the [ai-assistant/](file:///D:/workspace/ai%20center/ai-assistant/) directory for standard Home Assistant building requirements:

* **[repository.yaml](file:///D:/workspace/ai%20center/repository.yaml)**: Metadata registers this repository to the Home Assistant Add-on store.
* **[ai-assistant/config.yaml](file:///D:/workspace/ai%20center/ai-assistant/config.yaml)**: Defines add-on version, name, panel settings, Ingress proxying, and configuration schema.
* **[ai-assistant/Dockerfile](file:///D:/workspace/ai%20center/ai-assistant/Dockerfile)**: Multi-stage Docker build separating the React-Vite compile process from the production execution environment.
* **[ai-assistant/server.js](file:///D:/workspace/ai%20center/ai-assistant/server.js)**: Node.js/Express backend that hosts the API endpoints, runs the Gemini chat sessions, and executes local Home Assistant tool calls.
* **[ai-assistant/src/App.jsx](file:///D:/workspace/ai%20center/ai-assistant/src/App.jsx)**: React frontend providing the user interface, sidebar, chat logs, status cards, and action handlers.
* **[ai-assistant/run.sh](file:///D:/workspace/ai%20center/ai-assistant/run.sh)**: Core add-on entrypoint mapping Supervisor options to the running Node.js process.

---

## ⚙️ Installation & Setup

We have designed this add-on to be installed seamlessly from your Home Assistant Dashboard:

### 1. Register the Repository
1. Go to **Settings** → **Add-ons** → **Add-on Store**.
2. Click the **⋮** menu in the top right and select **Repositories**.
3. Add the following URL:
   `https://github.com/inzone1941-afk/AI-Center`
4. Close the modal and refresh your browser page.

### 2. Install the Add-on
1. Find **AI Center Assistant** under the newly added section and click **Install**.
2. *Note: The build process takes a few minutes as the container compiles the React/Vite assets locally.*

### 3. Configuration
1. Go to the add-on's **Configuration** tab.
2. Under `gemini_api_key`, enter your Google Gemini API key.
   * *If you do not have one, get it for free from [Google AI Studio](https://aistudio.google.com/).*
3. Click **Save**.

### 4. Enable Sidebar Access
1. Return to the **Information** tab.
2. Enable the **Show in sidebar** toggle.
3. Click **Start** to run the add-on.
4. Click **Jarvis AI** in your sidebar to interact with your assistant!

---

## 🛠️ Local Development & Testing

If you want to test modifications locally on your machine without running inside Home Assistant:

1. Navigate to the [ai-assistant/](file:///D:/workspace/ai%20center/ai-assistant/) directory.
2. Copy `.env.example` to `.env`.
3. Provide your `GEMINI_API_KEY`, `HASS_URL` (your Home Assistant IP/domain), and `HASS_TOKEN` (Long-lived access token generated from your HA user profile).
4. Run the following commands:
   ```bash
   # Install dependencies
   npm install
   
   # Build frontend static files
   npm run build
   
   # Start the Express server
   npm start
   ```
5. Access the app locally at `http://localhost:7682`.

---

## 📜 License

This repository is licensed under the MIT License.
