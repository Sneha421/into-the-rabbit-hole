"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useGraphStore } from "../lib/graphStore";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
const PLACEHOLDERS = [
  "a film…",
  "a true crime case…",
  "an album…",
  "a book…",
  "a decade…",
  "a person…",
];
const DEMO_TOPICS = [
  "Parasite (2019)",
  "Dark Side of the Moon",
  "The Zodiac Killer",
];

export default function HomePage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const maxDepth = useGraphStore((state) => state.maxDepth);
  const [topic, setTopic] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"explore" | "study">("explore");

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderIndex((index) => (index + 1) % PLACEHOLDERS.length);
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  async function submitTopic(value: string) {
    const trimmed = value.trim();
    if (!trimmed || submitting) {
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`${API_BASE}/api/discover`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic: trimmed,
          max_depth: maxDepth,
        }),
      });

      if (!response.ok) {
        throw new Error("discover failed");
      }

      const payload = (await response.json()) as { session_id: string };
      await new Promise((resolve) => setTimeout(resolve, 300));
      router.push(`/graph/${payload.session_id}`);
    } catch {
      setSubmitting(false);
    }
  }

  async function startStudySession() {
    if (submitting) return;
    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE}/api/session/new`, { method: "POST" });
      if (!response.ok) throw new Error("session failed");
      const payload = (await response.json()) as { session_id: string };
      await new Promise((resolve) => setTimeout(resolve, 300));
      router.push(`/graph/${payload.session_id}/study`);
    } catch {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--void)] px-6">
      <div className="flex w-full max-w-2xl flex-col items-center text-center">
        <h1 className="font-['Space_Grotesk'] text-5xl font-extralight uppercase tracking-[0.15em] text-white sm:text-6xl">
          RABBIT HOLE
        </h1>
        <p className="mt-4 font-['IBM_Plex_Sans'] text-base text-[var(--text-muted)]">
          Fall deeper. See everything.
        </p>

        <div className="mt-8 flex gap-8 font-mono text-sm uppercase tracking-[0.15em]">
          <button
            type="button"
            onClick={() => setActiveTab("explore")}
            className={`transition-colors duration-300 ${
              activeTab === "explore"
                ? "text-[var(--violet)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            }`}
          >
            Explore
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("study")}
            className={`transition-colors duration-300 ${
              activeTab === "study"
                ? "text-[var(--cyan)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            }`}
          >
            Study
          </button>
        </div>

        <div className="mt-6 w-full min-h-[160px]">
          <AnimatePresence mode="wait">
            {activeTab === "explore" ? (
              <motion.div
                key="explore"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center"
              >
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void submitTopic(topic);
                  }}
                  className={`mt-4 flex w-full items-center rounded-lg border border-[var(--border-active)] bg-transparent px-3 py-3 transition-opacity duration-300 ${
                    submitting ? "opacity-50 pointer-events-none" : "opacity-100"
                  }`}
                >
                  <input
                    ref={inputRef}
                    value={topic}
                    onChange={(event) => setTopic(event.target.value)}
                    placeholder={PLACEHOLDERS[placeholderIndex]}
                    className="flex-1 bg-transparent px-3 font-['IBM_Plex_Sans'] text-base text-white outline-none placeholder:text-[var(--text-muted)]"
                  />
                  <button
                    type="submit"
                    className="rounded-lg px-4 py-2 text-lg font-semibold"
                    style={{ background: "var(--violet)", color: "#000000" }}
                  >
                    →
                  </button>
                </form>

                <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                  {DEMO_TOPICS.map((demoTopic) => (
                    <button
                      key={demoTopic}
                      type="button"
                      onClick={() => {
                        setTopic(demoTopic);
                        void submitTopic(demoTopic);
                      }}
                      className="rounded-full border border-[var(--border-ghost)] bg-transparent px-3 py-1.5 font-['IBM_Plex_Sans'] text-sm text-[var(--text-muted)] transition-all duration-150 hover:bg-[rgba(255,255,255,0.05)] hover:text-[var(--text-secondary)]"
                    >
                      {demoTopic}
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="study"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center pt-4"
              >
                <p className="max-w-md font-['IBM_Plex_Sans'] text-sm leading-6 text-[var(--text-secondary)]">
                  Start an empty workspace to upload and traverse your own notes, documents, and transcripts.
                </p>
                <button
                  type="button"
                  onClick={startStudySession}
                  disabled={submitting}
                  className="mt-6 rounded-lg px-6 py-3 font-mono text-sm font-semibold uppercase tracking-[0.1em] transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ background: "var(--cyan)", color: "#000000" }}
                >
                  {submitting ? "Opening..." : "Create Workspace"}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}
