# Rabbit Hole Discoverer — Codex Prompt Set
## Step-by-step prompts for every build phase · TinyFish SG Hackathon

---

## HOW TO USE THIS DOCUMENT

Run these prompts **in order** inside a Codex session. Each prompt is self-contained but assumes all prior steps are complete. Before starting, make sure Codex has access to both `AGENTS.md` and `BRAND_GUIDELINES.md` in its context window.

---

## PROMPT 0 — PROJECT BOOTSTRAP

```
Read AGENTS.md and BRAND_GUIDELINES.md in full before writing a single line of code.
Do not summarise them — absorb them.

Now scaffold the repository:

1. Create every directory listed under REPOSITORY STRUCTURE in AGENTS.md using `mkdir -p`.
2. Create `.env.example` with the three keys shown in Step 0.1.
3. Create `backend/requirements.txt` exactly as shown in Step 0.2.
4. Create `frontend/package.json` exactly as shown in Step 0.3.
5. Run `pip install -r backend/requirements.txt` (add --break-system-packages if needed).
6. Run `cd frontend && npm install`.

After each file is created, print the path. After installs complete, confirm no errors.
Do not create any Python or TypeScript source files yet.
```

---

## PROMPT 1 — DATA MODELS

```
We are building Rabbit Hole Discoverer. AGENTS.md and BRAND_GUIDELINES.md are in your context.

Create the two data model files exactly as specified in Step 1 of AGENTS.md.

File 1: `backend/models/__init__.py` — empty file.
File 2: `backend/models/graph_models.py` — paste the full class definitions from Step 1.1.
  Contains: NodeType enum, EdgeType enum, Node model, Edge model, GraphDelta model.
File 3: `backend/models/api_models.py` — paste the full class definitions from Step 1.2.
  Contains: DiscoverRequest, ExpandRequest, StudyAskRequest.

After creating each file, verify:
- All imports resolve (pydantic, typing, enum).
- No field names have been changed.
- NodeType and EdgeType have exactly the values in AGENTS.md.

Do not create any other files yet.
```

---

## PROMPT 2 — GRAPH STORE

```
We are building Rabbit Hole Discoverer. Data models from Step 1 are complete and importable.

Create the graph store layer:

File 1: `backend/graph/__init__.py` — empty file.
File 2: `backend/graph/graph_store.py` — implement the full GraphStore class from Step 2.1 of AGENTS.md.

The class must:
- Use networkx.DiGraph internally as `self.G`.
- Expose add_node, add_edge, apply_delta, apply_scores, get_node, to_json, delta_to_json.
- In add_edge: only add the edge if BOTH source and target nodes already exist in self.G.
- In apply_scores: update all six score fields plus cluster_id from the scores dict.

After creating the file, run a quick smoke test:
```python
import sys; sys.path.insert(0, 'backend')
from graph.graph_store import GraphStore
from models.graph_models import Node, NodeType
gs = GraphStore("test")
gs.add_node(Node(id="a", label="A", node_type=NodeType.CONCEPT, depth=0))
assert "a" in gs.G.nodes
print("GraphStore OK")
```
Print the result. Fix any import errors before continuing.
```

---

## PROMPT 3 — SCOUT AGENT

```
We are building Rabbit Hole Discoverer. Steps 0–2 are complete.

Create the Scout Agent as specified in Step 3 of AGENTS.md.

File: `backend/agents/__init__.py` — empty file.
File: `backend/agents/scout_agent.py` — implement exactly as shown in Step 3.1.

Key rules:
- _generate_queries calls gpt-4o with temperature=0.85 and returns exactly 6 queries.
- Wrap the OpenAI call in try/except; on failure return [topic] as fallback.
- The _fetch_pages method is a STUB — leave it returning [] with the TODO comment intact.
  Do NOT attempt to add TinyFish calls yet; that comes at the workshop session.
- The discover method must: generate queries, run _fetch_pages for all 6 in parallel via asyncio.gather, tag each page dict with its depth, and return the flat list.

After creating, verify imports resolve: openai, asyncio, json, os.
Do not connect TinyFish yet — leave the STUB exactly as written.

HOOK TO CREATE — add a comment at the top of _fetch_pages:
# TINYFISH_HOOK: Replace this stub at the workshop.
# Expected interface: self.tf.search(query, max_results=5) -> list of result objects
# Each result: result.url, result.title
# Fetch content: await self.tf.fetch(result.url, extract="text") -> str
# Slice content to first 3000 chars before appending to pages list.
```

