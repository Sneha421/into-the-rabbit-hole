"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import NodeHoverCard from "../../../components/NodeHoverCard";
import SessionTabs from "../../../components/SessionTabs";
import Sidebar from "../../../components/Sidebar";
import StatusPill from "../../../components/StatusPill";
import { useGraphStore } from "../../../lib/graphStore";
import type { GraphEdge, GraphNode } from "../../../lib/types";
import { useGraphSocket } from "../../../lib/websocket";

const GraphCanvasNoSSR = dynamic(() => import("../../../components/GraphCanvas"), { ssr: false });
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export default function GraphPage() {
  const { session } = useParams<{ session: string }>();
  const setSession = useGraphStore((s) => s.setSession);
  const applyFull = useGraphStore((s) => s.applyFull);
  const setStatus = useGraphStore((s) => s.setStatus);
  const nodes = useGraphStore((s) => s.nodes);
  const status = useGraphStore((s) => s.status);
  const statusHistory = useGraphStore((s) => s.statusHistory);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [fatalMessage, setFatalMessage] = useState("");

  useEffect(() => {
    if (session) {
      setSession(session);
    }
  }, [session, setSession]);

  useEffect(() => {
    if (!session) {
      return;
    }

    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const loadGraph = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/graph/${session}`);
        if (!response.ok) {
          if (!cancelled) {
            const message =
              response.status === 404
                ? "This rabbit hole session no longer exists. Start a new search from the home page."
                : "The graph API is unavailable right now.";
            setFatalMessage(message);
            setStatus(message);
            setInitialLoadComplete(true);
          }
          return false;
        }

        const payload = (await response.json()) as {
          error?: string;
          nodes?: GraphNode[];
          edges?: GraphEdge[];
          status?: string;
        };

        if (!cancelled) {
          if (payload.status) {
            setStatus(payload.status);
          }
          if (payload.error) {
            const message =
              payload.error === "not found"
                ? "This rabbit hole session expired or was lost after a backend restart. Start a new search from the home page."
                : payload.error;
            setFatalMessage(message);
            setStatus(message);
            applyFull([], []);
          } else {
            setFatalMessage("");
            applyFull(payload.nodes ?? [], payload.edges ?? []);
          }
          setInitialLoadComplete(true);
        }
        if (payload.error) {
          return false;
        }
        return (payload.nodes ?? []).length > 1 || (payload.edges ?? []).length > 0;
      } catch {
        if (!cancelled && attempts >= 5) {
          const message = "The frontend could not reach the graph API on 127.0.0.1:8000.";
          setFatalMessage(message);
          setStatus(message);
          setInitialLoadComplete(true);
        }
        return false;
      }
    };

    const pollGraph = async () => {
      attempts += 1;
      const hasContent = await loadGraph();
      if (!cancelled && !hasContent && attempts < 15) {
        timer = setTimeout(() => {
          void pollGraph();
        }, 2000);
      }
    };

    void pollGraph();

    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [applyFull, session, setStatus]);

  useGraphSocket(session ?? "");

  const graphIsEmpty = nodes.size <= 1;
  const discoveryFailureMessage =
    graphIsEmpty && status.startsWith("No pages discovered for ") ? status : "";
  const noDiscoveryYet = discoveryFailureMessage.length > 0;
  const loaderSteps =
    statusHistory.length > 0
      ? statusHistory
      : [initialLoadComplete ? "Opening rabbit hole..." : "Connecting to backend..."];
  const loaderHeading = loaderSteps.some((step) => step.includes("TinyFish"))
    ? "Loading TinyFish"
    : "Opening rabbit hole";
  const loaderMessage = status || loaderSteps[loaderSteps.length - 1];
  const showEmptyState =
    (status === "Rabbit hole complete. Click any node to go deeper." || status === "not found") &&
    graphIsEmpty;
  const showLoader = !fatalMessage && !initialLoadComplete;

  return (
    <main className="graph-canvas-bg relative h-screen w-screen overflow-hidden bg-[var(--void)]">
      {session ? <SessionTabs sessionId={session} active="graph" /> : null}
      <GraphCanvasNoSSR sessionId={session ?? ""} />

      {fatalMessage ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center px-6">
          <div className="max-w-lg rounded-[24px] border border-white/10 bg-[rgba(8,11,20,0.9)] px-6 py-5 text-center shadow-[0_28px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl">
            <h1 className="font-['Space_Grotesk'] text-xl font-semibold text-white">
              Session Unavailable
            </h1>
            <p className="mt-3 font-['IBM_Plex_Sans'] text-sm leading-6 text-[var(--text-secondary)]">
              {fatalMessage}
            </p>
            <a
              href="/"
              className="mt-5 inline-flex rounded-lg px-4 py-2 text-sm font-semibold"
              style={{ background: "var(--violet)", color: "#000000" }}
            >
              Start a New Rabbit Hole
            </a>
          </div>
        </div>
      ) : null}
      {showLoader ? (
        <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center px-6">
          <div className="pointer-events-auto w-full max-w-xl rounded-[24px] border border-white/10 bg-[rgba(8,11,20,0.88)] px-6 py-6 shadow-[0_28px_90px_rgba(0,0,0,0.48)] backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full bg-[var(--cyan)] shadow-[var(--glow-cyan)] animate-pulse" />
              <h1 className="font-['Space_Grotesk'] text-xl font-semibold text-white">
                {loaderHeading}
              </h1>
            </div>
            <p className="mt-3 font-['IBM_Plex_Sans'] text-sm leading-6 text-[var(--text-secondary)]">
              {loaderMessage}
            </p>
            <div className="mt-5 rounded-xl border border-[var(--border-ghost)] bg-[rgba(255,255,255,0.03)] px-4 py-4">
              <p className="font-mono text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
                Live details
              </p>
                <div className="mt-3 flex flex-col gap-2">
                {loaderSteps.slice().reverse().map((step, index) => (
                  <div
                    key={`${step}-${index}`}
                    className="flex items-start gap-3 font-['IBM_Plex_Sans'] text-sm text-[var(--text-secondary)]"
                  >
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[var(--violet)]" />
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-4 font-mono text-xs text-[var(--text-muted)]">
              nodes {nodes.size} · edges 0
            </p>
          </div>
        </div>
      ) : null}
      {showEmptyState ? (
        <div className="pointer-events-none fixed inset-x-0 top-1/2 z-30 -translate-y-1/2 px-6">
          <p className="mx-auto max-w-md rounded-[24px] border border-white/10 bg-[rgba(8,11,20,0.88)] px-5 py-4 text-center font-['IBM_Plex_Sans'] text-sm text-[var(--text-secondary)] backdrop-blur-xl">
            No rabbit holes found yet. Try going deeper.
          </p>
        </div>
      ) : null}
      {noDiscoveryYet ? (
        <div className="fixed inset-0 z-30 flex items-center justify-center px-6">
          <div className="max-w-lg rounded-[24px] border border-white/10 bg-[rgba(8,11,20,0.88)] px-6 py-5 text-center shadow-[0_28px_90px_rgba(0,0,0,0.48)] backdrop-blur-xl">
            <h1 className="font-['Space_Grotesk'] text-xl font-semibold text-white">
              Discovery Stalled
            </h1>
            <p className="mt-3 font-['IBM_Plex_Sans'] text-sm leading-6 text-[var(--text-secondary)]">
              {discoveryFailureMessage}
            </p>
            <p className="mt-2 font-mono text-xs text-[var(--text-muted)]">
              nodes {nodes.size} · edges 0
            </p>
            <a
              href="/"
              className="mt-5 inline-flex rounded-lg px-4 py-2 text-sm font-semibold"
              style={{ background: "var(--violet)", color: "#000000" }}
            >
              Start a Different Search
            </a>
          </div>
        </div>
      ) : null}
      <Sidebar />
      <StatusPill />
      <NodeHoverCard />
    </main>
  );
}
