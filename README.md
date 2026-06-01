# Yuno Orchestrator: Dynamic Multi-Agent Platform

A full-stack platform for visually constructing and configuring autonomous AI workflows via a Next.js canvas, allowing users to interact with their deployed multi-agent systems through an integrated web chat or an external Telegram bot.

---

## 🚀 Quick Start

**Prerequisites:** Docker, Docker Compose, Node.js, and an OpenAI API Key.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ramkorde-555/Agent-AI-Orchestrator
   cd yuno-ai-orchestrator
   ```

## 2. Configure Environment Variables:

Create or edit the `.env` file in the root directory and add your keys:

```env
GEMINI_API_KEY=your_openai_api_key_here (or OpenAI, Claude API Key)
DATABASE_URL=postgresql+psycopg_pool://user:password@db:5432/yunodb
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here (optional, required only for Telegram integration. Find how-to below)
PUBLIC_APP_URL=your_ngrok_public_url (defined later in Step 4)
```

## 3. Run the Application:

```bash
docker-compose up --build
```

## 4. Access Points:

- **Web UI (Next.js):** http://localhost:3000
- **API Docs (FastAPI):** http://localhost:8000/docs

Run ```ngrok http 8000```, copy the public URL to the env variable PUBLIC_APP_URL
To apply the change, run
```
docker-compose down
docker-compose up -d --build
```
## Setting up the Telegram Bot 

To test the external messaging channel integration, you will need a Telegram Bot Token. It takes less than 2 minutes to generate one for free.

**Step 1: Create the Bot via BotFather**
1. Open the Telegram app on your phone or desktop.
2. Search for the official **@BotFather** account (it has a blue verification checkmark) and start a chat.
3. Send the command `/newbot`.
4. Follow the prompts to give your bot a **Name** (e.g., "Yuno Orchestrator") and a **Username** (must end in `bot`, e.g., `yuno_eval_bot`).

**Step 2: Save the API Token**
Once created, BotFather will reply with a message containing your **HTTP API Token** (it will look something like `123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ`). 
* Copy this exact string.
* Open your `.env` file and paste it:
  ```env
  TELEGRAM_BOT_TOKEN=123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ


# Evaluation

## Core Requirements Met:

- **Visual Workflow Builder (UI/UX)**: Built with `@xyflow/react`. Users can drag-and-drop agents, define parameters (Model, Role, System Prompt, Tools), and map conditional routing edges directly on the canvas.

- **Autonomous Agent Communication (Architecture)**: Utilizes dynamic LangGraph compilation. The backend translates the UI's JSON blueprint into a runnable state graph at runtime, handling agent handoffs and  execution paths.

- **Live Monitoring & Messages**: The web UI features a split-pane interface. It pairs a standard user chat with a Developer Log streaming real-time tool executions, routing states, and token/cost calculations.

- **External Messaging Channel**: Telegram integration. The bot connects to the same PostgreSQL checkpointer memory as the web UI, allowing users to converse directly with their configured workflows remotely from their mobile devices.

# Architectural Highlights

- **Dynamic Graph Factory**: The LangGraph engine does not rely on static Python modules. It parses the custom frontend configurations on the fly to build isolated, multi-agent runtimes based strictly on the user's visual design.

- **CQRS-Lite State Management**: Separates "Machine Memory" (LangGraph's native `AsyncPostgresSaver` binary blobs for robust agent context preservation) from "Human Data" (a custom SQLModel `Message` table serving clean, relational logs directly to the Next.js UI).


# Example Usage

Follow these steps to experience the end-to-end functionality of the platform:

1. **Build**: Open <http://localhost:3000>. Drag agents from the sidebar onto the canvas. Map relationships by adding edges.

2. **Configure**: Click an agent. Assign it the a tool and give a system prompt (e.g., "You are a research writer").

3. **Deploy**: Click **"Deploy Workflow"** to sync the visual blueprint to the backend PostgreSQL database.

4. **Test Web**: Open the Chat interface panel. Send a prompt. Watch the Developer Logs track tool usage, inter-agent handoffs, and token consumption in real time.

5. **Test Telegram**: Message the provided Telegram bot (ensure your local server is tunneled via ngrok if testing locally) to interact with the exact same multi-agent workflow externally.


## Technical Stack & Architecture Justifications

As per the project requirements, here is the rationale behind the chosen technology stack:

**Required Languages: Python & TypeScript**
* **Python (Backend):** The undisputed industry standard for AI and LLM orchestration. It allows for native integration with LangChain/LangGraph and provides access to the most mature asynchronous libraries for complex data processing.
* **TypeScript (Frontend):** Building a dynamic node-based canvas is highly error-prone in vanilla JavaScript. TypeScript provides the strict type safety needed to ensure the visual graph accurately maps to the backend JSON schema without runtime crashes.

**AI Framework: LangGraph**
* **Why LangGraph over CrewAI or AutoGen?** While CrewAI and AutoGen are excellent for predefined, static agent teams, this platform requires a *dynamic* visual builder. LangGraph treats agent workflows as state machines (Graphs). This allowed us to build a "Graph Factory" that dynamically compiles the Python execution runtime directly from the Next.js UI's JSON output. Furthermore, LangGraph's native `AsyncPostgresSaver` handles complex multi-turn state persistence effortlessly.

**Development Tools (Frontend, Backend, Persistence, Messaging)**
* **Frontend UI (Next.js & @xyflow/react):** Next.js handles complex client/server state beautifully, and `@xyflow/react` is the premier library for building interactive node-based UIs with coordinate mapping and custom node rendering.
* **Backend API (FastAPI):** Chosen for its native asynchronous capabilities, which are absolutely critical when waiting on LLM API calls and streaming Server-Sent Events (SSE) to the frontend for real-time developer logs.
* **Persistence Layer (PostgreSQL & SQLModel):** PostgreSQL securely handles both the highly structured relational data (User CRUD, Chat Logs) and the binary blob storage required by LangGraph's internal checkpointer. 
* **Messaging Integration (Telegram):** Chosen for its lightweight webhook architecture, allowing seamless external testing of the agent workflows without forcing users to navigate complex OAuth flows.

**Cloud Platforms & Local Execution**
* **Fully Local Setup (Docker Compose):** To satisfy the requirement for a single-command local setup, the entire architecture (Next.js frontend, FastAPI backend, and PostgreSQL database) is containerized. Running `docker-compose up --build` guarantees a deterministic, cloud-agnostic execution environment that runs perfectly on any evaluator's machine.
