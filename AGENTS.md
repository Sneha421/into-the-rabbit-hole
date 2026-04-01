# AGENTS.md — Rabbit Hole Discoverer
# Codex Execution Script · Read this entire file before writing a single line of code.

> You are building **Rabbit Hole Discoverer**: an autonomous multi-agent system that
> takes any topic (film, book, true crime, album, person, era) and recursively maps its
> knowledge universe into a living 3D directed acyclic graph that looks like falling into
> a black hole. TinyFish browses the live web using goal-driven browser sessions.
> OpenAI generates search queries and extracts structured knowledge. NetworkX runs six
> graph algorithms. A Study Mode lets users upload notes that link into the graph via
> embeddings.
>
> **TinyFish is the load-bearing infrastructure.** Every node in the graph originates
> from a real webpage that a TinyFish browser agent navigated. Remove TinyFish and
> there is no product.

---

## GROUND RULES FOR CODEX

1. Follow every step in order. Do not jump ahead or reorder steps.
2. Every file is created at the exact path specified. Do not rename files.
3. After completing each step, verify imports resolve before continuing.
4. All async code uses async/await. Zero blocking calls anywhere in the stack.
5. All data passed between agents must be typed Pydantic models. No raw dicts.
6. Graph updates stream to the frontend via WebSocket after every agent cycle.
7. Every TinyFish call and every OpenAI call is wrapped in try/except.
8. All secrets come from environment variables. No hardcoded keys ever.
9. Read BRAND_GUIDELINES.md in full before writing any frontend file.
10. There are NO stubs in this file. Every function must be fully implemented.

---

## TINYFISH SDK — READ BEFORE STEP 3

The real TinyFish Python SDK works as follows. Do not invent methods.

```python
from tinyfish import AsyncTinyFish, RunStatus, BrowserProfile

# Initialise (reads TINYFISH_API_KEY from environment automatically)
client = AsyncTinyFish(api_key=os.environ["TINYFISH_API_KEY"])

# Queue a run (returns immediately with a run_id)
response = await client.agent.queue(
    url="https://www.google.com/search?q=...",
    goal="Natural language instruction for what to extract. Return JSON only.",
    browser_profile=BrowserProfile.STEALTH,  # use STEALTH for all runs
)
run_id = response.run_id

# Poll for completion
run = await client.runs.get(run_id)
# run.status: RunStatus.COMPLETED | RunStatus.FAILED | RunStatus.CANCELLED
# run.result: dict — the JSON the agent extracted, matching your goal schema

# Bulk async pattern: queue all, then gather polls
responses = await asyncio.gather(*[
    client.agent.queue(url=url, goal=goal, browser_profile=BrowserProfile.STEALTH)
    for url, goal in tasks
])
```

There is NO `.search()` method. There is NO `.fetch()` method.
TinyFish is a goal-driven browser agent, not a search API.
You give it a URL + a natural language goal; it navigates and returns structured JSON.

---

## REPOSITORY STRUCTURE

Create this exact folder layout first. Run `mkdir -p` for each directory.

```
rabbit-hole/
├── backend/
│   ├── main.py
│   ├── orchestrator.py
│   ├── agents/
│   │   ├── __init__.py
│   │   ├── scout_agent.py
│   │   ├── analyst_agent.py
│   │   ├── ranker_agent.py
│   ├── models/
│   │   ├── __init__.py
│   │   ├── graph_models.py
│   │   └── api_models.py
│   ├── graph/
│   │   ├── __init__.py
│   │   └── graph_store.py
│   ├── utils/
│   │   ├── __init__.py
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── graph/
│   │       └── [session]/
│   │           └── page.tsx
│   ├── components/
│   │   ├── GraphCanvas.tsx
│   │   ├── NodeHoverCard.tsx
│   │   ├── SearchBar.tsx
│   │   ├── Sidebar.tsx
│   │   ├── StatusPill.tsx
│   ├── lib/
│   │   ├── graphStore.ts
│   │   ├── types.ts
│   │   └── websocket.ts
│   ├── package.json
│   └── tailwind.config.ts
├── AGENTS.md
├── BRAND_GUIDELINES.md
├── JUDGING_CRITERIA.md
└── .env.example
```

---

## STEP 0 — ENVIRONMENT SETUP

### 0.1 Create `.env.example`

```
OPENAI_API_KEY=
TINYFISH_API_KEY=
REDIS_URL=redis://localhost:6379
```

Copy it: `cp .env.example .env` then fill in keys.

### 0.2 Create `backend/requirements.txt`

```
fastapi==0.111.0
uvicorn[standard]==0.29.0
websockets==12.0
pydantic==2.7.0
openai==1.30.0
networkx==3.3
python-louvain==0.16
numpy==1.26.4
chromadb==0.5.0
pymupdf==1.24.3
python-dotenv==1.0.1
thefuzz==0.22.1
httpx==0.27.0
redis==5.0.4
tinyfish>=0.1.0
```

Install: `pip install -r backend/requirements.txt`

### 0.3 Create `frontend/package.json`

```json
{
  "name": "rabbit-hole-frontend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "14.2.3",
    "react": "^18",
    "react-dom": "^18",
    "three": "^0.163.0",
    "3d-force-graph": "^1.73.0",
    "zustand": "^4.5.2",
    "framer-motion": "^11.2.0",
    "tailwindcss": "^3.4.3",
    "postcss": "^8",
    "autoprefixer": "^10"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/react": "^18",
    "@types/node": "^20",
    "@types/three": "^0.163.0"
  }
}
```

Install: `cd frontend && npm install`

---

## STEP 1 — DATA MODELS

Create these first. Every other file imports from here. Do not change field names later.

### 1.1 Create `backend/models/graph_models.py`

