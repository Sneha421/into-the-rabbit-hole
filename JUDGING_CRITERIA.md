# JUDGING_CRITERIA.md — Rabbit Hole Discoverer
# Win Strategy · TinyFish SG Hackathon · March 28, 2025 · NUS Cinnamon Wing

> This file is your competitive bible. Read it before every decision.
> Every feature, every demo beat, every sentence of copy must be traceable
> back to a scoring criterion or a prize definition below.

---

## THE PRIZES WE ARE TARGETING (ranked by priority)

| Priority | Prize | What it requires |
|----------|-------|-----------------|
| 1 | 🌊 **Deep Sea Architect** | Technical elegance + "Aha!" moment. Solves a massive, positive problem using the Open Web in a way that feels like magic. |
| 2 | 🦄 **Most Likely to Be the Next Unicorn** | Best product vision and PMF (Product-Market Fit). |
| 3 | 🥉 **3rd Place** ($5,000 OpenAI credits + Logitech MX Master + 1 month TinyFish Pro + Golden Ticket) | Technical complexity, utility, live web. Top 3 overall. |
| 4 | 🥈 **2nd Place** ($7,500 credits + Keychron + 3 months TinyFish Pro + Golden Ticket) | Stretch goal. Same criteria, higher bar. |

**The Golden Ticket** — all top-3 winners get direct entry to TinyFish Accelerator Phase 2,
a 9-week program with a path to $2M seed funding from Mango Capital.
Every feature we ship increases the chance of landing it.

---

## OFFICIAL JUDGING DIMENSIONS (main prizes)

Derived from the hackathon brief. Judges will score on these axes.
Map every build decision back to one of these.

### 1. TECHNICAL COMPLEXITY ★★★★★ (highest weight)

> "We value technical complexity, utility, and agents that can handle the 'messy' parts of the internet."

**What earns points:**
- Multi-step agentic workflows, not a single API call
- Handling dynamic pages, pagination, anti-bot systems via TinyFish
- Running agents in parallel (asyncio.gather across multiple TinyFish runs)
- Graph algorithms (PageRank, Betweenness, Eigenvector, Louvain, HITS, Dijkstra) running live
- Real-time WebSocket streaming of graph updates as agents work
- Embeddings + vector search (ChromaDB) for Study Mode RAG
- The six-algorithm Ranker Agent working on a live, growing graph

**What loses points (hard disqualifiers):**
- ❌ Simple text summarizers or chatbots over a database
- ❌ Basic RAG that doesn't interact with the live web
- ❌ Thin wrappers that add UI over an existing API
- ❌ Anything that doesn't NEED a web agent to function

**Our answer to every disqualifier:**
- ✅ TinyFish visits real web pages in real time — not cached, not static
- ✅ NetworkX graph algorithms run over live-extracted knowledge
- ✅ Multi-agent pipeline: Scout → Analyst → Ranker → Study, all async
- ✅ Remove TinyFish and the entire product collapses — it is load-bearing

---

### 2. UTILITY & REAL-WORLD VALUE ★★★★☆

> "Solve a hard, real-world problem using the Open Web as your database."
> "Workflows that currently cost companies hours of manual labor every day."

**Our utility argument — rehearse this:**

> "Today, if you want to deeply understand a topic — a company, a market, a historical
> event, a piece of culture — you spend 6 hours in browser tabs. Wikipedia, academic
> papers, YouTube rabbit holes, Reddit threads. You manually connect the dots.
> Rabbit Hole Discoverer does that in 90 seconds, surfaces connections you'd never
> find, and lets you ask questions about what it found using your own notes."

**Target users with clear willingness to pay:**
- Journalists doing background research (hours → minutes)
- Investment analysts doing rapid sector mapping
- Students and academics doing literature surveys
- Podcast researchers building episode outlines
- Screenwriters doing historical/cultural research

**In the demo, name a user type. Don't be abstract.**

---

### 3. LIVE WEB DEPTH ★★★★☆

> "The test is simple: if your application can be built without a web agent navigating
> real websites, it's not a fit."

**Our evidence that TinyFish is essential:**
- Scout Agent submits 6 Google searches to TinyFish per topic
- Each search: TinyFish navigates real Google results, extracts organic URLs + snippets
- Top 2 results per search: TinyFish visits and extracts full page body text
- All runs are async — up to 12 TinyFish browser sessions running in parallel
- "Fall Deeper" on any node re-runs the full TinyFish pipeline on that node's label
- Every node's `source_url` links back to the live page TinyFish visited