---

## PROMPT 4 — ANALYST AGENT

```
We are building Rabbit Hole Discoverer. Steps 0–3 are complete.

Create the Analyst Agent as specified in Step 4 of AGENTS.md.

File: `backend/agents/analyst_agent.py` — implement exactly as shown in Step 4.1.

This is the only agent that calls gpt-4o for structured knowledge extraction.

Key rules:
- The SYSTEM prompt must be copied verbatim — do not paraphrase or shorten it.
- Process pages in batches of 3 to respect context limits.
- The user message format is: "Seed topic: {topic}\n\nWeb content:\n{content_block}"
- Use temperature=0.3 and max_tokens=2000.
- Wrap EVERY OpenAI call in try/except — on failure, print the error and continue to the next batch.
- Deduplicate nodes by id using `seen_node_ids: set[str]`.
- Node parse errors and edge parse errors must each be caught individually and printed, but must not stop the loop.
- Return a typed GraphDelta — never raw dicts.

After creating, run this smoke test:
```python
import sys, asyncio; sys.path.insert(0, 'backend')
from agents.analyst_agent import AnalystAgent
delta = asyncio.run(AnalystAgent().enrich([], seed_topic="test", session_id="s1"))
assert delta.nodes == [] and delta.edges == []
print("AnalystAgent empty-pages OK")
```
```

---

## PROMPT 5 — RANKER AGENT

```
We are building Rabbit Hole Discoverer. Steps 0–4 are complete.

Create the Ranker Agent as specified in Step 5 of AGENTS.md.

File: `backend/agents/ranker_agent.py` — implement exactly as shown in Step 5.1.

This agent is pure NetworkX — zero LLM calls.

Key rules:
- compute_all must return {} immediately if the graph has 0 nodes.
- Wrap each of the 6 algorithm calls in its own try/except with a safe fallback.
  Algorithms: pagerank, betweenness_centrality, eigenvector_centrality_numpy, hits,
  community_louvain.best_partition (Louvain), and the composite rabbit_hole_score.
- rabbit_hole_score formula: 0.40 * pagerank + 0.35 * betweenness + 0.25 * eigenvector
- top_rabbit_holes must exclude seed nodes (is_seed == True) from candidates.
- get_path uses dijkstra_path with weight="weight"; returns [] on NetworkXNoPath or NodeNotFound.

After creating, run this smoke test:
```python
import sys; sys.path.insert(0, 'backend')
import networkx as nx
from agents.ranker_agent import RankerAgent
G = nx.DiGraph()
G.add_node("a", is_seed=True); G.add_node("b", is_seed=False)
G.add_edge("a", "b", weight=0.8)
scores = RankerAgent().compute_all(G)
assert "pagerank" in scores and "rabbit_hole_score" in scores
print("RankerAgent OK, scores:", list(scores.keys()))
```
```

---

<!-- PROMPT 6 — STUDY AGENT removed: Study Mode deprecated -->

---

## PROMPT 7 — ORCHESTRATOR

```
We are building Rabbit Hole Discoverer. Steps 0–6 are complete.

Create the Orchestrator as specified in Step 7 of AGENTS.md.

File: `backend/orchestrator.py` — implement the full RabbitHoleOrchestrator class from Step 7.1.

Key rules:
- SESSIONS: dict[str, GraphStore] is a module-level global — main.py imports and reads it.
- The Broadcaster type alias is: Callable[[dict], Awaitable[None]]
- _status sends {"type": "status", "message": msg}
- _push_delta sends {"type": "graph_delta", ...} using graph.delta_to_json(delta)
- _push_full sends {"type": "graph_full", ...} using graph.to_json()
- _expand_topic is the core loop: status → scout.discover → analyst.enrich →
  graph.apply_delta → ranker.compute_all → graph.apply_scores → _push_delta
- start method: create seed node → _push_full → depth-0 expansion → depth-1 parallel
  expansion of top 2 rabbit_hole_score nodes → final status message.
- expand_node: look up node by id, call _expand_topic with its label at depth+1.
- Status messages must use the exact copy from BRAND_GUIDELINES.md microcopy table:
  - Hunting: "Scout hunting: {topic}" (prefix with 🔭)
  - Mapping: "Analyst mapping: {topic}" (prefix with 🧠)
  - Scoring: "Ranker scoring graph…" (prefix with 📊)
  - Complete: "Rabbit hole complete. Click any node to go deeper." (prefix with ✅)

After creating, verify the import chain resolves:
orchestrator.py → graph_store, scout_agent, analyst_agent, ranker_agent, study_agent, models
```