```python
from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


class NodeType(str, Enum):
    PERSON = "person"
    WORK = "work"
    CONCEPT = "concept"
    EVENT = "event"
    PLACE = "place"


class EdgeType(str, Enum):
    INFLUENCED_BY = "influenced_by"
    PART_OF = "part_of"
    CONTEMPORARY_OF = "contemporary_of"
    REFERENCED_IN = "referenced_in"
    LED_TO = "led_to"
    CREATED_BY = "created_by"
    YOUR_NOTES_MENTION = "your_notes_mention"


class Node(BaseModel):
    id: str
    label: str
    node_type: NodeType
    summary: str = ""
    year: Optional[int] = None
    tags: list[str] = Field(default_factory=list)
    depth: int = 0
    pagerank: float = 0.0
    betweenness: float = 0.0
    eigenvector: float = 0.0
    hub_score: float = 0.0
    authority_score: float = 0.0
    rabbit_hole_score: float = 0.0
    cluster_id: int = 0
    is_seed: bool = False
    source_url: Optional[str] = None
    has_user_notes: bool = False


class Edge(BaseModel):
    id: str
    source: str
    target: str
    edge_type: EdgeType
    label: str
    weight: float = 1.0


class GraphDelta(BaseModel):
    session_id: str
    nodes: list[Node]
    edges: list[Edge]
```

### 1.2 Create `backend/models/api_models.py`

```python
from pydantic import BaseModel


class DiscoverRequest(BaseModel):
    topic: str
    max_depth: int = 2


class ExpandRequest(BaseModel):
    node_id: str
    session_id: str


class StudyAskRequest(BaseModel):
    question: str
    session_id: str
    node_ids: list[str] = []
```

---

## STEP 2 — GRAPH STORE

### 2.1 Create `backend/graph/graph_store.py`

All agents read and write through this single class. Never access `self.G` directly from outside.

```python
from __future__ import annotations
import networkx as nx
from models.graph_models import Node, Edge, GraphDelta


class GraphStore:
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.G: nx.DiGraph = nx.DiGraph()

    def add_node(self, node: Node) -> None:
        self.G.add_node(node.id, **node.model_dump())

    def add_edge(self, edge: Edge) -> None:
        # Only add edge if both nodes exist to keep graph clean
        if edge.source in self.G and edge.target in self.G:
            self.G.add_edge(
                edge.source, edge.target,
                id=edge.id,
                edge_type=edge.edge_type.value,
                label=edge.label,
                weight=edge.weight,
            )

    def apply_delta(self, delta: GraphDelta) -> None:
        for node in delta.nodes:
            self.add_node(node)
        for edge in delta.edges:
            self.add_edge(edge)

    def apply_scores(self, scores: dict) -> None:
        for node_id in self.G.nodes:
            attrs = self.G.nodes[node_id]
            attrs['pagerank']          = scores.get('pagerank', {}).get(node_id, 0.0)
            attrs['betweenness']       = scores.get('betweenness', {}).get(node_id, 0.0)
            attrs['eigenvector']       = scores.get('eigenvector', {}).get(node_id, 0.0)
            attrs['hub_score']         = scores.get('hubs', {}).get(node_id, 0.0)
            attrs['authority_score']   = scores.get('authorities', {}).get(node_id, 0.0)
            attrs['rabbit_hole_score'] = scores.get('rabbit_hole_score', {}).get(node_id, 0.0)
            attrs['cluster_id']        = scores.get('communities', {}).get(node_id, 0)

    def get_node(self, node_id: str) -> dict | None:
        return dict(self.G.nodes[node_id]) if node_id in self.G else None

    def to_json(self) -> dict:
        nodes = [dict(id=n, **d) for n, d in self.G.nodes(data=True)]
        edges = [dict(source=u, target=v, **d) for u, v, d in self.G.edges(data=True)]
        return {"session_id": self.session_id, "nodes": nodes, "edges": edges}

    def delta_to_json(self, delta: GraphDelta) -> dict:
        return {
            "session_id": self.session_id,
            "nodes": [n.model_dump() for n in delta.nodes],
            "edges": [e.model_dump() for e in delta.edges],
        }
```

---

## STEP 3 — SCOUT AGENT

This agent uses TinyFish exclusively for all web access.
**Architecture:** OpenAI generates search queries → TinyFish visits Google and extracts
result URLs → TinyFish visits each result page and extracts content → Analyst processes pages.

Two-phase async pipeline:
- Phase 1: Queue one TinyFish run per search query (up to 6 in parallel).
  Each run visits a Google search page and returns structured result URLs.
- Phase 2: Queue one TinyFish run per result URL (up to 12 in parallel).
  Each run visits the page and returns title + body text.

### 3.1 Create `backend/agents/scout_agent.py`

