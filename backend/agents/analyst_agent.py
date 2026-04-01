from __future__ import annotations
import json
import uuid
import os
from openai import AsyncOpenAI
from models.graph_models import Node, Edge, GraphDelta, NodeType, EdgeType

oai = AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])

SYSTEM = """You are a knowledge graph architect for a curiosity-driven rabbit hole engine.
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
                    response_format={"type": "json_object"},
                )
                raw = json.loads(resp.choices[0].message.content)
            except Exception as e:
                print(f"[Analyst] OpenAI call failed: {e}")
                continue

            print(
                f"[Analyst] batch for seed_topic={seed_topic!r} returned "
                f"{len(raw.get('nodes', []))} node candidate(s) and "
                f"{len(raw.get('edges', []))} edge candidate(s)"
            )

            for n in raw.get("nodes", []):
                if not isinstance(n, dict):
                    continue
                n_id = n.get("id") or str(uuid.uuid4())
                if n_id in seen_node_ids:
                    continue
                seen_node_ids.add(n_id)

                try:
                    ntype_str = str(n.get("node_type", "concept")).lower()
                    try:
                        node_type = NodeType(ntype_str)
                    except ValueError:
                        node_type = NodeType.CONCEPT

                    tags_raw = n.get("tags", [])
                    tags = tags_raw if isinstance(tags_raw, list) else [str(tags_raw)]

                    year_raw = n.get("year")
                    try:
                        year = int(year_raw) if year_raw is not None else None
                    except (ValueError, TypeError):
                        year = None

                    all_nodes.append(Node(
                        id=str(n_id)[:60],
                        label=str(n.get("label", n_id))[:100],
                        node_type=node_type,
                        summary=str(n.get("summary", ""))[:1000],
                        year=year,
                        tags=[str(t).lower() for t in tags[:5]],
                        depth=depth,
                    ))
                except Exception as e:
                    print(f"[Analyst] node parse error: {e}")

            for e in raw.get("edges", []):
                if not isinstance(e, dict):
                    continue
                try:
                    etype_str = str(e.get("edge_type", "referenced_in")).lower()
                    try:
                        edge_type = EdgeType(etype_str)
                    except ValueError:
                        edge_type = EdgeType.REFERENCED_IN

                    all_edges.append(Edge(
                        id=str(uuid.uuid4()),
                        source=str(e.get("source", "")),
                        target=str(e.get("target", "")),
                        edge_type=edge_type,
                        label=str(e.get("label", ""))[:100],
                        weight=float(e.get("weight", 0.5)),
                    ))
                except Exception as e:
                    print(f"[Analyst] edge parse error: {e}")

        print(
            f"[Analyst] final parsed result for seed_topic={seed_topic!r}: "
            f"{len(all_nodes)} node(s), {len(all_edges)} edge(s)"
        )
        return GraphDelta(session_id=session_id, nodes=all_nodes, edges=all_edges)
