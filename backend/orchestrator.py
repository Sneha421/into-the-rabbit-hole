from __future__ import annotations
import asyncio
import hashlib
import uuid
from typing import Callable, Awaitable
from urllib.parse import urlparse

from graph.graph_store import GraphStore
from agents.scout_agent import ScoutAgent
from agents.analyst_agent import AnalystAgent
from agents.ranker_agent import RankerAgent
from models.graph_models import Edge, EdgeType, Node, NodeType, GraphDelta

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
        SESSIONS[session_id] = self.graph

    async def _status(self, msg: str) -> None:
        print(f"[Orchestrator:{self.session_id}] {msg}")
        await self.broadcast({"type": "status", "message": msg})

    async def _push_delta(self, delta: GraphDelta) -> None:
        await self.broadcast({"type": "graph_delta", **self.graph.delta_to_json(delta)})

    async def _push_full(self) -> None:
        await self.broadcast({"type": "graph_full", **self.graph.to_json()})

    def _find_node_id_for_topic(self, topic: str) -> str:
        for node_id, data in self.graph.G.nodes(data=True):
            if data.get("label") == topic:
                return node_id
        return topic.lower().replace(" ", "-")[:40]

    def _build_provisional_delta(self, topic: str, pages: list[dict], depth: int) -> GraphDelta:
        topic_node_id = self._find_node_id_for_topic(topic)
        nodes: list[Node] = []
        edges: list[Edge] = []

        for page in pages:
            source_url = page.get("url", "")
            if not source_url:
                continue

            provisional_id = f"src-{hashlib.sha1(source_url.encode('utf-8')).hexdigest()[:32]}"
            if provisional_id in self.graph.G:
                continue

            parsed = urlparse(source_url)
            label = page.get("title") or parsed.netloc or "Web source"
            content = str(page.get("content", "")).strip()
            summary = content or f"Source page captured from {parsed.netloc or 'the live web'}."

            nodes.append(
                Node(
                    id=provisional_id,
                    label=label[:120],
                    node_type=NodeType.WORK,
                    summary=summary,
                    tags=["source-page", "live-web"],
                    depth=depth,
                    source_url=source_url,
                )
            )
            edges.append(
                Edge(
                    id=str(uuid.uuid4()),
                    source=topic_node_id,
                    target=provisional_id,
                    edge_type=EdgeType.REFERENCED_IN,
                    label="Surfaced in live web search",
                    weight=0.35,
                )
            )

        return GraphDelta(session_id=self.session_id, nodes=nodes, edges=edges)

    async def _expand_topic(self, topic: str, depth: int, query_limit: int = 1) -> None:
        await self._status(f"Loading TinyFish: searching the live web for {topic}")
        any_pages = False

        async for pages in self.scout.discover_stream(topic, depth=depth, query_limit=query_limit):
            any_pages = True
            print(
                f"[Orchestrator:{self.session_id}] Scout returned {len(pages)} page(s) "
                f"for topic='{topic}' at depth={depth}"
            )
            for page in pages[:3]:
                print(
                    f"[Orchestrator:{self.session_id}] page "
                    f"title={page.get('title', '')!r} url={page.get('url', '')}"
                )

            provisional_delta = self._build_provisional_delta(topic, pages, depth)
            if provisional_delta.nodes:
                print(
                    f"[Orchestrator:{self.session_id}] Adding {len(provisional_delta.nodes)} "
                    f"provisional source node(s) before Analyst completes"
                )
                self.graph.apply_delta(provisional_delta)
                await self._push_delta(provisional_delta)
                await self._push_full()

            await self._status(f"TinyFish loaded {len(pages)} page(s) for {topic}")
            await self._status(f"Analyst mapping: {topic}")
            delta = await self.analyst.enrich(
                pages, seed_topic=topic, depth=depth, session_id=self.session_id
            )
            print(
                f"[Orchestrator:{self.session_id}] Analyst extracted "
                f"{len(delta.nodes)} node(s) and {len(delta.edges)} edge(s) "
                f"for topic='{topic}'"
            )
            for node in delta.nodes[:5]:
                print(
                    f"[Orchestrator:{self.session_id}] node "
                    f"id={node.id} label={node.label!r} type={node.node_type.value} depth={node.depth}"
                )
            self.graph.apply_delta(delta)

            await self._status("Computing PageRank centrality...")
            await asyncio.sleep(0.3)
            await self._status("Computing Betweenness centrality...")
            await asyncio.sleep(0.3)
            await self._status("Computing Eigenvector centrality...")
            await asyncio.sleep(0.3)
            await self._status("Detecting communities (Louvain)...")
            await asyncio.sleep(0.3)
            await self._status("Separating Hubs and Authorities (HITS)...")
            await asyncio.sleep(0.3)
            
            scores = self.ranker.compute_all(self.graph.G)
            self.graph.apply_scores(scores)
            top_rabbit_holes = self.ranker.top_rabbit_holes(self.graph.G, scores, n=5)
            if top_rabbit_holes:
                print(
                    f"[Orchestrator:{self.session_id}] Top rabbit holes: "
                    + ", ".join(
                        f"{self.graph.get_node(node_id).get('label', node_id)}"
                        f" ({scores.get('rabbit_hole_score', {}).get(node_id, 0.0):.4f})"
                        for node_id in top_rabbit_holes
                        if self.graph.get_node(node_id)
                    )
                )
            print(
                f"[Orchestrator:{self.session_id}] Graph now has "
                f"{self.graph.G.number_of_nodes()} node(s) and {self.graph.G.number_of_edges()} edge(s)"
            )

            await self._push_delta(delta)
            await self._push_full()

        if not any_pages:
            detail = self.scout.last_error or "TinyFish returned no pages."
            await self._status(
                f"No pages discovered for {topic}. {detail}"
            )
            return

    async def start(self, seed_topic: str, max_depth: int = 2) -> None:
        try:
            print(
                f"[Orchestrator:{self.session_id}] Starting session "
                f"seed_topic={seed_topic!r} max_depth={max_depth}"
            )
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

            await self._expand_topic(seed_topic, depth=0)

            if max_depth >= 2:
                scores = self.ranker.compute_all(self.graph.G)
                top_ids = self.ranker.top_rabbit_holes(self.graph.G, scores, n=2)
                top_labels = [
                    self.graph.get_node(nid)["label"]
                    for nid in top_ids
                    if self.graph.get_node(nid)
                ]
                print(
                    f"[Orchestrator:{self.session_id}] Auto-expanding top node labels: "
                    f"{top_labels}"
                )
                await asyncio.gather(
                    *[self._expand_topic(label, depth=1) for label in top_labels]
                )

            if self.graph.G.number_of_nodes() <= 1:
                return

            await self._status("Rabbit hole complete. Click any node to go deeper.")
        except Exception as exc:
            await self._status(f"Rabbit hole failed: {exc}")
            raise

    async def expand_node(self, node_id: str) -> None:
        try:
            node = self.graph.get_node(node_id)
            if not node:
                print(f"[Orchestrator:{self.session_id}] expand requested for unknown node_id={node_id}")
                return
            print(
                f"[Orchestrator:{self.session_id}] Expanding node_id={node_id} "
                f"label={node['label']!r} current_depth={node.get('depth', 0)}"
            )
            await self._expand_topic(node["label"], depth=node.get("depth", 0) + 1)
        except Exception as exc:
            await self._status(f"Expansion failed: {exc}")
            raise

    async def deepen(self, target_depth: int) -> None:
        try:
            print(f"[Orchestrator:{self.session_id}] Deepening graph to target_depth={target_depth}")
            
            frontiers = [
                nid for nid, d in self.graph.G.nodes(data=True)
                if d.get("depth", 0) < target_depth and "source-page" not in d.get("tags", [])
            ]
            if not frontiers:
                await self._status(f"No expandable nodes found to reach depth {target_depth}.")
                return
                
            scores = self.ranker.compute_all(self.graph.G)
            rhs = scores.get("rabbit_hole_score", {})
            top_ids = sorted(frontiers, key=lambda nid: rhs.get(nid, 0), reverse=True)[:2]
            
            top_nodes = [self.graph.get_node(nid) for nid in top_ids]
            top_labels = [n["label"] for n in top_nodes if n]
            
            await self._status(f"Auto-expanding deeper rabbit holes: {top_labels}")
            await asyncio.gather(
                *[self._expand_topic(n["label"], depth=n.get("depth", 0) + 1) for n in top_nodes if n]
            )
            await self._status("Deepen complete. Click any node to go deeper.")
        except Exception as exc:
            await self._status(f"Deepen failed: {exc}")
            raise