```python
from __future__ import annotations
import asyncio
import json
import os
from openai import AsyncOpenAI
from tinyfish import AsyncTinyFish, RunStatus, BrowserProfile

oai = AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])

QUERY_GEN_PROMPT = (
    'Given the topic "{topic}", generate exactly 6 web search queries that surface '
    "interesting connected people, works, events, concepts, and places. "
    "Prefer surprising, non-obvious connections over Wikipedia summary facts. "
    'Return ONLY a JSON array of strings, nothing else. Example: ["q1", "q2", "q3"]'
)

# Sent to TinyFish when visiting a search engine results page.
# TinyFish navigates the real page and returns structured JSON matching this schema.
SEARCH_GOAL = (
    'Search results page for: "{query}". '
    "Extract the top 5 organic (non-sponsored) results. "
    "For each result return: url (string), title (string), snippet (string). "
    "Skip any ads, sponsored links, or Google answer boxes. "
    "Return ONLY a JSON array of objects with keys url, title, snippet."
)

# Sent to TinyFish when visiting an individual article or reference page.
PAGE_GOAL = (
    "Extract the main editorial body text of this page. "
    "Ignore navigation menus, headers, footers, ads, and sidebars. "
    "Return ONLY a JSON object with keys: "
    "title (string — the page headline), "
    "content (string — main body text, up to 3000 characters)."
)


async def _generate_queries(topic: str) -> list[str]:
    try:
        resp = await oai.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": QUERY_GEN_PROMPT.format(topic=topic)}],
            temperature=0.85,
            max_tokens=300,
        )
        raw = json.loads(resp.choices[0].message.content)
        if isinstance(raw, list):
            return raw[:6]
        # Model sometimes wraps in {"queries": [...]}
        return list(raw.values())[0][:6]
    except Exception as e:
        print(f"[Scout] query gen failed: {e}")
        return [topic]


class ScoutAgent:
    def __init__(self):
        self.tf = AsyncTinyFish(api_key=os.environ["TINYFISH_API_KEY"])

    async def _poll(
        self, run_id: str, poll_interval: float = 3.0, timeout: float = 90.0
    ) -> dict | None:
        """
        Poll a TinyFish run until it reaches a terminal state.
        Returns the result dict on COMPLETED, or None on FAILED/CANCELLED/timeout.
        """
        elapsed = 0.0
        while elapsed < timeout:
            try:
                run = await self.tf.runs.get(run_id)
                if run.status == RunStatus.COMPLETED:
                    result = run.result
                    if isinstance(result, dict):
                        return result
                    # result may arrive as a JSON string in some SDK versions
                    if isinstance(result, str):
                        try:
                            return json.loads(result)
                        except Exception:
                            return {}
                    return {}
                if run.status in (RunStatus.FAILED, RunStatus.CANCELLED):
                    print(f"[Scout] run {run_id} terminal: {run.status}")
                    return None
            except Exception as e:
                print(f"[Scout] poll error for {run_id}: {e}")
                return None
            await asyncio.sleep(poll_interval)
            elapsed += poll_interval
        print(f"[Scout] run {run_id} timed out after {timeout}s")
        return None

    async def _search_one_query(self, query: str) -> list[dict]:
        """
        Queue a TinyFish run against a Google search results page.
        Returns a list of up to 5 result dicts: {url, title, snippet}.
        """
        search_url = (
            f"https://www.google.com/search?q={query.replace(' ', '+')}&hl=en"
        )
        try:
            resp = await self.tf.agent.queue(
                url=search_url,
                goal=SEARCH_GOAL.format(query=query),
                browser_profile=BrowserProfile.STEALTH,
            )
        except Exception as e:
            print(f"[Scout] queue search failed for '{query}': {e}")
            return []

        result = await self._poll(resp.run_id)
        if not result:
            return []

        # Result is a JSON array directly, or wrapped in a key
        if isinstance(result, list):
            return result[:5]
        for v in result.values():
            if isinstance(v, list):
                return v[:5]
        return []

    async def _fetch_page(self, url: str, title: str = "") -> dict | None:
        """
        Queue a TinyFish run to read the main content of a single page.
        Returns {url, title, content} or None.
        """
        try:
            resp = await self.tf.agent.queue(
                url=url,
                goal=PAGE_GOAL,
                browser_profile=BrowserProfile.STEALTH,
            )
        except Exception as e:
            print(f"[Scout] queue page failed for '{url}': {e}")
            return None

        result = await self._poll(resp.run_id)
        if not result:
            return None

        return {
            "url": url,
            "title": result.get("title", title),
            "content": str(result.get("content", ""))[:3000],
        }

    async def discover(self, topic: str, depth: int = 0) -> list[dict]:
        """
        Entry point called by Orchestrator.
        Returns raw page dicts for the Analyst Agent to process.

        Phase 1: Run all 6 search queries in parallel against TinyFish.
        Phase 2: For the top 2 URLs from each search, fetch page content in parallel.
        """
        queries = await _generate_queries(topic)

        # Phase 1: search all queries simultaneously
        search_results_per_query = await asyncio.gather(
            *[self._search_one_query(q) for q in queries],
            return_exceptions=True,
        )

        # Flatten, deduplicate, keep top 2 per query
        seen_urls: set[str] = set()
        candidates: list[dict] = []
        for result in search_results_per_query:
            if not isinstance(result, list):
                continue
            for item in result[:2]:
                url = item.get("url", "")
                if url and url not in seen_urls:
                    seen_urls.add(url)
                    candidates.append(item)

        if not candidates:
            print(f"[Scout] no search results for topic='{topic}' — check TinyFish dashboard")
            return []

        # Phase 2: fetch all candidate pages simultaneously
        fetched = await asyncio.gather(
            *[self._fetch_page(c["url"], c.get("title", "")) for c in candidates],
            return_exceptions=True,
        )

        pages = []
        for item in fetched:
            if isinstance(item, dict) and item.get("content"):
                item["depth"] = depth
                pages.append(item)

        print(f"[Scout] discovered {len(pages)} pages for '{topic}' at depth {depth}")
        return pages
```

---

## STEP 4 — ANALYST AGENT

Reads raw pages from Scout. Calls OpenAI. Returns a typed GraphDelta.
This is the only agent that calls `gpt-4o` for structured extraction.

### 4.1 Create `backend/agents/analyst_agent.py`