---

## PROMPT 8 — FASTAPI BACKEND

```
We are building Rabbit Hole Discoverer. Steps 0–7 are complete. The orchestrator is working.

Create the FastAPI entry point as specified in Step 8 of AGENTS.md.

File: `backend/main.py` — implement exactly as shown in Step 8.1.

The file must include:
- FastAPI app with CORSMiddleware (allow_origins=["*"])
- WS: dict[str, WebSocket] module-level dict for active connections
- broadcast(session_id, payload) async helper — catches and ignores send errors, removes dead sockets
- WebSocket endpoint at /ws/{session_id} — accepts, registers, keeps alive with receive_text loop
- POST /api/discover — generates session_id, creates orchestrator, fires orch.start as a background task, returns {"session_id": ...}
- POST /api/expand/{node_id} — reconstructs a lightweight orchestrator from the existing SESSIONS graph, fires orch.expand_node as a background task
- GET /api/graph/{session_id} — returns full graph JSON
- GET /api/path/{session_id}/{source}/{target} — returns Dijkstra path
- POST /api/study/upload/{session_id} — reads uploaded file, calls study.ingest + study.link_to_graph
- POST /api/study/ask — calls study.ask

After creating, start the server:
  cd backend && uvicorn main:app --reload --port 8000

Verify it starts without import errors. Test with:
  curl -X POST $PUBLIC_URL/api/discover \
    -H "Content-Type: application/json" \
    -d '{"topic":"test","max_depth":1}'

It should return a JSON object with a session_id UUID.
```

---

## PROMPT 9 — FRONTEND SHARED CODE

```
We are building Rabbit Hole Discoverer. The backend is running on port 8000.
Read BRAND_GUIDELINES.md before writing any frontend file.

Create the frontend shared layer as specified in Step 9 of AGENTS.md.

File 1: `frontend/lib/types.ts`
  - NodeType and EdgeType union types
  - GraphNode interface with all score fields from graph_models.py
  - GraphEdge interface
  - WsMessage union type with variants: graph_delta, graph_full, status

File 2: `frontend/lib/graphStore.ts`
  - Zustand store with: nodes (Map), edges (array), status string, selectedNode, sessionId
  - Actions: applyDelta, applyFull, setStatus, selectNode, setSession
  - applyDelta merges new nodes into the Map and concatenates edges
  - applyFull replaces all nodes and edges

File 3: `frontend/lib/websocket.ts`
  - useGraphSocket(sessionId) hook
  - Connects to ws://$PUBLIC_URL/ws/{sessionId} (use NEXT_PUBLIC_WS_URL or PUBLIC_URL env var with fallback)
  - On message: parse JSON, route by type to graphStore actions
  - Reconnects on close with 2-second delay (max 5 retries)
  - Sends a "ping" string every 30 seconds to keep the connection alive

File 4: `frontend/app/globals.css`
  - Copy ALL CSS variables from BRAND_GUIDELINES.md :root block verbatim — no changes
  - Copy ALL @keyframes blocks from BRAND_GUIDELINES.md verbatim
  - Add .graph-canvas-bg class from BRAND_GUIDELINES.md
  - Add .study-open .graph-canvas-bg override
  - Add .note-linked-badge and .study-answer classes
  - Add .study-mode body tint override (subtle sepia/hue-rotate)

File 5: `frontend/tailwind.config.ts`
  - Extend theme with the brand fonts: Space Grotesk, IBM Plex Sans, JetBrains Mono
  - Extend with the brand colour tokens as Tailwind custom colours matching BRAND_GUIDELINES.md

File 6: `frontend/app/layout.tsx`
  - Add Google Fonts link tags for Space Grotesk, IBM Plex Sans, JetBrains Mono
    (exact href from BRAND_GUIDELINES.md Typography section)
  - Set html font to Space Grotesk
  - Set background to var(--void) = #000000

After each file, verify TypeScript types are consistent — GraphNode fields must
match exactly what the backend sends.
```

