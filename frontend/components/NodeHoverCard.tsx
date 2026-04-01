"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useGraphStore } from "../lib/graphStore";

const CLUSTER_COLORS: Record<number, string> = {
  0: "#9b4dff",
  1: "#a855f7",
  2: "#00f5e4",
  3: "#ff7b6b",
  4: "#00c9a7",
  5: "#4d7cff",
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export default function NodeHoverCard() {
  const selectedNode = useGraphStore((state) => state.selectedNode);
  const sessionId = useGraphStore((state) => state.sessionId);
  const selectNode = useGraphStore((state) => state.selectNode);
  const markVisited = useGraphStore((state) => (state as any).markVisited);

  if (!selectedNode) return null;

  const clusterColor = CLUSTER_COLORS[selectedNode.cluster_id % 6] ?? "#ffffff";

  async function fallDeeper() {
    try {
      // mark visited immediately so visuals update in real-time
      try {
        markVisited(selectedNode.id);
      } catch (e) {
        // ignore
      }

      await fetch(`${API_BASE}/api/expand/${selectedNode.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ node_id: selectedNode.id, session_id: sessionId }),
      });
    } finally {
      selectNode(null);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        key={selectedNode.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(2px)" }}
        onClick={() => selectNode(null)}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="flex w-full max-w-[26rem] flex-col rounded-[26px] p-5 backdrop-blur-xl"
          style={{
            background: "rgba(27, 34, 61, 0.97)",
            border: `1px solid ${clusterColor}33`,
            boxShadow: `0 28px 90px rgba(12, 16, 34, 0.6)`,
            maxHeight: "calc(100vh - 2rem)",
            overflow: "hidden",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-3 flex shrink-0 items-center justify-between">
            <span
              className="rounded-full px-2 py-0.5 text-xs font-medium uppercase tracking-widest"
              style={{ backgroundColor: `${clusterColor}22`, color: clusterColor }}
            >
              {selectedNode.node_type}
            </span>
            <div className="text-right font-mono text-xs text-[var(--text-muted)]">
              <div title="Gravitational pull">PR {selectedNode.pagerank.toFixed(3)}</div>
              <div title="Bridge score">Bridge {selectedNode.betweenness.toFixed(3)}</div>
            </div>
          </div>

          <div className="mb-3 shrink-0 border-b border-white/10 pb-3">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-lg font-semibold text-white">{selectedNode.label}</h3>
              {selectedNode.year ? (
                <span className="text-sm text-white/40">({selectedNode.year})</span>
              ) : null}
            </div>
          </div>

          <div className="mb-4 min-h-0 flex-1 overflow-y-auto pr-1">
            <p className="mb-4 text-sm leading-relaxed text-[color:rgba(232,224,255,0.70)]">
              {selectedNode.summary}
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedNode.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full px-2 py-0.5 text-xs"
                  style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-muted)" }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={fallDeeper}
              className="w-full rounded-2xl px-3 py-2.5 text-sm font-semibold sm:flex-1"
              style={{ backgroundColor: clusterColor, color: "#000" }}
            >
              Fall Deeper →
            </button>

            {selectedNode.has_user_notes ? (
              <button type="button" className="note-linked-badge w-full rounded-lg px-3 py-2 text-sm sm:w-auto">
                📓 In your notes
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => {
                try {
                  markVisited(selectedNode.id);
                } catch (e) {
                  /* ignore */
                }
                selectNode(null);
              }}
              className="w-full rounded-2xl border border-white/10 px-3 py-2.5 text-sm text-white/40 sm:w-auto"
            >
              ✕
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