```python
from __future__ import annotations
import json
import uuid
import os
from openai import AsyncOpenAI
from models.graph_models import Node, Edge, GraphDelta, NodeType, EdgeType

oai = AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])

SYSTEM = """\
You are a knowledge graph architect for a curiosity-driven rabbit hole engine.
Given raw web content about a topic, extract a directed knowledge graph.

STRICT RULES:
- Extract 5 to 15 nodes per batch. Prioritise the most interesting and non-obvious ones.
- Every node must be a real, nameable entity: person, work, concept, event, or place.
- Every edge must be directional. Use ONLY these edge_type values:
    influenced_by | part_of | contemporary_of | referenced_in | led_to | created_by
- Edge weight is a float 0.0 to 1.0. Higher means stronger connection.
- summary: exactly 2 sentences. Write like a curious human, not an encyclopedia.
- tags: 2 to 4 lowercase kebab-case strings per node.
- year: integer best estimate, or null if unknown.
- node id: lowercase kebab-case slug, globally unique, max 40 chars.

Return ONLY valid JSON matching this schema. No markdown. No preamble.
{
  "nodes": [
    {
      "id": "slug-id",
      "label": "Display Name",
      "node_type": "person|work|concept|event|place",
      "summary": "Two sentence summary.",
      "year": 1999,
      "tags": ["tag-one", "tag-two"]
    }
  ],
  "edges": [
    {
      "source": "source-slug-id",
      "target": "target-slug-id",
      "edge_type": "influenced_by",
      "label": "Human readable relation",
      "weight": 0.8
    }
  ]
}"""


class AnalystAgent:
    async def enrich(
        self, pages: list[dict], seed_topic: str, depth: int = 0, session_id: str = ""
    ) -> GraphDelta:
        if not pages:
            return GraphDelta(session_id=session_id, nodes=[], edges=[])

        all_nodes: list[Node] = []
        all_edges: list[Edge] = []
        seen_node_ids: set[str] = set()

        # Process in batches of 3 pages to stay within context limits
        batches = [pages[i:i + 3] for i in range(0, len(pages), 3)]

        for batch in batches:
            content_block = "\n\n---\n\n".join(
                f"URL: {p.get('url', '')}\nTitle: {p.get('title', '')}\n\n"
                f"{p.get('content', '')[:2000]}"
                for p in batch
            )
            user_msg = f"Seed topic: {seed_topic}\n\nWeb content:\n{content_block}"

            try:
                resp = await oai.chat.completions.create(
                    model="gpt-4o",
                    messages=[
                        {"role": "system", "content": SYSTEM},
                        {"role": "user", "content": user_msg},
                    ],
                    temperature=0.3,
                    max_tokens=2000,
                )
                raw = json.loads(resp.choices[0].message.content)
            except Exception as e:
                print(f"[Analyst] OpenAI call failed: {e}")
                continue

            for n in raw.get("nodes", []):
                if n.get("id") in seen_node_ids:
                    continue
                seen_node_ids.add(n["id"])
                try:
                    all_nodes.append(Node(
                        id=n["id"],
                        label=n["label"],
                        node_type=NodeType(n.get("node_type", "concept")),
                        summary=n.get("summary", ""),
                        year=n.get("year"),
                        tags=n.get("tags", []),
                        depth=depth,
                    ))
                except Exception as e:
                    print(f"[Analyst] node parse error: {e}")

            for e in raw.get("edges", []):
                try:
                    all_edges.append(Edge(
                        id=str(uuid.uuid4()),
                        source=e["source"],
                        target=e["target"],
                        edge_type=EdgeType(e.get("edge_type", "referenced_in")),
                        label=e.get("label", ""),
                        weight=float(e.get("weight", 0.5)),
                    ))
                except Exception as e:
                    print(f"[Analyst] edge parse error: {e}")

        return GraphDelta(session_id=session_id, nodes=all_nodes, edges=all_edges)
```

---

## STEP 5 — RANKER AGENT

Pure NetworkX. Zero LLM calls. Zero TinyFish calls. Six algorithms.
Must handle empty/tiny graphs without crashing.

### 5.1 Create `backend/agents/ranker_agent.py`

```python
from __future__ import annotations
import networkx as nx

try:
    import community as community_louvain  # python-louvain
except ImportError:
    community_louvain = None


class RankerAgent:

    def compute_all(self, G: nx.DiGraph) -> dict:
        """
        Run all six graph algorithms over G.
        Returns a flat dict of {algorithm_name: {node_id: score}}.
        Safe to call on graphs with 0 or 1 nodes.
        """
        if G.number_of_nodes() == 0:
            return {}

        scores: dict = {}

        # 1. PageRank — importance by weighted incoming links
        try:
            scores["pagerank"] = nx.pagerank(G, weight="weight", alpha=0.85)
        except Exception:
            uniform = 1.0 / G.number_of_nodes()
            scores["pagerank"] = {n: uniform for n in G.nodes}

        # 2. Betweenness Centrality — bridge/connector nodes
        try:
            scores["betweenness"] = nx.betweenness_centrality(
                G, weight="weight", normalized=True
            )
        except Exception:
            scores["betweenness"] = {n: 0.0 for n in G.nodes}

        # 3. Eigenvector Centrality — prestige (connected to important nodes)
        try:
            scores["eigenvector"] = nx.eigenvector_centrality_numpy(G, weight="weight")
        except Exception:
            scores["eigenvector"] = {n: 0.0 for n in G.nodes}

        # 4. HITS — hubs point outward, authorities are pointed at
        try:
            hubs, authorities = nx.hits(G, max_iter=200, normalized=True)
            scores["hubs"] = hubs
            scores["authorities"] = authorities
        except Exception:
            scores["hubs"] = {n: 0.0 for n in G.nodes}
            scores["authorities"] = {n: 0.0 for n in G.nodes}

        # 5. Louvain Community Detection — thematic cluster grouping
        if community_louvain is not None:
            try:
                G_und = G.to_undirected()
                scores["communities"] = community_louvain.best_partition(G_und)
            except Exception:
                scores["communities"] = {n: 0 for n in G.nodes}
        else:
            scores["communities"] = {n: 0 for n in G.nodes}

        # 6. Composite Rabbit Hole Score — drives expansion priority and visual weight
        pr = scores["pagerank"]
        bc = scores["betweenness"]
        ec = scores["eigenvector"]
        scores["rabbit_hole_score"] = {
            n: 0.40 * pr.get(n, 0) + 0.35 * bc.get(n, 0) + 0.25 * ec.get(n, 0)
            for n in G.nodes
        }

        return scores

    def top_rabbit_holes(
        self, G: nx.DiGraph, scores: dict, n: int = 3
    ) -> list[str]:
        """Return top N node IDs by rabbit_hole_score. Excludes seed nodes."""
        rhs = scores.get("rabbit_hole_score", {})
        candidates = [
            nid for nid in G.nodes
            if not G.nodes[nid].get("is_seed", False)
        ]
        return sorted(candidates, key=lambda x: rhs.get(x, 0), reverse=True)[:n]

    def get_path(
        self, G: nx.DiGraph, source: str, target: str
    ) -> list[str]:
        """Dijkstra shortest path between two nodes. Returns [] if unreachable."""
        try:
            return nx.dijkstra_path(G, source, target, weight="weight")
        except (nx.NetworkXNoPath, nx.NodeNotFound):
            return []
```