**In the demo: show the TinyFish dashboard URL where judges can see the live runs.
That is irrefutable proof of real web usage.**

---

### 4. PRODUCT VISION & PMF ★★★☆☆ (doubles as Unicorn prize criterion)

> "Software that could become a real revenue-making business, not just a demo."

**The business case in 30 seconds:**
- $0 to $29/month: unlimited curiosity. Personal plan.
- $99/month: teams. Shared graphs, collaborative Study Mode. Research firms, agencies.
- $499/month: API access. Embed Rabbit Hole graph generation into other tools.
- Enterprise: custom depth limits, private graph storage, SSO.

**Comparable exits (mention in pitch if asked):**
- Notion ($10B) — personal knowledge. We add the web layer.
- Roam Research ($9M ARR) — bi-directional links. We generate them automatically.
- Perplexity ($9B) — web search + AI. We go deeper and visualise the knowledge universe.

**The unicorn angle:**
> "Every knowledge worker, student, and researcher is the user.
> The web never stops changing, so the graph never gets stale.
> TinyFish is the moat — no static dataset can replicate live-crawled, user-personalised knowledge graphs."

---

## SPOT PRIZE CRITERIA — DEEP SEA ARCHITECT 🌊

> "Technical elegance + 'Aha!' moment. For the team that solves a massive, positive
> problem using the Open Web in a way that feels like magic."

**Three elements required. All three must land:**

### Element 1: Technical Elegance

Elegance means the solution is powerful AND the architecture is clean. Judges who look at the code should say "oh, that's clever."

**What makes our architecture elegant:**
- One `GraphStore` class owns all state. Agents never touch `self.G` directly.
- `GraphDelta` is a typed Pydantic model — no raw dicts cross agent boundaries.
- `asyncio.gather` runs all TinyFish searches in parallel — the graph grows in waves, not linearly.
- WebSocket streams deltas in real time — the frontend doesn't poll.
- Six graph algorithms in one `compute_all` call, each fail-safe with try/except.
- The composite `rabbit_hole_score` (0.40 × PageRank + 0.35 × Betweenness + 0.25 × Eigenvector) drives what to expand next — it's a principled formula, not a random choice.

**Talk about the architecture in the demo. Point at the agent pipeline.**

### Element 2: The "Aha!" Moment

This is the magic the judge feels. It must be visceral and happen within 90 seconds.

**Script the "Aha!" moment precisely:**
1. Judge types "Parasite (2019)" → presses Enter.
2. StatusPill flashes: "🔭 Scout hunting: Parasite (2019)..." in cyan.
3. The 3D graph spirals into existence — black void, nodes glowing, particles streaming.
4. Pause. Let silence do the work.
5. Say: *"Every node that just appeared was live-crawled from the web 30 seconds ago.
   The size is its PageRank. The colour is its community cluster. Watch the particles —
   that's the direction of influence."*
6. Click "Bong Joon-ho". Hover card appears instantly.
7. Say: *"Betweenness centrality flagged him as a bridge node — remove him and three
   clusters disconnect. The algorithm found that. We didn't hardcode it."*
8. That is the "Aha!" — a human insight, surfaced by math, visualised as a universe.

### Element 3: Massive, Positive Problem

Curiosity is universal. The inability to see how ideas connect costs humanity billions of
hours of duplicated research, isolated knowledge, missed connections.

**Frame it this way in the pitch:**
> "Every discipline reinvents the wheel because no one can see the full map of what's
> already been thought. We're building the map. For every topic. From the live web.
> In 90 seconds."

---

## SPOT PRIZE CRITERIA — MOST LIKELY TO BE THE NEXT UNICORN 🦄

> "Awarded for the best product vision and PMF (Product-Market Fit)."

### PMF Evidence — Prepare These Talking Points

**Pain is real and widespread:**
- Google "how to do deep research" — millions of results. People hate doing it manually.
- Academic researchers spend 30–40% of time on literature review. That's not research, that's navigation.
- OSINT analysts, journalists, and financial analysts are paying $500–$2,000/month for inferior tools.

