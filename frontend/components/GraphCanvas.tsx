"use client";

import { useEffect, useRef, useState } from "react";
import { useGraphStore } from "../lib/graphStore";

// Cluster → hex colour (no yellow). Palette leans purple/cyan like the preferred design.
const CLUSTER_COLORS: Record<number, string> = {
  0: "#9b4dff",   // seed / primary — soft violet
  1: "#a855f7",   // creator/person — bright violet
  2: "#00f5e4",   // works/artifacts — pulsar cyan
  3: "#ff7b6b",   // accent / connectors — coral
  4: "#00c9a7",   // concept/theme — teal
  5: "#4d7cff",   // place / blue
};

interface GraphCanvasProps {
  sessionId: string;
}

export default function GraphCanvas({ sessionId }: GraphCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<any>(null);
  const nodes = useGraphStore((state) => state.nodes);
  const edges = useGraphStore((state) => state.edges);
  const status = useGraphStore((state) => state.status);
  const selectedNode = useGraphStore((state) => state.selectedNode);
  const selectNode = useGraphStore((state) => state.selectNode);
  const [initError, setInitError] = useState<string>("");
  const prevNodeCountRef = useRef(0);
  const nodeList = Array.from(nodes.values());
  const seedOrPrimaryNode = nodeList[0] ?? null;
  const discoveryFailed = status.startsWith("No pages discovered for ");

  useEffect(() => {
    if (!mountRef.current) {
      return;
    }

    let cancelled = false;
    let resizeGraph: (() => void) | null = null;

    const initGraph = async () => {
      try {
        setInitError("");
        const { default: ForceGraph3D } = await import("3d-force-graph");
        const THREE = await import("three");
        if (cancelled || !mountRef.current) {
          return;
        }

        mountRef.current.innerHTML = "";

        const nodeSphere = (node: any) => {
          const color =
            CLUSTER_COLORS[node.cluster_id % 6] ??
            (node.is_seed ? "#9b4dff" : "#8ff3e1");
          const radius = node.is_seed
            ? 5.5
            : 1.8 + Math.min(3.5, (node.rabbit_hole_score ?? 0) * 8);
          
          // Only render a colored sphere for nodes — remove the grey "nameplate" sprite.
          const geometry = new THREE.SphereGeometry(radius, 32, 32);
          const material = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: node.is_seed ? 1.0 : 0.95,
          });
          const sphere = new THREE.Mesh(geometry, material);
          return sphere;
        };

        const graph = (ForceGraph3D as any)()(mountRef.current)
          .nodeVal((n: any) => 1.5 + (n.pagerank ?? 0) * 12)
          .nodeThreeObject(nodeSphere)
          .nodeThreeObjectExtend(false)
          .linkColor(() => "rgba(146, 156, 196, 0.18)")
          .linkWidth((l: any) => 0.25 + (l.weight ?? 0.5) * 0.85)
          .linkOpacity(0.4)
          .linkDirectionalParticles(0)
          .backgroundColor("#0b0f19")
          .showNavInfo(false)
          .onNodeClick((node: any) => selectNode(node))
          .onNodeRightClick(() => {
            // TODO: add a node context menu for advanced graph actions.
          });

        resizeGraph = () => {
          if (!mountRef.current || !fgRef.current) {
            return;
          }
          fgRef.current
            .width(mountRef.current.clientWidth)
            .height(mountRef.current.clientHeight);
        };

        // TODO: add UnrealBloomPass post-processing (strength: 2.0, radius: 0.75, threshold: 0.1).
        fgRef.current = graph;
        const { nodes: currentNodes, edges: currentEdges } = useGraphStore.getState();
        graph.graphData({
          nodes: Array.from(currentNodes.values()),
          links: currentEdges.map((edge) => ({ ...edge })),
        });
        resizeGraph();
        window.addEventListener("resize", resizeGraph);

        const initialNodeCount = currentNodes.size;
        if (initialNodeCount > 0) {
          setTimeout(() => {
            if (!cancelled && fgRef.current) {
              fgRef.current.zoomToFit(600, 48);
            }
          }, 250);
        }
      } catch (error) {
        console.error("Graph canvas failed to initialize", error);
        setInitError("The graph renderer failed to start.");
      }
    };

    void initGraph();

    return () => {
      cancelled = true;
      if (resizeGraph) {
        window.removeEventListener("resize", resizeGraph);
      }
      fgRef.current?.pauseAnimation?.();
      fgRef.current = null;
    };
  }, [selectNode, sessionId]);

  useEffect(() => {
    if (!fgRef.current) {
      return;
    }
    
    const graphData = fgRef.current.graphData();
    const existingNodes = new Map(graphData.nodes.map((n: any) => [n.id, n]));
    const existingLinks = new Map(graphData.links.map((l: any) => [
      l.id ?? `${(l.source as any)?.id ?? l.source}-${(l.target as any)?.id ?? l.target}`, l
    ]));

    const mergedNodes = Array.from(nodes.values()).map((n) => {
      const existing = existingNodes.get(n.id);
      return existing ? Object.assign(existing, n) : { ...n };
    });

    const mergedLinks = edges.map((e) => {
      const edgeId = e.id ?? `${e.source}-${e.target}`;
      const existing = existingLinks.get(edgeId);
      return existing ? Object.assign(existing, e) : { ...e, id: edgeId };
    });

    fgRef.current.graphData({ nodes: mergedNodes, links: mergedLinks });

    if (prevNodeCountRef.current <= 1 && nodes.size > 1) {
      requestAnimationFrame(() => {
        fgRef.current?.zoomToFit?.(800, 56);
      });
    }
    prevNodeCountRef.current = nodes.size;
  }, [nodes, edges]);

  return (
    <div className="graph-black-surface relative h-full w-full overflow-hidden">
      <div 
        ref={mountRef} 
        className={`absolute inset-0 h-full w-full transition-opacity duration-1000 ${nodeList.length <= 1 ? 'opacity-0' : 'opacity-100'}`} 
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(132,85,255,0.08)_0%,rgba(2,5,11,0)_24%)]" />
      {!initError && nodeList.length <= 1 ? (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center px-6">
          <div className="pointer-events-auto flex flex-col items-center gap-5 text-center">
            {seedOrPrimaryNode ? (
              <button
                type="button"
                onClick={() => selectNode(seedOrPrimaryNode)}
                className="flex h-20 w-20 items-center justify-center rounded-full border text-center shadow-[0_18px_48px_rgba(168,85,247,0.16)] transition-transform duration-200 hover:scale-105"
                style={{
                  background:
                    "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.14) 0%, rgba(168,85,247,0.92) 42%, rgba(70,26,120,0.98) 100%)",
                  borderColor: "rgba(168, 85, 247, 0.38)",
                  color: "#f5ebff",
                }}
              >
                <span className="px-2 font-['Space_Grotesk'] text-[10px] font-semibold uppercase tracking-[0.08em]">
                  {seedOrPrimaryNode.label}
                </span>
              </button>
            ) : (
              <div className="h-3 w-3 rounded-full bg-[#8ff3e1] shadow-[0_0_16px_rgba(143,243,225,0.42)]" />
            )}
            <div className="max-w-md rounded-[20px] border border-white/8 bg-[rgba(7,10,18,0.86)] px-5 py-4 shadow-[0_24px_72px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <p className="font-['IBM_Plex_Sans'] text-sm text-[#cdd5f6]">
                {discoveryFailed
                  ? status
                  : seedOrPrimaryNode
                    ? "The session only has the seed node so far. The discovery pipeline has not expanded the graph yet."
                    : "No graph nodes have reached the frontend yet."}
              </p>
              <p className="mt-2 font-mono text-xs text-[#67729e]">
                nodes {nodeList.length} · edges {edges.length}
                {status ? ` · ${status}` : ""}
              </p>
            </div>
          </div>
        </div>
      ) : null}
      {initError ? (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 z-30 -translate-y-1/2 px-6">
          <p className="mx-auto max-w-xl rounded-[24px] border border-white/10 bg-[rgba(19,24,46,0.88)] px-5 py-4 text-center font-['IBM_Plex_Sans'] text-sm text-[#d9e0ff] backdrop-blur-xl">
            {initError}
          </p>
        </div>
      ) : null}
    </div>
  );
}