---

<!-- STEP 6 — STUDY AGENT removed: study-related tooling (chunker, study agent) is deprecated -->

---

## STEP 7 — ORCHESTRATOR

Coordinates all agents in sequence. Broadcasts graph deltas via WebSocket callback.

### 7.1 Create `backend/orchestrator.py`

```python
from __future__ import annotations
import asyncio
import uuid
from typing import Callable, Awaitable

from graph.graph_store import GraphStore
from agents.scout_agent import ScoutAgent
from agents.analyst_agent import AnalystAgent
from agents.ranker_agent import RankerAgent
from models.graph_models import Node, NodeType, GraphDelta

# Global session registry. main.py reads from this dict.
SESSIONS: dict[str, GraphStore] = {}

Broadcaster = Callable[[dict], Awaitable[None]]


class RabbitHoleOrchestrator:
    def __init__(self, session_id: str, broadcast: Broadcaster):
        self.session_id = session_id
        self.broadcast = broadcast
        self.graph = GraphStore(session_id)
        self.scout = ScoutAgent()
        self.analyst = AnalystAgent()
        self.ranker = RankerAgent()
        self.study = StudyAgent(session_id)
        SESSIONS[session_id] = self.graph

    # ── internal helpers ──────────────────────────────────────────────────────

    async def _status(self, msg: str) -> None:
        await self.broadcast({"type": "status", "message": msg})

    async def _push_delta(self, delta: GraphDelta) -> None:
        await self.broadcast({"type": "graph_delta", **self.graph.delta_to_json(delta)})

    async def _push_full(self) -> None:
        await self.broadcast({"type": "graph_full", **self.graph.to_json()})

    async def _expand_topic(self, topic: str, depth: int) -> None:
        """Core expansion loop: Scout (TinyFish) → Analyst (OpenAI) → Ranker (NetworkX) → broadcast."""
        await self._status(f"🔭 Scout hunting: {topic}")
        pages = await self.scout.discover(topic, depth=depth)

        await self._status(f"🧠 Analyst mapping: {topic}")
        delta = await self.analyst.enrich(
            pages, seed_topic=topic, depth=depth, session_id=self.session_id
        )
        self.graph.apply_delta(delta)

        await self._status("📊 Ranker scoring graph…")
        scores = self.ranker.compute_all(self.graph.G)
        self.graph.apply_scores(scores)

        await self._push_delta(delta)

    # ── public interface ──────────────────────────────────────────────────────

    async def start(self, seed_topic: str, max_depth: int = 2) -> None:
        """Entry point. Creates seed node, then recursively expands."""
        seed = Node(
            id=seed_topic.lower().replace(" ", "-")[:40],
            label=seed_topic,
            node_type=NodeType.CONCEPT,
            depth=0,
            is_seed=True,
            rabbit_hole_score=1.0,
        )
        self.graph.add_node(seed)
        await self._push_full()

        # Depth 0 expansion
        await self._expand_topic(seed_topic, depth=0)

        # Depth 1: expand top-scoring nodes in parallel (capped at 2 for speed)
        if max_depth >= 2:
            scores = self.ranker.compute_all(self.graph.G)
            top_ids = self.ranker.top_rabbit_holes(self.graph.G, scores, n=2)
            top_labels = [
                self.graph.get_node(nid)["label"]
                for nid in top_ids
                if self.graph.get_node(nid)
            ]
            await asyncio.gather(
                *[self._expand_topic(label, depth=1) for label in top_labels]
            )

        await self._status("✅ Rabbit hole complete. Click any node to go deeper.")

    async def expand_node(self, node_id: str) -> None:
        """Expand a single node on user click."""
        node = self.graph.get_node(node_id)
        if not node:
            return
        await self._expand_topic(node["label"], depth=node.get("depth", 0) + 1)
```

---

## STEP 8 — FASTAPI BACKEND

### 8.1 Create `backend/main.py`

```python
from __future__ import annotations
import asyncio
import uuid
import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from orchestrator import RabbitHoleOrchestrator, SESSIONS
from agents.ranker_agent import RankerAgent
from agents.study_agent import StudyAgent
from models.api_models import DiscoverRequest, ExpandRequest, StudyAskRequest

app = FastAPI(title="Rabbit Hole API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Active WebSocket connections
WS: dict[str, WebSocket] = {}


async def broadcast(session_id: str, payload: dict) -> None:
    ws = WS.get(session_id)
    if ws:
        try:
            await ws.send_json(payload)
        except Exception:
            WS.pop(session_id, None)


@app.websocket("/ws/{session_id}")
async def ws_endpoint(ws: WebSocket, session_id: str):
    await ws.accept()
    WS[session_id] = ws
    try:
        while True:
            await ws.receive_text()  # keep-alive ping
    except WebSocketDisconnect:
        WS.pop(session_id, None)


@app.post("/api/discover")
async def discover(req: DiscoverRequest):
    session_id = str(uuid.uuid4())

    async def _bcast(payload: dict):
        await broadcast(session_id, payload)

    orch = RabbitHoleOrchestrator(session_id, _bcast)
    asyncio.create_task(orch.start(req.topic, req.max_depth))
    return {"session_id": session_id}


@app.post("/api/expand/{node_id}")
async def expand_node(node_id: str, req: ExpandRequest):
    graph = SESSIONS.get(req.session_id)
    if not graph:
        return {"error": "session not found"}

    async def _bcast(payload: dict):
        await broadcast(req.session_id, payload)

    orch = RabbitHoleOrchestrator.__new__(RabbitHoleOrchestrator)
    orch.session_id = req.session_id
    orch.broadcast = _bcast
    orch.graph = graph
    from agents.scout_agent import ScoutAgent
    from agents.analyst_agent import AnalystAgent
    orch.scout = ScoutAgent()
    orch.analyst = AnalystAgent()
    orch.ranker = RankerAgent()
    asyncio.create_task(orch.expand_node(node_id))
    return {"status": "expanding"}


@app.get("/api/graph/{session_id}")
async def get_graph(session_id: str):
    graph = SESSIONS.get(session_id)
    return graph.to_json() if graph else {"error": "not found"}


@app.get("/api/path/{session_id}/{source}/{target}")
async def get_path(session_id: str, source: str, target: str):
    graph = SESSIONS.get(session_id)
    if not graph:
        return {"error": "not found"}
    path = RankerAgent().get_path(graph.G, source, target)
    return {"path": path}


@app.post("/api/study/upload/{session_id}")
async def upload_notes(session_id: str, file: UploadFile = File(...)):
    graph = SESSIONS.get(session_id)
    if not graph:
        return {"error": "session not found"}
    study = StudyAgent(session_id)
    content = await file.read()
    result = await study.ingest(content, file.filename or "notes.txt")
    links = await study.link_to_graph(graph)
    return {**result, "nodes_linked": links}


@app.post("/api/study/ask")
async def study_ask(req: StudyAskRequest):
    study = StudyAgent(req.session_id)
    return await study.ask(req.question)
```

