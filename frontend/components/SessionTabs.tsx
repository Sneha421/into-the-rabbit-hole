"use client";

import Link from "next/link";
import { } from "react";
import { useRouter } from "next/navigation";
import { useGraphStore } from "../lib/graphStore";

interface SessionTabsProps {
  sessionId: string;
  active: "graph" | "home";
}

export default function SessionTabs({ sessionId, active }: SessionTabsProps) {
  const router = useRouter();
  const setSession = useGraphStore((s) => s.setSession);
  const handleHomeClick = () => {
    if (!sessionId) {
      router.push("/");
      return;
    }

    const confirmed = typeof window !== "undefined"
      ? window.confirm(
          "Returning home will delete the current knowledge graph from the client view. You will need to enter a new prompt to generate a fresh graph. Do you want to continue?"
        )
      : true;

    if (!confirmed) return;

    try {
      if (typeof window !== "undefined" && sessionId) {
        localStorage.removeItem(`visited_${sessionId}`);
      }
    } catch (e) {}

    setSession("");
    router.push("/");
  };

  return (
    <>
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

        <button
          type="button"
          onClick={handleHomeClick}
          className="rounded-full px-4 py-2 font-mono text-xs uppercase tracking-[0.12em]"
          style={{
            background: active === "home" ? "var(--violet)" : "transparent",
            color: active === "home" ? "#000000" : "var(--text-secondary)",
          }}
        >
          Home
        </button>
      </nav>

      {/* Confirm handled with native dialog for reliability across overlays */}
    </>
  );
}
