# BRAND_GUIDELINES.md — Rabbit Hole Discoverer
# Design System for Codex · Every rule here is a build instruction, not a suggestion.

> Read this file in full before writing any frontend component.
> Every colour, font, animation, and copy choice here is final.
> Do not substitute values. Do not invent new colours.
> Reference the CSS variables defined below everywhere.

---

## BRAND IN ONE SENTENCE

Rabbit Hole Discoverer is what it feels like to have been reading Wikipedia for six hours —
rendered as a cosmos you fell into.

**Tagline (primary):** Fall deeper. See everything.
**Tagline (secondary):** Every topic is a universe.

---

## GLOBAL CSS VARIABLES

Add this block to `frontend/app/globals.css` as the very first thing.
Every component must use these variables. No inline hex codes anywhere except inside
the CLUSTER_COLORS JavaScript map (which mirrors these values).

```css
:root {
  /* Backgrounds */
  --void:          #000000;
  --deep-space:    #03010a;
  --nebula-dark:   #0a0318;
  --event-horizon: #1a0533;

  /* Text */
  --text-primary:   #ffffff;
  --text-secondary: #e8e0ff;
  --text-muted:     rgba(232, 224, 255, 0.45);

  /* Accent colours — also used as cluster node colours */
  --gold:   #f5c842;   /* cluster 0 — seed/core */
  --violet: #9b4dff;   /* cluster 1 — creator/person */
  --cyan:   #00f5e4;   /* cluster 2 — works/artefacts */
  --teal:   #00c9a7;   /* cluster 3 — concepts/themes */
  --amber:  #ff8c42;   /* cluster 4 — events/history */
  --blue:   #4d7cff;   /* cluster 5 — places */
  --red:    #ff3d6e;   /* alerts and errors only */

  /* Surfaces */
  --surface-card:   rgba(26, 5, 51, 0.90);
  --surface-panel:  rgba(10, 3, 24, 0.85);
  --border-ghost:   rgba(255, 255, 255, 0.07);
  --border-active:  rgba(255, 255, 255, 0.18);

  /* Glows (for box-shadow) */
  --glow-gold:   0 0 24px rgba(245, 200, 66, 0.55),  0 0 80px rgba(245, 200, 66, 0.15);
  --glow-cyan:   0 0 24px rgba(0, 245, 228, 0.45),   0 0 80px rgba(0, 245, 228, 0.12);
  --glow-violet: 0 0 24px rgba(155, 77, 255, 0.45),  0 0 80px rgba(155, 77, 255, 0.12);
  --glow-amber:  0 0 24px rgba(255, 132, 66, 0.45),  0 0 80px rgba(255, 132, 66, 0.12);
}
```

---

## CLUSTER → COLOUR MAP (JavaScript)

Copy this object into every component that colours nodes.
Index is `node.cluster_id % 6`. Do not change these values.

```typescript
export const CLUSTER_COLORS: Record<number, string> = {
  0: "#f5c842",   // Gravitational Gold — seed cluster
  1: "#9b4dff",   // Quasar Violet      — creator/person cluster
  2: "#00f5e4",   // Pulsar Cyan        — works/artefacts cluster
  3: "#00c9a7",   // Nebula Teal        — concept/theme cluster
  4: "#ff8c42",   // Cosmic Amber       — event/history cluster
  5: "#4d7cff",   // Wormhole Blue      — place cluster
};
```

---

## TYPOGRAPHY

### Font Stack

Load these fonts via Google Fonts in `frontend/app/layout.tsx`.

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link
  href="https://fonts.googleapis.com/css2?
    family=Space+Grotesk:wght@400;500;600;700&
    family=IBM+Plex+Sans:wght@400;500&
    family=JetBrains+Mono:wght@400;500&
    display=swap"
  rel="stylesheet"