Start backend: `cd backend && uvicorn main:app --reload --port 8000`

---

## STEP 9 — FRONTEND SHARED CODE

### 9.1 Create `frontend/lib/types.ts`

```typescript
export type NodeType = "person" | "work" | "concept" | "event" | "place";

export type EdgeType =
  | "influenced_by"
  | "part_of"
  | "contemporary_of"
  | "referenced_in"
  | "led_to"
  | "created_by"
  | "your_notes_mention";

export interface GraphNode {
  id: string;
  label: string;
  node_type: NodeType;
  summary: string;
  year?: number;
  tags: string[];
  depth: number;
  pagerank: number;
  betweenness: number;
  eigenvector: number;
  hub_score: number;
  authority_score: number;
  rabbit_hole_score: number;
  cluster_id: number;
  is_seed: boolean;
  has_user_notes: boolean;
  source_url?: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  edge_type: EdgeType;
  label: string;
  weight: number;
}

export type WsMessage =
  | { type: "graph_delta"; session_id: string; nodes: GraphNode[]; edges: GraphEdge[] }
  | { type: "graph_full";  session_id: string; nodes: GraphNode[]; edges: GraphEdge[] }
  | { type: "status"; message: string };
```

### 9.2 Create `frontend/lib/graphStore.ts`

```typescript
import { create } from "zustand";
import type { GraphNode, GraphEdge } from "./types";

interface Store {
  nodes: Map<string, GraphNode>;
  edges: GraphEdge[];
  sessionId: string;
  status: string;
  selectedNode: GraphNode | null;
  setSession: (id: string) => void;
  applyDelta: (nodes: GraphNode[], edges: GraphEdge[]) => void;
  setStatus: (s: string) => void;
  selectNode: (n: GraphNode | null) => void;
}

export const useGraphStore = create<Store>((set) => ({
  nodes: new Map(),
  edges: [],
  sessionId: "",
  status: "",
  selectedNode: null,

  setSession: (sessionId) => set({ sessionId }),

  applyDelta: (newNodes, newEdges) =>
    set((state) => {
      const nodes = new Map(state.nodes);
      newNodes.forEach((n) => nodes.set(n.id, n));
      const existingEdgeKeys = new Set(
        state.edges.map((e) => `${e.source}__${e.target}`)
      );
      const dedupedNewEdges = newEdges.filter(
        (e) => !existingEdgeKeys.has(`${e.source}__${e.target}`)
      );
      return { nodes, edges: [...state.edges, ...dedupedNewEdges] };
    }),

  setStatus: (status) => set({ status }),
  selectNode: (selectedNode) => set({ selectedNode }),
}));
```

### 9.3 Create `frontend/lib/websocket.ts`

```typescript
import { useEffect } from "react";
import { useGraphStore } from "./graphStore";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const WS_BASE = API_BASE.replace(/^http/, "ws");

export function useGraphSocket(sessionId: string) {
  const { applyDelta, setStatus } = useGraphStore();

  useEffect(() => {
    if (!sessionId) return;
    let retries = 0;
    let ws: WebSocket;

    const connect = () => {
      ws = new WebSocket(`${WS_BASE}/ws/${sessionId}`);

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data as string);
          if (msg.type === "status") setStatus(msg.message as string);
          if (msg.type === "graph_delta" || msg.type === "graph_full") {
            applyDelta(msg.nodes ?? [], msg.edges ?? []);
          }
        } catch { /* ignore malformed */ }
      };

      ws.onclose = () => {
        if (retries < 5) {
          retries++;
          setTimeout(connect, 2000);
        }
      };

      // Keep-alive ping every 30 seconds
      const ping = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send("ping");
      }, 30000);

      ws.onerror = () => clearInterval(ping);
    };

    connect();
    return () => ws?.close();
  }, [sessionId, applyDelta, setStatus]);
}
```

---

## STEP 10 — FRONTEND COMPONENTS

Read BRAND_GUIDELINES.md in full before writing any file in this step.

### 10.1 Create `frontend/components/GraphCanvas.tsx`

