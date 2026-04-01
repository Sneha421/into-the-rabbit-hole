"use client";

import Link from "next/link";

interface SessionTabsProps {
  sessionId: string;
  active: "graph" | "study";
}

export default function SessionTabs({ sessionId, active }: SessionTabsProps) {
  return (
    <nav className="fixed left-6 top-6 z-50 flex items-center gap-2 rounded-full border border-[var(--border-ghost)] bg-[var(--surface-panel)] p-1 shadow-[0_18px_40px_rgba(0,0,0,0.35)] backdrop-blur-md">
      <Link
        href={`/graph/${sessionId}`}
        className="rounded-full px-4 py-2 font-mono text-xs uppercase tracking-[0.12em]"
        style={{
          background: active === "graph" ? "var(--violet)" : "transparent",
          color: active === "graph" ? "#000000" : "var(--text-secondary)",
        }}
      >
        Graph
      </Link>
      <Link
        href={`/graph/${sessionId}/study`}
        className="rounded-full px-4 py-2 font-mono text-xs uppercase tracking-[0.12em]"
        style={{
          background: active === "study" ? "var(--violet)" : "transparent",
          color: active === "study" ? "#000000" : "var(--text-secondary)",
        }}
      >
        Study
      </Link>
    </nav>
  );
}