---

## PROMPT 10 — GRAPH CANVAS COMPONENT

```
We are building Rabbit Hole Discoverer. Frontend shared code from Step 9 is complete.
Read BRAND_GUIDELINES.md — specifically the THREE.JS GRAPH CONFIGURATION section — before writing this file.

Create `frontend/components/GraphCanvas.tsx` as specified in Step 10.1 of AGENTS.md.

Key rules:
- Use `dynamic(() => import('3d-force-graph'), { ssr: false })` — Three.js is browser-only.
- Mount the graph into the div via `useRef` + `ForceGraph3D(mountRef.current)`.
- Apply EVERY config value from BRAND_GUIDELINES.md THREE.JS GRAPH CONFIGURATION verbatim:
  .nodeVal — PageRank drives radius: 2 + (n.pagerank ?? 0) * 60
  .nodeColor — CLUSTER_COLORS[n.cluster_id % 6] ?? "#ffffff"
  .nodeOpacity — Math.max(0.6, 1 - (n.depth ?? 0) * 0.12)
  .linkColor — rgba(255,255,255,0.10)
  .linkWidth — (l.weight ?? 0.5) * 3
  .linkDirectionalParticles — Math.round((l.weight ?? 0.5) * 5)
  .linkDirectionalParticleSpeed — 0.004
  .linkDirectionalParticleColor — "#00f5e4" (always Pulsar Cyan)
  .backgroundColor — "#000000"
- On node click: call graphStore.selectNode(node)
- On node right-click: do nothing for now (leave a TODO for future context menu)
- The CLUSTER_COLORS map must match BRAND_GUIDELINES.md exactly (copy it verbatim)
- Add a TODO comment for UnrealBloomPass post-processing (don't implement yet — save time)
- useEffect watches [nodes, edges] from graphStore and calls fgRef.current.graphData(...)

COMPONENT SIGNATURE:
interface GraphCanvasProps { sessionId: string }
export default function GraphCanvas({ sessionId }: GraphCanvasProps)

Apply .graph-canvas-bg class to the outer div so the nebula background renders.
The div must be w-full h-full so it fills the page.
```

---

## PROMPT 11 — STATUS PILL + NODE HOVER CARD

```
We are building Rabbit Hole Discoverer. GraphCanvas is complete.
Read BRAND_GUIDELINES.md — specifically the Status Pill and Node Hover Card sections — before writing these files.

Create two components:

FILE 1: `frontend/components/StatusPill.tsx`
  - Reads status string from graphStore
  - pillColor() maps keywords to brand colours:
    "Scout" or "hunting" → var(--cyan) = #00f5e4
    "Analyst" or "mapping" → var(--violet) = #9b4dff
    "Ranker" or "scoring" → var(--gold) = #f5c842
    "complete" → var(--teal) = #00c9a7
    default → white
  - Fixed position top-4, horizontally centred
  - Background: var(--surface-panel) with backdrop-blur-md
  - Animated pulsing dot using Tailwind animate-pulse
  - Entry animation: framer-motion fade + translateY(-8px → 0) over 200ms
  - AUTO-DISMISS: useEffect + setTimeout — hide pill 4 seconds after status stops changing
  - Font: JetBrains Mono text-[13px]

FILE 2: `frontend/components/NodeHoverCard.tsx`
  - Reads selectedNode from graphStore
  - Returns null if selectedNode is null
  - Layout matches the exact wireframe in BRAND_GUIDELINES.md Node Hover Card section
  - Border colour = CLUSTER_COLORS[selectedNode.cluster_id % 6] + "44" (26% opacity hex suffix)
  - Box shadow = `0 0 30px {clusterColor}22`
  - "Fall Deeper →" button: cluster colour background, black text, calls POST /api/expand/{node_id}
  - 📓 button: only rendered when selectedNode.has_user_notes === true
  - ✕ button: calls graphStore.selectNode(null)
  - Entry animation: scale 0.95 → 1.0, opacity 0 → 1, 150ms ease-out (framer-motion)
  - API base URL from: process.env.NEXT_PUBLIC_API_URL ?? process.env.PUBLIC_URL ?? "http://localhost:8000"
  - PR score displayed in JetBrains Mono text-xs

Typography rules from BRAND_GUIDELINES.md:
  - Type badge: Space Grotesk 500, uppercase, tracking-widest
  - Label: Space Grotesk 600, white
  - Year: Space Grotesk 400, white/40
  - Summary: IBM Plex Sans, var(--text-secondary) at 70%
  - Tags: rounded-full, text-xs, rgba(255,255,255,0.05) bg, var(--text-muted) text
```