```typescript
"use client";
import { useEffect, useRef } from "react";
import { useGraphStore } from "@/lib/graphStore";

// Cluster → hex colour. Must match BRAND_GUIDELINES.md CLUSTER_COLORS table exactly.
const CLUSTER_COLORS: Record<number, string> = {
  0: "#f5c842", // Gravitational Gold — seed cluster
  1: "#9b4dff", // Quasar Violet      — creator/person cluster
  2: "#00f5e4", // Pulsar Cyan        — works/artefacts cluster
  3: "#00c9a7", // Nebula Teal        — concept/theme cluster
  4: "#ff8c42", // Cosmic Amber       — event/history cluster
  5: "#4d7cff", // Wormhole Blue      — place cluster
};

export default function GraphCanvas({ sessionId }: { sessionId: string }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<any>(null);
  const { nodes, edges, selectNode } = useGraphStore();

  useEffect(() => {
    if (typeof window === "undefined" || !mountRef.current) return;

    import("3d-force-graph").then(({ default: ForceGraph3D }) => {
      const graph = ForceGraph3D()(mountRef.current!)
        .backgroundColor("#000000")
        .nodeLabel("label")
        .nodeColor((n: any) => CLUSTER_COLORS[n.cluster_id % 6] ?? "#ffffff")
        .nodeVal((n: any) => 2 + (n.pagerank ?? 0) * 60)
        .nodeOpacity((n: any) => Math.max(0.6, 1 - (n.depth ?? 0) * 0.12))
        .linkColor(() => "rgba(255,255,255,0.10)")
        .linkWidth((l: any) => (l.weight ?? 0.5) * 3)
        .linkDirectionalParticles((l: any) => Math.round((l.weight ?? 0.5) * 5))
        .linkDirectionalParticleSpeed(0.004)
        .linkDirectionalParticleColor(() => "#00f5e4")
        .onNodeClick((n: any) => selectNode(n))
        .graphData({ nodes: [], links: [] });

      fgRef.current = graph;
    });

    return () => fgRef.current?.pauseAnimation();
  }, []);

  useEffect(() => {
    if (!fgRef.current) return;
    fgRef.current.graphData({
      nodes: Array.from(nodes.values()),
      links: edges.map((e) => ({ ...e })),
    });
  }, [nodes, edges]);

  return <div ref={mountRef} className="w-full h-full graph-canvas-bg" />;
}
```

### 10.2 Create `frontend/components/StatusPill.tsx`

```typescript
"use client";
import { useGraphStore } from "@/lib/graphStore";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

function pillColor(status: string): string {
  if (status.includes("Scout") || status.includes("hunting")) return "#00f5e4";
  if (status.includes("Analyst") || status.includes("mapping")) return "#9b4dff";
  if (status.includes("Ranker") || status.includes("scoring")) return "#f5c842";
  if (status.includes("complete")) return "#00c9a7";
  return "#ffffff";
}

export default function StatusPill() {
  const status = useGraphStore((s) => s.status);
  const [visible, setVisible] = useState(false);
  const color = pillColor(status);

  useEffect(() => {
    if (!status) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(t);
  }, [status]);

  return (
    <AnimatePresence>
      {visible && status && (
        <motion.div
          key={status}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2
                     px-4 py-2 rounded-full backdrop-blur-md border border-white/10
                     text-[13px] font-mono"
          style={{ background: "rgba(10,3,24,0.85)", color }}
        >
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: color }} />
          {status}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

### 10.3 Create `frontend/components/NodeHoverCard.tsx`

See BRAND_GUIDELINES.md "Node Hover Card" section for the exact visual spec.

```typescript
"use client";
import { useGraphStore } from "@/lib/graphStore";
import { motion, AnimatePresence } from "framer-motion";

