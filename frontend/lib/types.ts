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
  source_url?: string;
  has_user_notes: boolean;
}

export interface GraphEdge {
  id?: string;
  source: string;
  target: string;
  edge_type: EdgeType;
  label: string;
  weight: number;
}

export type WsMessage =
  | { type: "graph_delta"; session_id: string; nodes: GraphNode[]; edges: GraphEdge[] }
  | { type: "graph_full"; session_id: string; nodes: GraphNode[]; edges: GraphEdge[] }
  | { type: "status"; message: string };
