"use client";

import { useGraphStore } from "../lib/graphStore";

const ALGORITHMS = [
  {
    label: "PageRank",
    tooltip: "Gravitational pull — how much of the universe orbits this node",
  },
  {
    label: "Betweenness",
    tooltip: "Bridge score — remove this node and clusters disconnect",
  },
  {
    label: "Eigenvector",
    tooltip: "Prestige score across connected important nodes",
  },
  {
    label: "Louvain",
    tooltip: "Community detection for thematic cluster grouping",
  },
  {
    label: "HITS",
    tooltip: "Separates hubs from authorities in the graph",
  },
  {
    label: "Dijkstra",
    tooltip: "Shortest path tracing between graph nodes",
  },
];

const getActiveAlgorithm = (status: string) => {
  if (status.includes("PageRank")) return "PageRank";
  if (status.includes("Betweenness")) return "Betweenness";
  if (status.includes("Eigenvector")) return "Eigenvector";
  if (status.includes("Louvain")) return "Louvain";
  if (status.includes("HITS") || status.includes("Hubs")) return "HITS";
  if (status.includes("Dijkstra") || status.includes("path")) return "Dijkstra";
  return null;
};

export default function Sidebar() {
  const maxDepth = useGraphStore((state) => state.maxDepth);
  const setMaxDepth = useGraphStore((state) => state.setMaxDepth);
  const status = useGraphStore((state) => state.status);
  
  const activeAlgorithm = getActiveAlgorithm(status);

  return (
    <aside className="fixed right-6 top-20 z-40 flex w-[280px] max-w-[calc(100vw-3rem)] flex-col gap-6 rounded-[24px] border border-[var(--border-ghost)] bg-[var(--surface-panel)] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.4)] backdrop-blur-xl">
      <section>
        <p className="font-mono text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
          Controls
        </p>
        <h2 className="mt-2 font-['Space_Grotesk'] text-base font-semibold text-white">
          Exploration Depth
        </h2>
        <p className="mt-2 font-['IBM_Plex_Sans'] text-sm text-[var(--text-secondary)]">
          Depth: {maxDepth}
        </p>
        <input
          type="range"
          min={1}
          max={4}
          value={maxDepth}
          onChange={(event) => setMaxDepth(Number(event.target.value))}
          className="mt-3 w-full accent-[var(--violet)]"
        />
        <p className="mt-2 font-['IBM_Plex_Sans'] text-xs leading-5 text-[var(--text-muted)]">
          This affects the next discovery started from the home page.
        </p>
        <button
          className="mt-4 w-full rounded-lg bg-[var(--violet)] px-4 py-2 font-mono text-sm font-semibold text-black hover:opacity-95 transition-all"
          onClick={async () => {
            const sessionId = useGraphStore.getState().sessionId;
            if (sessionId) {
              await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/api/deepen/${sessionId}`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ target_depth: maxDepth })
              });
            }
          }}
        >
          Expand to Depth {maxDepth}
        </button>
      </section>

      <section>
        <h2 className="font-['Space_Grotesk'] text-sm font-semibold text-white">
          Active Algorithms
        </h2>
        <div className="mt-3 flex flex-col gap-2 font-mono text-xs text-[var(--text-secondary)]">
          {ALGORITHMS.map((algorithm) => {
            const isActive = activeAlgorithm === algorithm.label;
            return (
              <div
                key={algorithm.label}
                className={`flex items-center gap-2 transition-colors duration-300 ${
                  isActive ? "text-[var(--cyan)]" : "text-[var(--text-secondary)]"
                }`}
                title={algorithm.tooltip}
              >
                <span
                  className={`h-2 w-2 rounded-full transition-all duration-300 ${
                    isActive
                      ? "bg-[var(--cyan)] shadow-[0_0_8px_var(--cyan)] opacity-100"
                      : "bg-[var(--teal)] opacity-30"
                  }`}
                />
                <span>{algorithm.label}</span>
              </div>
            );
          })}
        </div>
      </section>
    </aside>
  );
}
