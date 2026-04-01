# Into the Rabbit hole

An app that helps you dig deep into the open web for any topic that interests you. Built for the TinyFish Hackathon, **Rabbit Hole Discoverer** uses autonomous agents, live web browsing, and graph analysis to turn your curiosity into a rich, explorable knowledge universe.

**Vercel Link -** [vercel-app](https://into-the-rabbit-hole.vercel.app/)

## What is Rabbit Hole Discoverer?

Rabbit Hole Discoverer is an experimental multi-agent system that:

- Takes any topic (film, book, true crime case, album, person, era, etc.)
- Sends **TinyFish** browser agents to explore live web pages about that topic
- Uses **OpenAI** models to extract structured knowledge from each page
- Builds a **3D directed acyclic graph** of concepts, entities, and relationships
- Streams graph updates to a web-based frontend so you can literally *watch* the rabbit hole grow in real time

Every node in the graph corresponds to a real web page that a TinyFish agent visited. Edges capture relationships such as references, shared entities, or thematic connections. Over time, you get a dynamic “knowledge universe” centered on your topic.

> TinyFish is the load-bearing infrastructure. Remove TinyFish and there is no product.

---

## Project Structure

At a glance:

```text
rabbit-hole/
├── backend/
│   ├── main.py               # FastAPI app entrypoint
│   ├── orchestrator.py       # Agent + graph orchestration
│   ├── agents/
│   │   ├── scout_agent.py
│   │   ├── analyst_agent.py
│   │   ├── ranker_agent.py
│   ├── models/
│   │   ├── graph_models.py
│   │   └── api_models.py
│   ├── graph/
│   │   └── graph_store.py
│   ├── utils/
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── graph/[session]/page.tsx
│   ├── components/
│   ├── lib/
│   ├── package.json
│   └── tailwind.config.ts
├── AGENTS.md
├── BRAND_GUIDELINES.md
├── JUDGING_CRITERIA.md
└── .env.example
```

---

## High-Level Architecture

The project is organized as a **Python backend** and a **TypeScript/Next.js frontend**.

### Backend (Python)

The backend lives under `backend/` and is primarily responsible for:

- Orchestrating agent workflows
- Managing the knowledge graph
- Providing APIs and WebSocket streams to the frontend

Key technologies:

- **FastAPI** – HTTP + WebSocket API
- **TinyFish** – async browser agents for live web navigation
- **OpenAI** – LLM-powered extraction and ranking
- **NetworkX** – graph storage and algorithms
- **Redis** – session, state, and pub/sub
- **ChromaDB** – embeddings store for “Study Mode” notes

#### Core Components

- `backend/main.py`  
  FastAPI app entrypoint; defines REST and WebSocket routes for:
  - Starting new “rabbit hole” sessions
  - Streaming graph updates
  - Attaching user-uploaded notes to the graph

- `backend/orchestrator.py`  
  The central coordinator that:
  - Accepts a user topic
  - Dispatches **Scout**, **Analyst**, and **Ranker** agents
  - Schedules TinyFish browsing runs
  - Updates the graph store after each agent cycle

- `backend/agents/`
  - `scout_agent.py` – finds promising URLs and seeds TinyFish runs  
  - `analyst_agent.py` – calls OpenAI to extract entities, concepts, and edges from TinyFish results  
  - `ranker_agent.py` – ranks nodes/edges for importance and interest, guiding further exploration  

- `backend/models/`
  - `graph_models.py` – typed Pydantic models for graph nodes, edges, and sessions  
  - `api_models.py` – request/response models for HTTP + WebSocket payloads  

- `backend/graph/`
  - `graph_store.py` – NetworkX-backed graph store, plus algorithms for:
    - Centrality
    - Community detection
    - Pathfinding and recommendations

All data passed between agents is **strongly typed via Pydantic models**. There are no raw dicts passed around internally.

### Frontend (TypeScript / Next.js)

The frontend lives under `frontend/` and is built with **Next.js 14** and **TypeScript**. Styling uses **Tailwind CSS**, following the project’s brand and visual language.

Key goals:

- Visualize the knowledge graph as an immersive, animated 3D “falling into a black hole” experience
- Provide intuitive search and session navigation
- Show live updates as new nodes and edges are discovered

#### Main Pieces

- `frontend/app/`
  - `layout.tsx` – global app layout, fonts, theming, and providers
  - `page.tsx` – landing page with search and recent sessions
  - `graph/[session]/page.tsx` – session-specific graph view

- `frontend/components/`
  - `GraphCanvas.tsx` – main graph visualization canvas
  - `NodeHoverCard.tsx` – rich node details on hover
  - `SearchBar.tsx` – topic entry and session search
  - `Sidebar.tsx` – session controls, filters, and study mode
  - `StatusPill.tsx` – small status indicator (connecting, exploring, idle, error)

- `frontend/lib/`
  - `graphStore.ts` – client-side graph state, selectors, and updates
  - `types.ts` – shared TypeScript types mirroring backend Pydantic models
  - `websocket.ts` – WebSocket connection helpers for streaming graph updates

---

## Key Features

- **Autonomous Multi-Agent Exploration**  
  Orchestrated agents coordinate TinyFish browsers and LLMs to expand the graph iteratively.

- **Live Web-Powered Graph**  
  Every graph node originates from a real URL; everything you see is anchored to the open web.

- **3D Graph Visualization**  
  Explore your topic as an interactive 3D structure—pan, zoom, and dive into clusters.

- **Streaming Updates via WebSocket**  
  As new pages are crawled and analyzed, nodes and edges stream directly into the frontend, creating a “falling deeper” effect.

- **Typed, Async-First Backend**  
  The entire backend is asynchronous and strictly typed using Pydantic, making it robust and predictable.

---

## Tech Stack

**Backend (≈48% Python)**

- Python 3.10+
- FastAPI
- TinyFish (`tinyfish` SDK)
- OpenAI Python SDK
- NetworkX, python-louvain
- Redis
- ChromaDB
- NumPy, PyMuPDF
- Pydantic v2
- Uvicorn

**Frontend (≈48% TypeScript, 4% CSS, 0.x% JS)**

- Next.js 14 (App Router)
- React
- TypeScript
- Tailwind CSS

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/Sneha421/into-the-rabbit-hole.git
cd into-the-rabbit-hole
```

### 2. Environment Variables

Create a `.env` file at the root from `.env.example`:

```bash
cp .env.example .env
```

Edit `.env` and set the following:

```bash
OPENAI_API_KEY=your-openai-api-key
TINYFISH_API_KEY=your-tinyfish-api-key
```

> All secrets must be provided via environment variables. No keys are hardcoded.

### 3. Backend Setup

From the project root:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Start the FastAPI server:

```bash
uvicorn main:app --reload
```

By default, the backend will be available at `http://localhost:8000`.

### 4. Frontend Setup

In a new terminal, from the project root:

```bash
cd frontend
pnpm install     # or: npm install / yarn install
pnpm dev         # or: npm run dev / yarn dev
```

The Next.js dev server will run on `http://localhost:3000`.

---

## How It Works (End-to-End)

1. **User starts a session**  
   - The user enters a topic (e.g., “The making of Blade Runner 2049”) in the frontend.
   - The frontend calls a backend API to create a new exploration session.

2. **Scout Agent + TinyFish**  
   - The **Scout Agent** constructs search URLs or curated entry points.
   - It queues TinyFish runs for each URL:
     - TinyFish is instructed (via natural language goal) what to extract and in which JSON format.
   - Runs are fully async and polled for completion.

3. **Analyst Agent + OpenAI**  
   - For each completed TinyFish run, the **Analyst Agent**:
     - Sends extracted content to OpenAI with instructions to:
       - Identify entities, concepts, events, and relationships
       - Return structured JSON that maps directly into node/edge models

4. **Graph Update & Algorithms**  
   - The orchestrator writes each new node/edge into the `graph_store`.
   - NetworkX algorithms run to:
     - Compute centrality
     - Discover communities/clusters
     - Suggest next exploration paths

5. **Streaming to Frontend**  
   - Every update is pushed to the frontend via a WebSocket channel.
   - The **GraphCanvas** component updates the visualization in place.

---