**We can charge from day one:**
- Freemium: 3 rabbit holes/month free. Converts to paid on the 4th.
- No sales motion needed — self-serve, instant value, viral sharing ("look at this graph I made").

**Network effects:**
- Shared graphs are public by default. Each graph is a marketing asset.
- More users → more graph templates → more reasons for others to sign up.

**Defensibility:**
- The graph schema + TinyFish integration + 6-algorithm scoring is a 3-month head start.
- Proprietary graph storage (post-hackathon: move from in-memory to persistent graph DB).
- Fine-tuned Analyst Agent on domain-specific data becomes a moat.

### The Unicorn Pitch (30-second version)

> "Knowledge management is a $47B market and it's been static for 20 years.
> Notion gave us structure. Obsidian gave us links. We give you the web.
> One search query, 90 seconds, and you have a living knowledge graph of everything
> that matters about your topic — sourced from the live internet, scored by six
> graph algorithms, personalised by your own notes.
> The web has always been the world's largest knowledge base.
> We're the first product that treats it that way."

---

## DEMO SCRIPT — OPTIMISED FOR ALL THREE PRIZES

**Total demo time: 5 minutes. Not a second more.**
**One person presents. One person runs the keyboard. Rehearse 5 times.**

### Minute 0:00–0:30 — The Hook (Unicorn PMF setup)

> "Six hours. That's how long it takes a journalist to do background research for one story.
> A PhD student to map a new field. An analyst to understand a competitor.
> We built Rabbit Hole. It takes 90 seconds."

Open laptop. Home page already up. Typed nothing yet.

### Minute 0:30–1:30 — The Live Demo (Deep Sea Architect "Aha!")

Type "Parasite (2019)". Press Enter.

> "TinyFish is running 6 browser sessions right now against the live web.
> Not cached. Not Wikipedia. The actual open internet."

StatusPill is cycling. Graph nodes start appearing.

> "Every node you see just came off a real webpage in the last 20 seconds."

Point to node sizes.

> "Node size is PageRank. That gold node in the centre? The Korean New Wave cinema
> movement. The algorithm decided it, not us."

Point to clusters.

> "Six colours, six communities. Louvain community detection found these thematic
> groups automatically. We just visualise them."

### Minute 1:30–2:30 — Depth (Technical Complexity)

Click "Bong Joon-ho".

> "Betweenness centrality: 0.847. Highest in the graph.
> That means remove this node and the film-studies cluster and the economics cluster
> stop talking to each other. The algorithm knows he's the bridge."

Click "Fall Deeper →".

> "Scout re-runs. Analyst extracts. Ranker re-scores. The graph expands one layer deeper.
> This is the recursive rabbit hole. It goes as deep as you want."

Watch the graph grow.

### Minute 2:30–3:30 — Study Mode (Utility argument)

Open Study Mode drawer.

> "Now I'm a film studies student. I've got three weeks of notes."

Drag in a PDF.

> "✓ 42 chunks ingested · 7 nodes linked."

Point at amber nodes now glowing in the graph.

> "Those amber pulses are nodes that appear in my notes. My knowledge, mapped
> onto the web's knowledge. RAG scoped to a graph, not a flat document."

Type a question: "What does Bong say about capitalism in his early work?"

> "The answer comes from my notes, grounded in the graph. Your knowledge plus
> the web's knowledge. No hallucinations — it can only answer from what's here."

### Minute 3:30–4:30 — Business Case (Unicorn setup)

> "This isn't a demo. It works on any topic. Watch."

Type "Dark Side of the Moon". Let graph start loading.

> "Same pipeline. Different universe. Pink Floyd's influence network, Abbey Road,
> Hipgnosis, Roger Waters' solo career — all emerging from the live web."

Switch back to Parasite graph.

> "We see three user types willing to pay from day one:
> Journalists — $29/month, infinite research capacity.
> Research teams — $99/month, shared graphs, collaborative notes.
> Platforms who want to embed this — $499/month API access.
> The web never stops changing. The graph never gets stale.
> That's the subscription."

### Minute 4:30–5:00 — The Close

> "Every topic is a universe.
> For the first time, you can see the whole thing.
> Rabbit Hole."

Silence. Don't explain further.

---

## WHAT TO SHOW ON THE GITHUB README

