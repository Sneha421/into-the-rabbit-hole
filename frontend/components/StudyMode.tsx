"use client";

import { useMemo, useRef, useState } from "react";
import { useGraphStore } from "../lib/graphStore";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

type UploadResult = {
  chunks_ingested: number;
  nodes_linked: number;
};

function useStudyUpload(sessionId: string) {
  const [ingesting, setIngesting] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string>("");

  async function uploadFile(file: File) {
    setIngesting(true);
    setResult(null);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_BASE}/api/study/upload/${sessionId}`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("upload failed");
      }

      const payload = (await response.json()) as UploadResult;
      setResult(payload);
      return payload;
    } catch {
      setError("Lost in the void. Trying another path…");
      return null;
    } finally {
      setIngesting(false);
    }
  }

  return { uploadFile, ingesting, result, error };
}

interface StudyModeProps {
  sessionId: string;
  onUploadComplete?: () => Promise<void> | void;
}

export default function StudyMode({ sessionId, onUploadComplete }: StudyModeProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nodes = useGraphStore((state) => state.nodes);
  const { uploadFile, ingesting, result, error } = useStudyUpload(sessionId);
  const [dragging, setDragging] = useState(false);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState("");
  const [askError, setAskError] = useState("");

  const linkedNodes = useMemo(
    () => Array.from(nodes.values()).filter((node) => node.has_user_notes),
    [nodes]
  );

  async function handleFile(file: File | null) {
    if (!file || !sessionId) {
      return;
    }

    const uploadResult = await uploadFile(file);
    if (uploadResult && onUploadComplete) {
      await onUploadComplete();
    }
  }

  async function handleAsk(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!question.trim() || !sessionId) {
      return;
    }

    setAsking(true);
    setAskError("");

    try {
      const response = await fetch(`${API_BASE}/api/study/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question,
          session_id: sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error("ask failed");
      }

      const payload = (await response.json()) as {
        answer: string;
        source_chunks: string[];
      };
      setAnswer(payload.answer);
    } catch {
      setAskError("Lost in the void. Trying another path…");
      setAnswer("");
    } finally {
      setAsking(false);
    }
  }

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.85fr)]">
      <div className="rounded-[28px] border border-[var(--border-ghost)] bg-[var(--surface-panel)] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.32)] backdrop-blur-xl">
        <p className="font-mono text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
          Study Mode
        </p>
        <h1 className="mt-2 font-['Space_Grotesk'] text-3xl font-semibold text-white">
          Link your notes into the rabbit hole
        </h1>
        <p className="mt-3 max-w-2xl font-['IBM_Plex_Sans'] text-sm leading-6 text-[var(--text-secondary)]">
          Upload reading notes, transcripts, or PDFs. The study agent chunks them, embeds them,
          links related graph nodes, and answers questions strictly from your notes.
        </p>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          onDragEnter={() => setDragging(true)}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={async (event) => {
            event.preventDefault();
            setDragging(false);
            await handleFile(event.dataTransfer.files[0] ?? null);
          }}
          className="mt-6 w-full rounded-[24px] border border-dashed p-6 text-left backdrop-blur-md transition-colors"
          style={{
            borderColor: "var(--border-active)",
            background: dragging ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)",
          }}
        >
          <p className="font-['IBM_Plex_Sans'] text-base text-[var(--text-secondary)]">
            Drop your notes into the void
          </p>
          <p className="mt-2 font-mono text-xs text-[var(--text-muted)]">
            Accepts .pdf, .txt, .md
          </p>
          {ingesting ? (
            <p className="mt-4 font-mono text-[13px] text-[var(--amber)]">
              Study agent is linking your notes to the graph...
            </p>
          ) : null}
          {!ingesting && result ? (
            <p className="mt-4 font-mono text-[13px] text-[var(--amber)]">
              ✓ {result.chunks_ingested} chunks ingested · {result.nodes_linked} nodes linked
            </p>
          ) : null}
          {!ingesting && error ? (
            <p className="mt-4 font-mono text-[13px] text-[var(--red)]">{error}</p>
          ) : null}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.md"
          className="hidden"
          onChange={(event) => {
            void handleFile(event.target.files?.[0] ?? null);
            event.target.value = "";
          }}
        />

        <form onSubmit={handleAsk} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="What do your notes say about…"
            className="flex-1 rounded-xl border border-[var(--border-ghost)] bg-black/20 px-4 py-3 font-['IBM_Plex_Sans'] text-sm text-[var(--text-secondary)] outline-none"
          />
          <button
            type="submit"
            disabled={asking}
            className="rounded-xl px-5 py-3 font-mono text-sm uppercase tracking-[0.1em]"
            style={{ background: "var(--amber)", color: "#000000" }}
          >
            Ask
          </button>
        </form>

        {asking ? (
          <p className="mt-4 font-mono text-[13px] text-[var(--amber)]">
            Study agent is tracing your notes...
          </p>
        ) : null}
        {!asking && askError ? (
          <p className="mt-4 font-mono text-[13px] text-[var(--red)]">{askError}</p>
        ) : null}
        {!asking && answer ? <div className="study-answer mt-5">{answer}</div> : null}
      </div>

      <aside className="rounded-[28px] border border-[var(--border-ghost)] bg-[var(--surface-card)] p-6 shadow-[0_24px_72px_rgba(0,0,0,0.3)] backdrop-blur-xl">
        <p className="font-mono text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
          Linked Nodes
        </p>
        <p className="mt-2 font-['IBM_Plex_Sans'] text-sm leading-6 text-[var(--text-secondary)]">
          {linkedNodes.length} node{linkedNodes.length === 1 ? "" : "s"} currently connect to
          uploaded notes.
        </p>
        {linkedNodes.length === 0 ? (
          <p className="mt-5 font-['IBM_Plex_Sans'] text-sm text-[var(--text-muted)]">
            No notes linked yet.
          </p>
        ) : (
          <div className="mt-5 flex flex-wrap gap-2">
            {linkedNodes.map((node) => (
              <div
                key={node.id}
                className="flex items-center gap-2 rounded-full border border-[rgba(255,132,66,0.3)] bg-[rgba(255,132,66,0.12)] px-3 py-1 text-xs text-[var(--text-secondary)]"
              >
                <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--amber)]" />
                <span className="font-['IBM_Plex_Sans']">{node.label}</span>
              </div>
            ))}
          </div>
        )}
      </aside>
    </section>
  );
}
