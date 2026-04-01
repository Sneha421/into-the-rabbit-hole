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
            attrs["pagerank"]          = float(scores.get("pagerank", {}).get(node_id, 0.0))
            attrs["betweenness"]       = float(scores.get("betweenness", {}).get(node_id, 0.0))
            attrs["eigenvector"]       = float(scores.get("eigenvector", {}).get(node_id, 0.0))
            attrs["hub_score"]         = float(scores.get("hubs", {}).get(node_id, 0.0))
            attrs["authority_score"]   = float(scores.get("authorities", {}).get(node_id, 0.0))
            attrs["rabbit_hole_score"] = float(scores.get("rabbit_hole_score", {}).get(node_id, 0.0))
            attrs["cluster_id"]        = int(scores.get("communities", {}).get(node_id, 0))

    def get_node(self, node_id: str) -> dict | None:
        return dict(self.G.nodes[node_id]) if node_id in self.G else None

    def to_json(self) -> dict:
        nodes = []
        for n, d in self.G.nodes(data=True):
            node_data = dict(d)
            node_data.setdefault("id", n)
            nodes.append(node_data)
        edges = [dict(source=u, target=v, **d) for u, v, d in self.G.edges(data=True)]
        return {"session_id": self.session_id, "nodes": nodes, "edges": edges}

    def delta_to_json(self, delta: GraphDelta) -> dict:
        return {
            "session_id": self.session_id,
            "nodes": [n.model_dump() for n in delta.nodes],
            "edges": [e.model_dump() for e in delta.edges],
        }