Judges will look. It must answer three questions in 10 seconds:
1. What does it do? (one sentence, no jargon)
2. What's the technical stack? (diagram or bullet list)
3. How does TinyFish power it? (explicit call-out)

**README structure:**

```
# Rabbit Hole Discoverer
> Fall deeper. See everything.

Turn any topic into a living 3D knowledge graph — sourced from the live web
in real time by TinyFish, reasoned over by OpenAI, scored by six NetworkX
graph algorithms, and rendered as a universe you can explore.

## How it works
[Agent pipeline diagram: TinyFish → Scout → Analyst → Ranker → Graph → Frontend]

## TinyFish powers everything
- 6 parallel browser sessions per topic, navigating real Google search results
- Page content extracted by TinyFish's goal-driven web agent
- No cached data. No static datasets. The live open web, every time.

## Tech stack
Backend: FastAPI · Python · NetworkX · ChromaDB · OpenAI · TinyFish
Frontend: Next.js 14 · Three.js · 3d-force-graph · Zustand · Framer Motion

## Demo
[2-minute demo video link]
```

---

## RISK REGISTER — THINGS THAT COULD LOSE US THE PRIZES

| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| TinyFish runs are slow (>2min per topic) | Medium | Pre-run demo topics before judging. Have cached session_ids ready. |
| Google blocks TinyFish searches | Medium | Switch `_queue_search` to Bing URL. Test both before 04:00. |
| Graph has <10 nodes (poor extraction) | Low | Tune `SEARCH_GOAL` prompt. Increase `max_results` to 8. |
| 3D graph crashes browser | Low | Test on judge's laptop browser (Chrome). Have Firefox backup. |
| Demo runs over 5 minutes | High | Rehearse 5x. Cut Study Mode if tight — lead with the graph. |
| Judges don't see TinyFish running | High | Open TinyFish dashboard in a second tab. Show live runs. |
| Study Mode PDF upload fails | Medium | Pre-upload before demo. Keep a backup `.txt` file. |
| "But this is just a knowledge graph tool" objection | Medium | Counter: "Name one tool that builds it live from the web, scored by 6 graph algorithms, in 90 seconds." |

---

## PRE-DEMO CHECKLIST (run at 03:30 PM, 30 min before code freeze)

- [ ] Backend running: `uvicorn main:app --reload --port 8000` — no errors
- [ ] Frontend running: `npm run dev` — no TypeScript errors
- [ ] Pre-run "Parasite (2019)" → session_id saved → graph has 20+ nodes
- [ ] Pre-run "Dark Side of the Moon" → session_id saved → graph has 20+ nodes
- [ ] Pre-run "The Zodiac Killer" → session_id saved → graph has 20+ nodes
- [ ] TinyFish dashboard open in second browser tab — shows completed runs
- [ ] Study Mode PDF pre-uploaded to Parasite session — amber nodes visible
- [ ] NodeHoverCard opens on click — shows betweenness score
- [ ] "Fall Deeper" works — graph expands
- [ ] GitHub README committed with demo video link
- [ ] Demo script printed. Both team members have read it. Roles assigned.
- [ ] Timer on phone. 5-minute hard limit rehearsed.

---

## THE ONE-SENTENCE ANSWER TO EVERY JUDGE QUESTION

| Judge asks | You say |
|-----------|---------|
| "What does it do?" | "It turns any topic into a living knowledge graph built from the live web in 90 seconds." |
| "How is this different from Perplexity?" | "Perplexity gives you a flat answer. We give you the entire network of connected ideas, scored, clustered, and explorable." |
| "Why do you need TinyFish?" | "Every node in that graph came from a real webpage TinyFish navigated. Remove TinyFish, there's no product." |
| "Who pays for this?" | "Journalists, researchers, analysts — anyone who currently spends hours doing this manually." |
| "What's the moat?" | "The combination of live web crawling, six graph algorithms, and personalised note embedding. That's a three-month head start minimum." |
| "Is this just a visualisation tool?" | "No. The graph is queryable via your own notes. It's a research workspace, not a pretty picture." |

---

*JUDGING_CRITERIA.md v1 — Built to Win*
*Targets: 3rd Place + Deep Sea Architect + Most Likely to Be the Next Unicorn*
*TinyFish SG Hackathon · March 28, 2025 · NUS Cinnamon Wing*
*Fall deeper. See everything.*
