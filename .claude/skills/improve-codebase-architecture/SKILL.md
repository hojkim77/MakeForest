---
name: improve-codebase-architecture
description: Find deepening opportunities in the MakeForest codebase. Use when the user wants to improve architecture, find refactoring opportunities, consolidate tightly-coupled modules, or make a codebase more testable. Informed by domain language in CLAUDE.md files and decisions in docs/adr/.
---

# Improve Codebase Architecture

Surface architectural friction and propose **deepening opportunities** — refactors that turn shallow modules into deep ones. The aim is testability and AI-navigability.

## MakeForest Context

**Read these files before exploring** — domain language and invariants live here (replaces CONTEXT.md):

- `CLAUDE.md` — project-wide rules and invariants
- `apps/web/CLAUDE.md` — frontend component/store boundaries
- `apps/web/app/(main)/_components/panel/CLAUDE.md` — panel area
- `apps/web/app/(main)/_components/map/CLAUDE.md` — map area
- `apps/server/CLAUDE.md` — timer/watering API
- `apps/server/src/cron/CLAUDE.md` — midnight batch / fossil / forest accumulation
- `packages/db/CLAUDE.md` — DB schema / data model
- `packages/redis/CLAUDE.md` — Redis real-time state

Also check `docs/adr/` if ADRs exist.

## MakeForest-Specific Friction Targets

Explicitly check for these patterns during Explore:

### Dual Write
Prisma write immediately followed by a Redis write with no rollback if either fails. Logic scattered across both stores with no atomicity guarantee.

### SSE Timing
Broadcast ordering relative to mutations is not guaranteed. Clients that connect immediately after a mutation may miss the event.

### Client-side Time
`new Date()` or time calculations happening outside the server (client components, util functions). Project invariant: **time is server-authoritative**.

### KST Boundary Handling
KST 00:00 reset logic computed outside the server, or KST conversion duplicated across multiple files.

### Evolution Threshold Scatter
Creature evolution stage (0–9) thresholds or logic spread across files other than `water.logic.ts`.

### Auth Boundary Leak
Unauthenticated user blocking enforced only in the UI, not on the server.

### Shallow Modules
Pass-throughs where the interface is nearly as complex as the implementation. Apply the deletion test: if removing the module scatters complexity across callers, it earned its place. If complexity vanishes, it was shallow.

---

## Glossary

Use these terms exactly in every suggestion. Don't drift into "component," "service," "API," or "boundary."

- **Module** — anything with an interface and an implementation (function, class, package, slice).
- **Interface** — everything a caller must know to use the module: types, invariants, error modes, ordering, config. Not just the type signature.
- **Implementation** — the code inside.
- **Depth** — leverage at the interface: a lot of behaviour behind a small interface. **Deep** = high leverage. **Shallow** = interface nearly as complex as the implementation.
- **Seam** — where an interface lives; a place behaviour can be altered without editing in place. (Use this, not "boundary.")
- **Adapter** — a concrete thing satisfying an interface at a seam.
- **Leverage** — what callers get from depth.
- **Locality** — what maintainers get from depth: change, bugs, knowledge concentrated in one place.

Key principles:

- **Deletion test**: imagine deleting the module. If complexity vanishes, it was a pass-through. If complexity reappears across N callers, it was earning its keep.
- **The interface is the test surface.**
- **One adapter = hypothetical seam. Two adapters = real seam.**

---

## Process

### 1. Explore

Read the CLAUDE.md files listed in the MakeForest Context section and any ADRs first.

Then use the Agent tool with `subagent_type=Explore` to walk the codebase. Don't follow rigid heuristics — explore organically and note where you experience friction:

- Where does understanding one concept require bouncing between many small modules?
- Where are modules **shallow** — interface nearly as complex as the implementation?
- Where have pure functions been extracted just for testability, but the real bugs hide in how they're called (no **locality**)?
- Where do tightly-coupled modules leak across their seams?
- Which parts of the codebase are untested, or hard to test through their current interface?

Explicitly check each pattern listed in MakeForest-Specific Friction Targets above.

Apply the **deletion test** to anything you suspect is shallow.

### 2. Present candidates as an HTML report

Write a self-contained HTML file to the OS temp directory so nothing lands in the repo. Resolve the temp dir from `$TMPDIR`, falling back to `/tmp`. Write to `<tmpdir>/architecture-review-<timestamp>.html` so each run gets a fresh file. Open it for the user — `open <path>` on macOS — and tell them the absolute path.

The report uses **Tailwind via CDN** for layout and styling, and **Mermaid via CDN** for diagrams where a graph/flow/sequence reliably communicates the structure. Mix Mermaid with hand-crafted CSS/SVG visuals — use Mermaid when relationships are graph-shaped (call graphs, dependencies, sequences), and hand-built divs/SVG when you want something more editorial. Each candidate gets a **before/after visualisation**.

For each candidate, render as a card:

- **Files** — which files/modules are involved
- **Problem** — why the current architecture is causing friction
- **Solution** — plain English description of what would change
- **Benefits** — explained in terms of locality and leverage, and how tests would improve
- **Before / After diagram** — side-by-side, illustrating the shallowness and the deepening
- **Recommendation strength** — one of `Strong`, `Worth exploring`, `Speculative`, rendered as a badge

End the report with a **Top recommendation** section: which candidate you'd tackle first and why.

**Use CLAUDE.md vocabulary for the domain, and Glossary vocabulary for the architecture.**

**ADR conflicts**: if a candidate contradicts an existing ADR, only surface it when the friction is real enough to warrant revisiting. Mark it clearly in the card (e.g. a warning callout: _"contradicts ADR-0007 — but worth reopening because…"_).

Do NOT propose interfaces yet. After the file is written, ask the user: "Which of these would you like to explore?"

### 3. Grilling loop

Once the user picks a candidate, drop into a design conversation. Walk the design tree with them — constraints, dependencies, the shape of the deepened module, what sits behind the seam, what tests survive.

Side effects happen inline as decisions crystallize:

- **Naming a deepened module after a concept not in any CLAUDE.md?** Add the term to the appropriate CLAUDE.md. Create the file lazily if it doesn't exist.
- **Sharpening a fuzzy term during the conversation?** Update the relevant CLAUDE.md right there.
- **User rejects the candidate with a load-bearing reason?** Offer an ADR: _"Want me to record this as an ADR so future architecture reviews don't re-suggest it?"_ Only offer when the reason would actually be needed by a future explorer — skip ephemeral reasons ("not worth it right now") and self-evident ones.
