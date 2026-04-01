"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import SessionTabs from "../../../../components/SessionTabs";
import StatusPill from "../../../../components/StatusPill";
import StudyMode from "../../../../components/StudyMode";
import { useGraphStore } from "../../../../lib/graphStore";
import type { GraphEdge, GraphNode } from "../../../../lib/types";
import { useGraphSocket } from "../../../../lib/websocket";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export default function StudyPage() {
  const { session } = useParams<{ session: string }>();
  const setSession = useGraphStore((state) => state.setSession);
  const applyFull = useGraphStore((state) => state.applyFull);
  const setStatus = useGraphStore((state) => state.setStatus);
  const nodes = useGraphStore((state) => state.nodes);
  const [fatalMessage, setFatalMessage] = useState("");

  const loadGraph = useCallback(async () => {
    if (!session) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/graph/${session}`);
      if (!response.ok) {
        throw new Error(response.status === 404 ? "not found" : "unavailable");
      }

      const payload = (await response.json()) as {
        error?: string;
        nodes?: GraphNode[];
        edges?: GraphEdge[];
        status?: string;
      };

      if (payload.status) {
        setStatus(payload.status);
      }

      if (payload.error) {
        setFatalMessage(
          payload.error === "not found"
            ? "This rabbit hole session expired or was lost after a backend restart."
            : payload.error
        );
        applyFull([], []);
        return;
      }

      setFatalMessage("");
      applyFull(payload.nodes ?? [], payload.edges ?? []);
    } catch {
      setFatalMessage("The frontend could not reach the graph API on 127.0.0.1:8000.");
    }
  }, [applyFull, session, setStatus]);

  useEffect(() => {
    if (session) {
      setSession(session);
      void loadGraph();
    }
  }, [loadGraph, session, setSession]);

  useGraphSocket(session ?? "");

  return (
    <main className="graph-canvas-bg min-h-screen bg-[var(--void)] px-6 pb-10 pt-24">
      {session ? <SessionTabs sessionId={session} active="study" /> : null}
      <StatusPill />
      {fatalMessage ? (
        <div className="mx-auto mt-20 max-w-lg rounded-[24px] border border-[var(--border-ghost)] bg-[var(--surface-panel)] px-6 py-5 text-center shadow-[0_28px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <h1 className="font-['Space_Grotesk'] text-xl font-semibold text-white">
            Session Unavailable
          </h1>
          <p className="mt-3 font-['IBM_Plex_Sans'] text-sm leading-6 text-[var(--text-secondary)]">
            {fatalMessage}
          </p>
        </div>
      ) : (
        <>
          <div className="mx-auto mb-8 max-w-6xl">
            <p className="font-mono text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
              Study Tab
            </p>
            <h1 className="mt-2 font-['Space_Grotesk'] text-4xl font-semibold text-white">
              Bring your own material into the graph
            </h1>
            <p className="mt-3 max-w-2xl font-['IBM_Plex_Sans'] text-sm leading-6 text-[var(--text-secondary)]">
              The current session has {nodes.size} graph node{nodes.size === 1 ? "" : "s"} in
              memory. Upload notes here instead of opening an overlay on the graph canvas.
            </p>
          </div>
          <StudyMode sessionId={session ?? ""} onUploadComplete={loadGraph} />
        </>
      )}
    </main>
  );
}