---

<!-- PROMPT 12 — STUDY MODE removed -->

---

## PROMPT 13 — HOME PAGE + GRAPH PAGE

```
We are building Rabbit Hole Discoverer. All components are built.
Read BRAND_GUIDELINES.md — specifically the Search Bar + Home Screen and Demo Topic Pills sections — before writing these files.

FILE 1: `frontend/app/page.tsx` — Home page

Layout: full black screen, everything centred vertically and horizontally.

Elements (top to bottom):
1. Wordmark: "RABBIT HOLE"
   Font: Space Grotesk, weight 200, tracking 0.15em, all caps, text-white
2. Tagline: "Fall deeper. See everything."
   Font: IBM Plex Sans, var(--text-muted), text-base
3. Search input:
   - autofocus on mount
   - Animated placeholder cycling every 2000ms via setInterval:
     "a film…" → "a true crime case…" → "an album…" → "a book…" → "a decade…" → "a person…"
   - Background: transparent, border: 1px var(--border-active), rounded-lg
   - Font: IBM Plex Sans, text-white
   - Submit button inline right: gold background (#f5c842), black text, "→"
   - On submit: POST /api/discover {topic, max_depth: 2} → receive session_id → router.push(/graph/${session_id})
   - Submit animation: input fades out (opacity 0, scale 0.95, 300ms) before route push
4. Demo topic pills (row below input):
   - "Parasite (2019)"
   - "Dark Side of the Moon"
   - "The Zodiac Killer"
   - Each pill: border 1px var(--border-ghost), transparent bg → rgba(255,255,255,0.05) on hover
   - Text: var(--text-muted) → var(--text-secondary) on hover, transition 150ms
   - On click: set input value AND trigger form submit immediately

FILE 2: `frontend/app/graph/[session]/page.tsx` — Graph page

Paste the exact component code from Step 10.6 of AGENTS.md verbatim.

Then add the StudyMode drawer and its toggle button:
- Fixed 📓 button at bottom-right (above NodeHoverCard): z-50, var(--surface-card) bg, var(--border-ghost) border
- Clicking it toggles a `studyOpen` boolean in local state
- Render <StudyMode open={studyOpen} onClose={() => setStudyOpen(false)} /> conditionally

Make sure GraphCanvas is dynamically imported with ssr: false (already in the Step 10.6 template).
```

---

## PROMPT 14 — SIDEBAR COMPONENT

```
We are building Rabbit Hole Discoverer. All main components are complete.
Read BRAND_GUIDELINES.md — Sidebar section — before writing this file.

Create `frontend/components/Sidebar.tsx`

The sidebar is collapsed by default. Toggle with a ⊞ icon button pinned to the left edge of the graph page.

When open:
- Slides in from left, width 240px
- Background: var(--surface-panel) with backdrop-blur-xl
- Slide animation: framer-motion x from -240 to 0, 250ms ease-out

SIDEBAR CONTENTS (top to bottom):

1. Section: "Exploration Depth"
   - Slider, range 1–4, default 2
   - Label above shows current value: "Depth: 2"
   - On change: update a `maxDepth` value in local state
   - NOTE: Wire to the discover call via graphStore — add a maxDepth field to the store
     so the home page picks it up. Leave a TODO comment for now.

2. Section: "Active Algorithms"
   - Read-only list of the 6 algorithms with green dots (use var(--teal) = #00c9a7):
     ● PageRank  ● Betweenness  ● Eigenvector  ● Louvain  ● HITS  ● Dijkstra
   - Font: JetBrains Mono text-xs
   - Tooltip on hover for each:
     PageRank → "Gravitational pull — how much of the universe orbits this node"
     Betweenness → "Bridge score — remove this node and clusters disconnect"
     Use exact copy from BRAND_GUIDELINES.md microcopy table.

3. Section: "Layout"
   - Two buttons: "Force-Directed" and "Radial"
   - Active button: var(--gold) background, black text
   - On click: call fgRef.current.dagMode(null) for Force-Directed or dagMode("radial") for Radial
   - To reach fgRef from Sidebar: expose a setLayout callback prop from GraphCanvas via graphStore
     or use a ref passed through context. Leave a TODO if wiring is complex.

Add the toggle button to the graph page: pin to left edge, z-50, vertical writing mode "⊞".
```

