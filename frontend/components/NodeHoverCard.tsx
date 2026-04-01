"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useGraphStore } from "../lib/graphStore";

const CLUSTER_COLORS: Record<number, string> = {
  0: "#9b4dff",   // seed / primary — soft violet
  1: "#a855f7",   // creator/person — bright violet
  2: "#00f5e4",   // works/artifacts — pulsar cyan
  3: "#ff7b6b",   // accent / connectors — coral
  4: "#00c9a7",   // concept/theme — teal
  5: "#4d7cff",   // place / blue
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export default function NodeHoverCard() {
  const selectedNode = useGraphStore((state) => state.selectedNode);
  const sessionId = useGraphStore((state) => state.sessionId);
  const selectNode = useGraphStore((state) => state.selectNode);

  if (!selectedNode) {
    return null;
  }

  const clusterColor = CLUSTER_COLORS[selectedNode.cluster_id % 6] ?? "#ffffff";

  async function fallDeeper() {
    try {
      await fetch(`${API_BASE}/api/expand/${selectedNode.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          node_id: selectedNode.id,
          session_id: sessionId,
        }),
      });
    } finally {
      selectNode(null);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        key={selectedNode.id}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="fixed left-1/2 top-[44%] z-50 w-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-[26px] p-5 backdrop-blur-xl"
        style={{
          background: "rgba(27, 34, 61, 0.92)",
          border: `1px solid ${clusterColor}33`,
          boxShadow: `0 28px 90px rgba(12, 16, 34, 0.45)`,
        }}
      >
        <div className="mb-3 flex items-center justify-between">
          <span
            className="rounded-full px-2 py-0.5 font-['Space_Grotesk'] text-xs font-medium uppercase tracking-widest"
            style={{
              backgroundColor: `${clusterColor}22`,
              color: clusterColor,
            }}
          >
            {selectedNode.node_type}
          </span>
          <div className="text-right font-mono text-xs text-[var(--text-muted)]">
            <div title="Gravitational pull — how much of the universe orbits this node">
              PR {selectedNode.pagerank.toFixed(3)}
            </div>
            <div title="Bridge score — remove this node and clusters disconnect">
              Bridge {selectedNode.betweenness.toFixed(3)}
            </div>
          </div>
        </div>

        <div className="mb-3 border-b border-white/10 pb-3">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-['Space_Grotesk'] text-lg font-semibold text-white">
              {selectedNode.label}
            </h3>
            {selectedNode.year ? (
              <span className="font-['Space_Grotesk'] text-sm font-normal text-white/40">
                ({selectedNode.year})
              </span>
            ) : null}
          </div>
        </div>

        <p className="mb-4 font-['IBM_Plex_Sans'] text-sm leading-relaxed text-[color:rgba(232,224,255,0.70)]">
          {selectedNode.summary}
        </p>

        <div className="mb-4 flex flex-wrap gap-2">
          {selectedNode.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full px-2 py-0.5 text-xs"
              style={{
                background: "rgba(255,255,255,0.05)",
                color: "var(--text-muted)",
              }}
            >
              #{tag}
            </span>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={fallDeeper}
            className="flex-1 rounded-2xl px-3 py-2.5 text-sm font-semibold"
            style={{
              backgroundColor: clusterColor,
              color: "#000000",
            }}
          >
            Fall Deeper →
          </button>
          {selectedNode.has_user_notes ? (
            <button
              type="button"
              className="note-linked-badge rounded-lg px-3 py-2 text-sm"
            >
              📓 In your notes
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => selectNode(null)}
            className="rounded-2xl border border-white/10 px-3 py-2.5 text-sm text-white/40"
          >
            ✕
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
