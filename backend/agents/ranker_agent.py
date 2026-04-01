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