---

## PROMPT 15 — INTEGRATION & SMOKE TEST

```
We are building Rabbit Hole Discoverer. All files have been created.

Run the full integration checklist from Step 11 of AGENTS.md. For each item, run the test and report the result.

1. Start backend:
   cd backend && uvicorn main:app --reload --port 8000
   Expected: no import errors, server listening on 8000.

2. Start frontend:
   cd frontend && npm run dev
   Expected: no TypeScript errors, dev server on port 3000.

3. Test discover endpoint:
  curl -X POST $PUBLIC_URL/api/discover \
     -H "Content-Type: application/json" \
     -d '{"topic":"Parasite (2019)","max_depth":2}'
   Expected: JSON with a session_id UUID.

4. Test WebSocket: connect to ws://$PUBLIC_URL/ws/{session_id}
   Expected: receives graph_delta message within 30 seconds.
   (TinyFish stub will return empty pages — Analyst will return empty delta — this is OK for now.)

5. Open browser at $PUBLIC_URL
   Expected: black home screen, "RABBIT HOLE" wordmark, animated placeholder, three demo pills.

6. Click "Parasite (2019)" pill:
   Expected: submits, navigates to /graph/{session_id}, graph page loads with StatusPill visible.

7. Verify StatusPill colour changes:
   Scout/hunting messages → cyan (#00f5e4)
   Analyst/mapping messages → violet (#9b4dff)
   Ranker/scoring messages → gold (#f5c842)

8. When graph has nodes (after TinyFish is wired at the workshop):
   - Node sizes vary by PageRank
   - Directional particle edges are cyan
   - Clicking a node opens NodeHoverCard

9. Test Study Mode:
   Click 📓 button → drawer slides up → canvas background warms slightly
   Upload a .txt file → response shows chunks_ingested > 0
   Ask a question → answer appears in monospace with amber left border

For any test that fails, diagnose and fix before continuing.
Report: PASS or FAIL for each of the 9 items above.
```

---

## PROMPT 16 — TINYFISH HOOK (WORKSHOP SESSION)

```
We are at the TinyFish SDK workshop session. The Scout Agent stub is ready.

Wire in the real TinyFish SDK to replace the stub in `backend/agents/scout_agent.py`.

Steps:
1. Add the TinyFish SDK package to backend/requirements.txt.
   Replace the line `# After the TinyFish workshop session installs their SDK, add it here.`
   with the actual package name and version from the workshop docs.
   Run pip install -r backend/requirements.txt.

2. In scout_agent.py, uncomment the TinyFish import at the top:
   from tinyfish import WebAgent as TinyFishClient  (adjust class name to match actual SDK)

3. In ScoutAgent.__init__, initialise the client:
   self.tf = TinyFishClient(api_key=os.environ["TINYFISH_API_KEY"])

4. Replace the _fetch_pages STUB body with the real implementation:
   - Call await self.tf.search(query, max_results=5) to get result objects
   - For each result, call await self.tf.fetch(result.url, extract="text")
   - Slice content to first 3000 characters
   - Append {"url": result.url, "title": result.title, "content": content} to pages
   - Wrap each fetch in its own try/except — a failed page should not abort the whole query
   - Return the pages list

5. Test with a real topic:
   cd backend && python -c "
   import asyncio, os
   from dotenv import load_dotenv; load_dotenv()
   from agents.scout_agent import ScoutAgent
   pages = asyncio.run(ScoutAgent().discover('Parasite (2019)', depth=0))
   print(f'Pages fetched: {len(pages)}')
   if pages: print('First page URL:', pages[0]['url'])
   "
   Expected: 5–15 pages fetched. If 0, check TINYFISH_API_KEY in .env.

