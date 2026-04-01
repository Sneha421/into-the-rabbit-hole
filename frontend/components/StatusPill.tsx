"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useGraphStore } from "../lib/graphStore";

function pillColor(status: string): string {
  if (status.includes("Scout") || status.includes("hunting")) {
    return "#00f5e4";
  }
  if (status.includes("Analyst") || status.includes("mapping")) {
    return "#9b4dff";
  }
  if (status.includes("Ranker") || status.includes("scoring")) {
    return "#9b4dff";
  }
  if (status.includes("complete")) {
    return "#00c9a7";
  }
  return "#ffffff";
}

export default function StatusPill() {
  const status = useGraphStore((state) => state.status);
  const [visible, setVisible] = useState(false);
  const color = pillColor(status);

  useEffect(() => {
    if (!status) {
      setVisible(false);
      return;
    }

    setVisible(true);
    const timeout = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(timeout);
  }, [status]);

  return (
    <AnimatePresence>
      {visible && status ? (
        <motion.div
          key={status}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="fixed top-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-[var(--border-ghost)] bg-[var(--surface-panel)] px-4 py-2 font-mono text-[13px] backdrop-blur-md"
          style={{ color }}
        >
          <span
            className="h-2 w-2 animate-pulse rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="font-mono text-[13px]">{status}</span>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
