# autoui-solopreneur

> **A solopreneur finance dashboard whose GenUI learns from your feedback and grows its own catalog — a self-improvement stack + continual learning demo.**

Instead of answering money questions with walls of text, the assistant **assembles interactive UI** on the fly, **remembers which views you found useful**, and lets you **combine views into new ones it can then reuse**. The UI is generated, the preferences are learned, and the component catalog is open-ended.

---

## The core idea

```
You ask a finance question
        │
        ▼
Claude assembles json-render PANELS (not prose)  ──►  rendered live in the chat
        │
        ▼
You 👍 / 👎 each panel
        │
        ▼
Two-part memory is written:
  • declarative — the individual facts ("what happened")
  • procedural  — consolidated habit scores ("what became skill")
        │
        ▼
Future questions PREFER higher-scored panels  ──►  the system improves with use
        │
        ▼
You can COMBINE panels into a new custom panel
        │
        ▼
The new panel joins the catalog — Claude can pick it for later questions
```

In plain terms:

1. **Ask** a finance question in the chat (e.g. *"How are my taxes?"*, *"Am I going under?"*).
2. **Claude responds with panels, not text.** It calls a `showFinancePanels` tool that returns *structured JSON* naming which panels to show; those names resolve to [json-render](https://www.npmjs.com/package/@json-render/react) specs and render inline in the conversation. Different questions yield different panel combinations.
3. **You rate each panel** with thumb up / thumb down.
4. **Feedback becomes memory** in a way modeled on human memory:
   - **Declarative** — an append-only log of individual votes (`{ question, questionType, panel, vote, timestamp }`) — *what happened*, never edited.
   - **Procedural** — derived per-question-type scores (`{ questionType: { panel: score } }`) — *the consolidated skill*, recomputed from the declarative log on every vote.
5. **The system gets better.** Procedural scores are injected into the panel-selection prompt, so the assistant prefers panels you've found useful for similar questions.
6. **You grow the catalog.** A "+" button lets you select one or more existing panels and describe how to combine them; Claude generates a **new** panel spec from the existing primitives, saves it, and it becomes available to the chat tool and the catalog page.

This is a small, concrete demonstration of two ideas at once: a **self-improvement loop** (feedback → memory → better choices) and **continual learning of the UI surface itself** (the catalog grows from use).

---

## Architecture

The system is built around a **renderer-agnostic JSON UI spec**. A panel is just data — a flat tree of element keys, component types, and props — with no framework baked in.

| Layer | What it is | Where |
| --- | --- | --- |
| **Catalog** | Primitive component definitions + their prop schemas (Card, Stack, Grid, Metric, Badge, Text, BarGraph, LineGraph, ProgressBar, ListItem). The vocabulary. | `lib/catalog/finance-catalog.ts` |
| **Specs** | The 6 built-in panels as json-render specs (data only) that compose the primitives. | `lib/catalog/panels.ts` |
| **Registry** | React implementations of each primitive (Tailwind, theme-aware). The renderer. | `lib/catalog/finance-registry.tsx` |
| **Memory** | Two-part learned preferences (declarative facts + procedural scores). | `memory.json` (runtime data) |
| **Custom panels** | User-created panels from remixing existing ones. | `custom-panels.json` (runtime data) |

```
 catalog (vocabulary)  ─┬─►  json-render SPEC  ─►  React registry   ─►  web UI
                        │        (pure JSON)    └─►  Flutter registry ─►  native/Flutter UI
 panels + custom-panels ┘     the spec carries no framework assumptions
```

**Why renderer-agnostic matters:** because a panel is just a JSON spec interpreted by a registry, the *same* spec is rendered by different registries on different platforms — without changing the catalog, the memory, or the model prompts. This repo proves it: there are **two full renderers** — the Next.js web app and a **Flutter app** (`flutter/`, on the `flutter-renderer` branch) — both driven by the same backend "brain." See [Flutter app](#flutter-app--a-second-renderer-on-the-same-brain).

`memory.json` and `custom-panels.json` are **runtime data files, not source code** — the assistant writes to them through API routes, the same way it would write to a database.

### How a turn flows

- **Chat → panels:** `app/(chat)/api/chat/route.ts` runs the model with the `showFinancePanels` tool (`lib/ai/tools/show-finance-panels.ts`). The tool's `execute` resolves the chosen names (built-in or custom) to specs; `components/chat/finance-panels.tsx` renders them with the registry and shows the 👍/👎 controls.
- **Feedback → memory:** `app/(chat)/api/finance-feedback/route.ts` appends a declarative fact and recomputes procedural scores (`lib/memory/finance-memory.ts`).
- **Remix → catalog:** `app/(chat)/api/custom-panels/route.ts` asks Claude to combine selected specs into a new one (validated to use only existing primitives) and saves it (`lib/catalog/custom-panels.ts`).

---

## Key routes

| Route | What you see |
| --- | --- |
| **`/`** | The chat. Ask finance questions; Claude answers with panels you can rate. The "+" button in the composer opens the panel remixer. |
| **`/catalog-test`** | A gallery of every available panel (6 built-ins + your custom ones), rendered from their specs. |
| **`/memory`** | The two-part memory, visualized: a declarative timeline of votes on the left, consolidated procedural scores on the right — so you can see facts build into habits. |

A persistent left sidebar links **Chat**, **Catalog**, and **Memory**.

---

## Flutter app — a second renderer on the same brain

The `flutter/` folder (on the **`flutter-renderer`** branch) is a **full Flutter app** that reuses the **exact same backend** as the web app — it only calls the existing HTTP endpoints (`/api/chat`, `/api/finance-feedback`, `/api/custom-panels`, plus a read-only `/api/memory`). Nothing about the model, the catalog, the memory, or the panel specs is duplicated server-side. Flutter is a new rendering **body** on the same **brain**, which is the whole point of the renderer-agnostic JSON spec.

It implements all 10 primitives (Card, Stack, Grid, Metric, Badge, Text, BarGraph, LineGraph, ProgressBar, ListItem — charts included) as Flutter widgets, plus a recursive `SpecRenderer` that interprets the same `{root, elements}` specs the web registry does.

Feature parity with the web app:

- **Chat that assembles panels** — ask a finance question; Claude's selected panels stream back and render as polished Flutter widgets.
- **Sidebar navigation** — Chat / Catalog / Memory, mirroring the web sidebar.
- **Catalog screen** — every available panel (built-ins + custom) fetched live and rendered, with a "custom" badge.
- **Memory screen** — the two-part memory in two columns: a **declarative** vote timeline and **procedural** scores per question type (Metric + BarGraph).
- **Thumb up/down feedback** — under each chat panel, posting to `/api/finance-feedback` with a "Thank you" confirmation (updates the same `memory.json`).
- **Panel remixing** — a "+" button opens a multi-select picker + instruction field that combines panels via `/api/custom-panels`; the new panel then appears in the Catalog.

### Run the Flutter app

Requires the [Flutter SDK](https://docs.flutter.dev/get-started/install). Keep the Next.js backend running (`pnpm dev` on port 3000), then:

```bash
cd flutter
flutter build web --release
node serve.mjs            # serves the build + proxies /api/* to the backend (avoids CORS)
```

Open **http://localhost:8090**. `serve.mjs` is a small dev harness that hosts the Flutter web build on the backend's origin and establishes the guest session, so the Flutter client just calls `/api/*` the same way the web app does.

**Chat (panels rendered as Flutter widgets)**

![Flutter chat with finance panels](docs/flutter-demo.png)

**Combine panels (the "+" remix dialog)**

![Flutter panel remix dialog](docs/flutter-remix-dialog.png)

The Catalog and Memory screens look the same as the web ones below — the same json-render specs, a different (Flutter) registry.

---

## Setup

Requirements: Node.js 18+ and [pnpm](https://pnpm.io/).

```bash
# 1. Install dependencies
pnpm install

# 2. Add your Anthropic API key
#    Create .env.local in the project root:
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env.local

# 3. Run the dev server
pnpm dev
```

Open **http://localhost:3000**.

This project talks to **Anthropic Claude directly** via [`@ai-sdk/anthropic`](https://www.npmjs.com/package/@ai-sdk/anthropic) (no AI Gateway). The chat works **without a database** — chat-history persistence is disabled when no `POSTGRES_URL` is set; the only storage used by the learning features is the `memory.json` and `custom-panels.json` files.

| Env var | Required | Purpose |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Yes | Calls to Claude for chat, panel selection, and panel remixing. |
| `AUTH_SECRET` | Optional | Signs the local guest session (a dev value is fine). |
| `POSTGRES_URL` | Optional | If set, re-enables chat-history persistence. Not needed for the demo. |

---

## Demo

A full walkthrough: ask **"How are my taxes?"** → panels render → thumb up → ask **"Am I going under?"** → different panels → combine two panels into a new custom one → open **/memory** to see the learned declarative + procedural memory.

[![Watch the demo walkthrough](docs/screenshot-chat.png)](https://github.com/eldengu/autoui-solopreneur/raw/main/docs/demo.mp4)

▶ **[Watch / download the demo video](https://github.com/eldengu/autoui-solopreneur/raw/main/docs/demo.mp4)** &nbsp;(`docs/demo.mp4`)

> Click the image above to play the recorded walkthrough.

## Screenshots

> The web chat is shown in the **Demo** above; these are the other web screens.

**Memory page (declarative → procedural)**

![Two-part memory visualization](docs/screenshot-memory.png)

**Catalog (built-in + custom panels)**

![Panel catalog](docs/screenshot-catalog.png)

---

## Tech stack

- **Next.js** (App Router) + React + TypeScript
- **Anthropic Claude** via the **AI SDK** (`ai` + `@ai-sdk/anthropic`)
- **json-render** (`@json-render/core`, `@json-render/react`) for renderer-agnostic UI specs
- **Tailwind CSS** for styling
- File-based runtime memory (`memory.json`, `custom-panels.json`)

---

## Status

A demo / proof-of-concept exploring generative UI, feedback-driven self-improvement, and a growable component catalog. Built on the Vercel AI Chatbot template.