6. Restart the backend and run the full discover flow again with the live web data.
```

---

## PROMPT 17 — POLISH & DEMO PREP

```
We are preparing for the demo. All features are working. Focus only on polish — do not refactor.

Work through this list in order:

1. MICROCOPY AUDIT — scan every user-visible string against the BRAND_GUIDELINES.md microcopy table.
   Fixes required (exact values, no paraphrasing):
   - Loading state → "Scout agent is hunting: [topic]" (never "Loading…")
   - Expand button → "Fall Deeper →" (never "Load More")
   - Upload zone label → "Drop your notes into the void" (never "Upload File")
   - Upload success → "✓ {n} chunks ingested · {m} nodes linked"
   - Error state → "Lost in the void. Trying another path…"
   - Empty graph → "No rabbit holes found yet. Try going deeper."
   Fix any that don't match.

2. FONT AUDIT — verify no system fonts appear.
   In browser DevTools, check that:
   - All body text is IBM Plex Sans
   - All headings and node labels are Space Grotesk
   - All scores, IDs, and metadata are JetBrains Mono
   Fix any elements using Inter, Roboto, Arial, or sans-serif as primary.

3. PRE-TEST THE THREE DEMO TOPICS.
   Run each through the full pipeline. Target: 20–50 nodes per topic.
   - "Parasite (2019)"
   - "Dark Side of the Moon"
   - "The Zodiac Killer"
   If any topic produces fewer than 10 nodes, check the Scout Agent page count and
   the Analyst Agent batch sizes. Adjust QUERY_GEN_PROMPT to be more expansive if needed.

4. HARD DON'TS — scan for and remove any of these (from BRAND_GUIDELINES.md):
   - Any purple-on-white or white-on-light-grey colour combinations
   - Any use of Inter, Roboto, or Arial
   - Any spinner shown without agent status text
   - The words "analyzing" or "processing" in any status message
   - Any drop shadow on text
   - Any gradient on a button
   - Any raw node IDs visible to the user (must always show node.label)
   - Any graph rendered on a white or light background

5. DEMO SCRIPT REHEARSAL — print the Step 12 demo script from AGENTS.md
   and verify every step works live:
   Step 1: Home page → animated placeholder → "Parasite (2019)" → Enter
   Step 2: StatusPill shows Scout agent message while graph loads
   Step 3: Node sizes vary visibly by PageRank. Cyan particles show edge direction.
   Step 4: Louvain clusters visible as colour groups.
   Step 5: Click "Bong Joon-ho" → NodeHoverCard shows betweenness score.
   Step 6: Click "Fall Deeper →" → graph expands with new nodes.
   Step 7: Study Mode → upload PDF → amber nodes light up.
   Step 8: Ask a question → RAG answer appears below input.
   Step 9: Closing tagline ready: "Every topic is a universe. RabbitHole shows you the whole thing."

Report: which demo steps pass, which need fixing.
```

---

## QUICK REFERENCE: SKILLS & HOOKS TO BUILD

The following are flagged throughout the prompts for future extraction. Track these:

| # | Type | Name | Location | Purpose |
|---|------|------|----------|---------|
| 1 | HOOK | TinyFish Client | `scout_agent.py` `__init__` | Swap when SDK confirmed at workshop |
| 2 | HOOK | _fetch_pages stub | `scout_agent.py` | Replace with real TinyFish search + fetch |
| 3 | SKILL | `rag_utils.py` | `backend/utils/` | Reusable embed + Chroma query pattern |
| 4 | HOOK | maxDepth wiring | graphStore + home page | Connect depth slider to discover call |
| 5 | HOOK | setLayout callback | GraphCanvas → Sidebar | dagMode wiring for layout toggle |
| 6 | SKILL | `useStudyUpload` | `frontend/hooks/` | Abstract file upload + ingest call |
| 7 | HOOK | UnrealBloomPass | `GraphCanvas.tsx` | Post-processing glow for high-PR nodes |
| 8 | HOOK | NodeHoverCard right-click | `GraphCanvas.tsx` | Future context menu on right-click |

---

*Rabbit Hole Discoverer · Codex Prompt Set v1*
*TinyFish SG Hackathon · March 28, 2025 · NUS Cinnamon Wing*
*Fall deeper. See everything.*
```
