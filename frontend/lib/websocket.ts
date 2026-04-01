import { useEffect } from "react";
import { useGraphStore } from "./graphStore";
import type { WsMessage } from "./types";

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || "ws://127.0.0.1:8000";

export function useGraphSocket(sessionId: string) {
  const applyDelta = useGraphStore((state) => state.applyDelta);
  const applyFull = useGraphStore((state) => state.applyFull);
  const setStatus = useGraphStore((state) => state.setStatus);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    let retries = 0;
    let socket: WebSocket | null = null;
    let pingTimer: ReturnType<typeof setInterval> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const clearTimers = () => {
      if (pingTimer) {
        clearInterval(pingTimer);
        pingTimer = null;
      }
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    const connect = () => {
      socket = new WebSocket(`${WS_BASE}/ws/${sessionId}`);

      socket.onopen = () => {
        retries = 0;
        pingTimer = setInterval(() => {
          if (socket?.readyState === WebSocket.OPEN) {
            socket.send("ping");
          }
        }, 30000);
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WsMessage;
          if (message.type === "status") {
            setStatus(message.message);
            return;
          }
          if (message.type === "graph_delta") {
            applyDelta(message.nodes, message.edges);
            return;
          }
          if (message.type === "graph_full") {
            applyFull(message.nodes, message.edges);
          }
        } catch {
          // Ignore malformed websocket payloads.
        }
      };

      socket.onclose = () => {
        clearTimers();
        if (retries < 5) {
          retries += 1;
          reconnectTimer = setTimeout(connect, 2000);
        }
      };

      socket.onerror = () => {
        socket?.close();
      };
    };

    connect();

    return () => {
      clearTimers();
      socket?.close();
    };
  }, [sessionId, applyDelta, applyFull, setStatus]);
}