const CLUSTER_COLORS: Record<number, string> = {
  0: "#f5c842", 1: "#9b4dff", 2: "#00f5e4",
  3: "#00c9a7", 4: "#ff8c42", 5: "#4d7cff",
};

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function NodeHoverCard() {
  const { selectedNode, sessionId, selectNode } = useGraphStore();
  if (!selectedNode) return null;
  const color = CLUSTER_COLORS[selectedNode.cluster_id % 6] ?? "#ffffff";

  async function fallDeeper() {
    if (!selectedNode) return;
    await fetch(`${API}/api/expand/${selectedNode.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ node_id: selectedNode.id, session_id: sessionId }),
    });
    selectNode(null);
  }

  return (
    <AnimatePresence>
      <motion.div
        key={selectedNode.id}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="fixed bottom-8 right-8 z-50 w-80 rounded-xl border p-5 backdrop-blur-xl"
        style={{
          background: "rgba(26,5,51,0.92)",
          borderColor: color + "44",
          boxShadow: `0 0 30px ${color}22`,
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <span
            className="text-xs font-mono uppercase tracking-widest px-2 py-0.5 rounded"
            style={{ background: color + "22", color }}
          >
            {selectedNode.node_type}
          </span>
          <span className="text-xs font-mono" style={{ color: "#e8e0ff88" }}>
            PR {selectedNode.pagerank.toFixed(3)}
          </span>
        </div>

        <h3 className="text-lg font-semibold text-white mb-1">
          {selectedNode.label}
          {selectedNode.year && (
            <span className="text-sm font-normal text-white/40 ml-2">({selectedNode.year})</span>
          )}
        </h3>

        <p className="text-sm text-white/70 leading-relaxed mb-3">
          {selectedNode.summary || "Expanding knowledge…"}
        </p>

        <div className="flex flex-wrap gap-1 mb-4">
          {selectedNode.tags.map((t) => (
            <span key={t} className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: "#ffffff0d", color: "#e8e0ff88" }}>
              #{t}
            </span>
          ))}
        </div>

        <div className="flex gap-2">
          <button onClick={fallDeeper}
            className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{ background: color, color: "#000" }}>
            Fall Deeper →
          </button>
          {selectedNode.has_user_notes && (
            <button className="px-3 py-2 rounded-lg text-sm border border-white/10 text-white/60">
              📓
            </button>
          )}
          <button onClick={() => selectNode(null)}
            className="px-3 py-2 rounded-lg text-sm border border-white/10 text-white/40">
            ✕
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
```

### 10.4 Create `frontend/components/StudyMode.tsx`

Build a bottom-drawer component with:
- Drag-and-drop file upload zone (accepts PDF, .txt, .md)
- Label: "Drop your notes into the void"
- On drop: POST file to `/api/study/upload/{sessionId}`
- Show "✓ {chunks} chunks ingested · {nodes} nodes linked" response
- Text input + submit button for Q&A: POST `/api/study/ask`
- Placeholder: "What do your notes say about…"
- Display answer in `.study-answer` div (JetBrains Mono, amber left border)
- Linked Nodes list: filter graphStore nodes where `has_user_notes === true`, show as amber pills
- When open: add class `study-open` to `<main>` for CSS background warm shift
- Animation: framer-motion slide up from y=340 to y=0, 300ms ease-out

### 10.5 Create `frontend/app/page.tsx`

Home page. Black background. Centred vertically and horizontally.
- Wordmark: "RABBIT HOLE" — Space Grotesk weight 200, tracking-[0.15em], all caps, text-white
- Tagline: "Fall deeper. See everything." — IBM Plex Sans, text-white/50
- Search input that autofocuses on load
- Animated placeholder cycling every 2000ms:
  "a film…" → "a true crime case…" → "an album…" → "a book…" → "a decade…" → "a person…"
- Submit button: gold background (#f5c842), black text
- On submit: POST `/api/discover` → receive `session_id` → `router.push(/graph/${session_id})`
- Exit animation: input fades out (opacity 0, scale 0.95, 300ms) before route push
- Three demo pills below input:
  - "Parasite (2019)"
  - "Dark Side of the Moon"
  - "The Zodiac Killer"
  Each pill on click fills the input and auto-submits.

### 10.6 Create `frontend/app/graph/[session]/page.tsx`

```typescript
"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useGraphStore } from "@/lib/graphStore";
import { useGraphSocket } from "@/lib/websocket";
import StatusPill from "@/components/StatusPill";
import NodeHoverCard from "@/components/NodeHoverCard";
import StudyMode from "@/components/StudyMode";

// GraphCanvas must be dynamically imported — Three.js is browser-only
const GraphCanvas = dynamic(() => import("@/components/GraphCanvas"), { ssr: false });

export default function GraphPage() {
  const { session } = useParams<{ session: string }>();
  const setSession = useGraphStore((s) => s.setSession);
  const [studyOpen, setStudyOpen] = useState(false);

  useEffect(() => {
    if (session) setSession(session);
  }, [session, setSession]);

  useGraphSocket(session ?? "");

  return (
    <main className={`w-screen h-screen bg-black overflow-hidden relative ${studyOpen ? "study-open" : ""}`}>
      <GraphCanvas sessionId={session ?? ""} />
      <StatusPill />
      <NodeHoverCard />
      {/* Study Mode toggle — bottom right */}
      <button
        onClick={() => setStudyOpen(true)}
        className="fixed bottom-8 left-8 z-50 px-3 py-2 rounded-lg text-sm
                   border border-white/10 backdrop-blur-md"
        style={{ background: "rgba(26,5,51,0.85)", color: "#e8e0ff88" }}
      >
        📓
      </button>
      <StudyMode open={studyOpen} onClose={() => setStudyOpen(false)} sessionId={session ?? ""} />
    </main>
  );
}
```

---

## STEP 11 — INTEGRATION CHECKLIST

Run through every item before the 04:00 code freeze.

- [ ] `cd backend && uvicorn main:app --reload --port 8000` — starts without errors
- [ ] `cd frontend && npm run dev` — starts without TypeScript errors
- [ ] POST `/api/discover` `{"topic":"Parasite (2019)","max_depth":2}` → returns `session_id`
- [ ] TinyFish dashboard shows active runs at https://agent.tinyfish.ai/runs
- [ ] WebSocket at `/ws/{session_id}` receives `graph_delta` within 60 seconds
- [ ] 3D graph renders with coloured nodes and directional particle edges
- [ ] Node sizes vary visibly by PageRank
- [ ] Clicking a node opens NodeHoverCard with summary, tags, and betweenness score
- [ ] "Fall Deeper →" button expands the graph one more level (new TinyFish runs fire)
- [ ] StatusPill colours: cyan=Scout, violet=Analyst, gold=Ranker, teal=complete
- [ ] Study Mode: upload a PDF → response shows `chunks_ingested > 0`
- [ ] Study Mode: ask a question → returns a grounded answer in amber-bordered block
- [ ] All three demo topics tested end-to-end with 20+ nodes each

---

## STEP 12 — DEMO SCRIPT (memorise before 05:30)

Total time: 5 minutes. Hard stop. Rehearse 5 times.

1. **The hook (30s):** "Six hours. That's how long it takes to do background research manually. Rabbit Hole takes 90 seconds."
2. **Type "Parasite (2019)". Enter.** While graph loads: "TinyFish is running browser sessions against the live web right now — not cached, not Wikipedia."
3. **Graph appears.** "Every node came off a real webpage in the last 30 seconds. Node size is PageRank. Colour is community cluster — found automatically by Louvain detection."
4. **Click "Bong Joon-ho".** "Betweenness centrality: highest in the graph. Remove him and two clusters disconnect. The algorithm found that."
5. **Click "Fall Deeper →".** "Scout re-runs TinyFish. Analyst extracts. Ranker re-scores. Recursive."
6. **Open Study Mode. Upload PDF.** "✓ 42 chunks ingested · 7 nodes linked. Those amber pulses are nodes that match your notes."
7. **Ask a question.** "RAG scoped to the graph. Your knowledge plus the web."
8. **Business case (30s):** "Journalists, researchers, analysts — $29/month. The web never stops changing. The graph never gets stale."
9. **Close:** "Every topic is a universe. Rabbit Hole shows you the whole thing."

---

*AGENTS.md v3 — TinyFish SDK Corrected Edition*
*TinyFish SG Hackathon · March 28, 2025 · NUS Cinnamon Wing*
*Fall deeper. See everything.*