/>
```

### Type Roles

| Role           | Font           | Weight | Usage |
|----------------|----------------|--------|-------|
| Display        | Space Grotesk  | 200    | Hero wordmark "RABBIT HOLE" |
| UI Heading     | Space Grotesk  | 600    | Node labels, section headers |
| Body           | IBM Plex Sans  | 400    | Summaries, descriptions, panel text |
| Monospace      | JetBrains Mono | 400    | All scores, IDs, metadata, Q&A output |
| Label / Badge  | Space Grotesk  | 500    | Node type badges, tags, status pill |

### Typography Rules

- Display wordmark: letter-spacing 0.15em, all caps, weight 200 or 300
- Never use system fonts (Arial, Inter, Roboto, sans-serif alone)
- Body text colour is always `var(--text-secondary)` — never pure white except headings
- All numerical scores render in JetBrains Mono
- Tags are always lowercase kebab-case

---

## CANVAS BACKGROUND

Apply to the `<main>` element of the graph page. This is the space environment.

```css
.graph-canvas-bg {
  background:
    /* Micro star field — small random dots */
    radial-gradient(1px 1px at 15% 25%, rgba(255,255,255,0.35) 0%, transparent 100%),
    radial-gradient(1px 1px at 75% 60%, rgba(255,255,255,0.25) 0%, transparent 100%),
    radial-gradient(1px 1px at 45% 80%, rgba(255,255,255,0.20) 0%, transparent 100%),
    /* Nebula colour wash — violet left, cyan right */
    radial-gradient(ellipse at 25% 65%, rgba(155, 77, 255, 0.07) 0%, transparent 55%),
    radial-gradient(ellipse at 75% 35%, rgba(0, 245, 228, 0.05) 0%, transparent 55%),
    /* Deep space gradient */
    radial-gradient(ellipse at 50% 50%, #0a0318 0%, #03010a 50%, #000000 100%);

  animation: nebula-drift 25s ease-in-out infinite;
}

@keyframes nebula-drift {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
```

---

## THREE.JS GRAPH CONFIGURATION

Copy these exact values into `GraphCanvas.tsx`. Do not change them without testing.

```typescript
// Node size: PageRank drives radius. Seed node is always biggest.
.nodeVal((n: any) => 2 + (n.pagerank ?? 0) * 60)

// Node colour: cluster drives hue, betweenness drives brightness
.nodeColor((n: any) => CLUSTER_COLORS[n.cluster_id % 6] ?? "#ffffff")

// Node opacity: deeper nodes fade slightly
.nodeOpacity((n: any) => Math.max(0.6, 1 - (n.depth ?? 0) * 0.12))

// Edge appearance
.linkColor(() => "rgba(255, 255, 255, 0.10)")
.linkWidth((l: any) => (l.weight ?? 0.5) * 3)

// Directional particles — show information flow
.linkDirectionalParticles((l: any) => Math.round((l.weight ?? 0.5) * 5))
.linkDirectionalParticleSpeed(0.004)
.linkDirectionalParticleColor(() => "#00f5e4")  // always Pulsar Cyan

// Background
.backgroundColor("#000000")

// Post-processing bloom (add UnrealBloomPass if using Three.js EffectComposer)
// strength: 2.0, radius: 0.75, threshold: 0.1
// This makes high-PageRank nodes glow intensely against the void.
```

---

## ANIMATION KEYFRAMES

Add all of these to `frontend/app/globals.css`.

```css
/* Node entry — fades in with a brief scale bounce */
@keyframes node-entry {
  0%   { opacity: 0; transform: scale(0.4); }
  70%  { opacity: 1; transform: scale(1.08); }
  100% { opacity: 1; transform: scale(1); }
}

/* Breathing pulse — all nodes breathe slowly */
@keyframes node-breathe {
  0%, 100% { filter: brightness(1.0); }
  50%       { filter: brightness(1.25); }
}

/* Discovery flash — fires once when a new high-score node appears */
@keyframes discovery-flash {
  0%   { box-shadow: 0 0 0px 0px rgba(245, 200, 66, 0.9); }
  40%  { box-shadow: 0 0 40px 20px rgba(245, 200, 66, 0.4); }
  100% { box-shadow: 0 0 0px 0px rgba(245, 200, 66, 0); }
}

/* Status pill entrance */
@keyframes pill-in {
  from { opacity: 0; transform: translateY(-10px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Search bar shrink — fires when user submits a topic */
@keyframes bar-shrink {
  from { width: 100%; opacity: 1; }
  to   { width: 0%;   opacity: 0; }
}
```

### Transition Timings Reference

| Interaction             | Duration | Easing |
|-------------------------|----------|--------|
| Node hover card appear  | 150ms    | ease-out |
| Node hover card dismiss | 100ms    | ease-in |
| Panel slide in/out      | 300ms    | cubic-bezier(0.4, 0, 0.2, 1) |
| Graph layout reflow     | 800ms    | spring |
| Status pill cycle       | 200ms    | ease-out |
| Page transition         | 400ms    | ease-in-out |

---

## COMPONENT SPECIFICATIONS

### Search Bar (Home Page)

```
Visual structure:
┌──────────────────────────────────────────────────┐
│  🕳️   [placeholder animation]        [FALL IN]  │
└──────────────────────────────────────────────────┘
```

- Full width max-w-2xl, centred horizontally and vertically on the page
- Background: `var(--surface-panel)` with backdrop-blur-xl
- Border: 1px `var(--border-ghost)`, transitions to `1px solid var(--gold)` on focus
- Box-shadow on focus: `var(--glow-gold)`
- Submit button text: "FALL IN" — monospaced, uppercase, letter-spacing 0.1em
- Submit button background: `var(--gold)`, text colour `#000`
- Placeholder cycles via JavaScript `setInterval` every 2000ms through:
  "a film…" → "a true crime case…" → "an album…" → "a book…" → "a decade…" → "a person…"
- On submit: bar animates out (opacity 0, scale 0.95, 300ms) before route push

### Demo Topic Pills

Three clickable pills below the search bar:
- "Parasite (2019)"
- "Dark Side of the Moon"
- "The Zodiac Killer"

Each pill:
- Border: 1px `var(--border-ghost)`
- Background: transparent → `rgba(255,255,255,0.05)` on hover
- Text: `var(--text-muted)` → `var(--text-secondary)` on hover
- Transition: 150ms
- On click: fills search input value AND triggers submit

### Node Hover Card

```
┌─────────────────────────────────────────────┐
│  [TYPE BADGE]                    PR 0.847   │
│                                             │
│  Node Label                    (year)       │
│  ─────────────────────────────────────────  │
│  Two sentence summary about this node,      │
│  written to make you curious.               │
│                                             │
│  #tag-one   #tag-two   #tag-three           │
│                                             │
│  [  Fall Deeper →  ]  [📓]  [✕]            │
└─────────────────────────────────────────────┘
```

- Position: fixed, bottom-8 right-8
- Width: w-80 (320px)
- Background: `var(--surface-card)` with backdrop-blur-xl
- Border: `1px solid {clusterColor}44` (cluster colour at 26% opacity)
- Box-shadow: `0 0 30px {clusterColor}22`
- Type badge: cluster colour background at 13% opacity, cluster colour text
- PR score: JetBrains Mono, `var(--text-muted)`
- Label: Space Grotesk 600, white
- Year: Space Grotesk 400, white/40
- Summary: IBM Plex Sans, `var(--text-secondary)` at 70%
- Tags: `rgba(255,255,255,0.05)` background, `var(--text-muted)` text, rounded-full
- "Fall Deeper" button: cluster colour background, black text, flex-1
- 📓 button: shown only when `node.has_user_notes === true`
- Entry animation: scale 0.95 → 1.0, opacity 0 → 1, 150ms ease-out

### Status Pill

```
  ● Scout agent is hunting: Parasite (2019)...
```

- Position: fixed top-4, horizontally centred
- Background: `var(--surface-panel)` with backdrop-blur-md
- Border: 1px `var(--border-ghost)`
- Font: JetBrains Mono 13px
- Dot colour + text colour by agent type:
  - Contains "Scout" or "hunting" → `var(--cyan)`
  - Contains "Analyst" or "mapping" → `var(--violet)`
  - Contains "Ranker" or "scoring" → `var(--gold)`
  - Contains "complete" → `var(--teal)`
  - Default → white
- Dot animation: `animate-pulse` (Tailwind built-in)
- Entry: fade + translateY(-8px → 0), 200ms
- Auto-dismiss: 4 seconds after status stops changing (use `useEffect` + `setTimeout`)

### Sidebar (Left — collapsed by default)

Toggle with a `⊞` icon button at left edge of screen.
When open, slides in from left (width 240px, `var(--surface-panel)` background).

Contains:
- "Depth" slider (1 to 4). Default: 2. Label above: "Exploration Depth"
- "Algorithm" display — read-only list of active algorithms with green dots:
  ● PageRank  ● Betweenness  ● Eigenvector  ● Louvain  ● HITS  ● Dijkstra
- "Layout" toggle: Force-Directed | Radial (switching calls `fgRef.current.dagMode(...)`)

<!-- Study Mode removed: study UI and related CSS intentionally omitted -->

---

## COPY GUIDELINES

### Tone Rules
- Curious and cosmic — never clinical or technical in user-facing text
- Use gravitational metaphors: orbit, fall, horizon, pull, singularity, depth
- Short sentences. No jargon in labels.
- Write like someone genuinely excited about rabbit holes

### Microcopy Reference

| Context | Write this | Never write this |
|---------|-----------|-----------------|
| Search placeholder | "a film…" | "Enter topic…" |
| Loading state | "Scout agent is hunting: [topic]" | "Loading…" |
| Graph complete | "Rabbit hole complete. Click any node to go deeper." | "Done." |
| Expand button | "Fall Deeper →" | "Load More" |
| Upload success | "✓ 42 chunks ingested · 7 nodes linked" | "Upload complete" |
| Error state | "Lost in the void. Trying another path…" | "Error occurred" |
| PageRank tooltip | "Gravitational pull — how much of the universe orbits this node" | "PageRank score" |
| Betweenness tooltip | "Bridge score — remove this node and clusters disconnect" | "Betweenness centrality" |
| Empty graph | "No rabbit holes found yet. Try going deeper." | "No results" |
| Session expired | "Your rabbit hole collapsed. Start a new one." | "Session expired" |

---

## LAYOUT & SPACING

Use Tailwind utility classes throughout. Key conventions:

- All panels: `backdrop-blur-xl` or `backdrop-blur-md`
- All cards: `rounded-xl` (12px radius)
- All buttons: `rounded-lg` (8px radius)
- Pill/badge elements: `rounded-full`
- Internal card padding: `p-4` or `p-5`
- Gap between action buttons: `gap-2`
- Default font size for body: `text-sm` (14px)
- Default font size for metadata/mono: `text-xs` (12px) or `text-[13px]`

---

## WHAT NOT TO DO

These are hard constraints. Violating them makes the product look like generic AI slop.

- Never use purple-on-white or white-on-light-grey colour schemes
- Never use Inter, Roboto, or Arial as the primary font
- Never use rounded sans-serif logos or pill-shaped primary buttons on the home screen
- Never show an empty state with just a spinner — always show agent status text
- Never use the word "analyzing" or "processing" in status messages
- Never add drop shadows to text
- Never use gradients on buttons (flat colours only)
- Never centre-align body text inside cards
- Never show raw node IDs to the user (always show the `label` field)
- Never render the graph on a white or light background

---

## THREE DEMO TOPICS — PRE-TEST THESE

Before the demo presentation, run all three through the full pipeline.
They should each produce 20–50 nodes across two expansion depths.

**"Parasite (2019)"**
Expected clusters: Korean New Wave, Class theory, Bong Joon-ho filmography, 1997 Asian financial crisis, Architecture/brutalism, Cannes history

**"Dark Side of the Moon"**
Expected clusters: Pink Floyd members, Abbey Road studios, Hipgnosis design studio, Roger Waters conflicts, Progressive rock era, Alan Parsons

**"The Zodiac Killer"**
Expected clusters: San Francisco 1960s, Cipher cryptography, Serial killer comparisons, True crime podcast ecosystem, Law enforcement failures, Primary sources

---

*BRAND_GUIDELINES.md v2 — Codex Design System Edition*
*TinyFish SG Hackathon · March 28, 2025 · NUS Cinnamon Wing*
*Fall deeper. See everything.*
