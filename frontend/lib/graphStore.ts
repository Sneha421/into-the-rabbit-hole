import { create } from "zustand";
import type { GraphEdge, GraphNode } from "./types";

interface GraphStoreState {
  nodes: Map<string, GraphNode>;
  edges: GraphEdge[];
  status: string;
  statusHistory: string[];
  selectedNode: GraphNode | null;
  sessionId: string;
  maxDepth: number;
  applyDelta: (nodes: GraphNode[], edges: GraphEdge[]) => void;
  applyFull: (nodes: GraphNode[], edges: GraphEdge[]) => void;
  setStatus: (status: string) => void;
  selectNode: (node: GraphNode | null) => void;
  setSession: (sessionId: string) => void;
  setMaxDepth: (maxDepth: number) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  visited: Record<string, boolean>;
  markVisited: (nodeId: string) => void;
}

export const useGraphStore = create<GraphStoreState>((set) => ({
  nodes: new Map<string, GraphNode>(),
  edges: [],
  status: "",
  statusHistory: [],
  selectedNode: null,
  sessionId: "",
  maxDepth: 2,
  applyDelta: (newNodes, newEdges) =>
    set((state) => {
      const nodes = new Map(state.nodes);
      for (const node of newNodes) {
        nodes.set(node.id, node);
      }
      return {
        nodes,
        edges: state.edges.concat(newEdges),
      };
    }),
  applyFull: (nodes, edges) =>
    set({
      nodes: new Map(nodes.map((node) => [node.id, node])),
      edges,
    }),
  setStatus: (status) =>
    set((state) => {
      const trimmed = status.trim();
      if (!trimmed) {
        return { status: "", statusHistory: [] };
      }

      const history =
        state.statusHistory[state.statusHistory.length - 1] === trimmed
          ? state.statusHistory
          : [...state.statusHistory.slice(-5), trimmed];

      return {
        status: trimmed,
        statusHistory: history,
      };
    }),
  selectNode: (selectedNode) =>
    set((state) => {
      if (selectedNode) {
        const visited = { ...(state.visited || {}), [selectedNode.id]: true };
        try {
          if (typeof window !== "undefined" && state.sessionId) {
            localStorage.setItem(`visited_${state.sessionId}`, JSON.stringify(visited));
          }
        } catch (e) {}
        return {
          selectedNode,
          visited,
        };
      }
      return { selectedNode: null };
    }),
  setSession: (sessionId) =>
    set((state) => {
      let visited: Record<string, boolean> = {};
      try {
        if (typeof window !== "undefined" && sessionId) {
          const raw = localStorage.getItem(`visited_${sessionId}`);
          if (raw) visited = JSON.parse(raw || "{}");
        }
      } catch (e) {
        visited = {};
      }
      return {
        sessionId,
        nodes: new Map<string, GraphNode>(),
        edges: [],
        status: "",
        statusHistory: [],
        selectedNode: null,
        visited,
      };
    }),
  setMaxDepth: (maxDepth) => set({ maxDepth }),
  sidebarOpen: true,
  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  visited: {},
  markVisited: (nodeId: string) =>
    set((state) => {
      const visited = { ...(state.visited || {}), [nodeId]: true };
      try {
        if (typeof window !== "undefined" && state.sessionId) {
          localStorage.setItem(`visited_${state.sessionId}`, JSON.stringify(visited));
        }
      } catch (e) {}
      return { visited };
    }),
}));
