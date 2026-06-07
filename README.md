# Saytica Eval Console

A small full-stack web app built for the Saytica Software Developer Intern take-home task (Stage 2).

**Live URL:** _TBD after deployment_  
**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · Lucide icons

---

## Screens

### Screen 1 — Model Leaderboard
Compares AI models served from the backend (`/api/models`). Features:
- **Sortable columns** — click any header to sort; click again to reverse. Nulls always sort last.
- **Search** by model name or provider (case-insensitive).
- **Data quality flags** — inconsistencies in the raw data are detected server-side and surfaced inline (click a flagged row to see details).
- **Visual accuracy bar** — colour-coded green / blue / grey by performance tier.

### Screen 2 — Task Board
Role-toggled between two views:
- **Annotator** — sees only tasks assigned to `u_annotator`, grouped by project. Can advance status forward (`pending → in_progress → done`), persisted in-memory on the backend. Cannot skip steps.
- **Client** — read-only. Shows overall completion % plus a per-project breakdown (counts per status, data anomalies flagged).

---

## Data decisions

The raw JSON was realistic, meaning intentionally dirty. Things I noticed and handled:

| Issue | How I handled it |
|---|---|
| `Polyglot-Pro` had leading/trailing whitespace in the name | Trimmed server-side, flagged |
| `aurora-7b-lite` provider was lowercase `openforma` | Normalised to title-case on the backend |
| `Lingua-Max` date was `DD/MM/YYYY` instead of ISO | Parsed and converted to `YYYY-MM-DD` |
| `Vox-Mini` latencyMs was `9999` — likely a sentinel | Displayed as `~9,999 ms` with a warning flag |
| Several models had `null` accuracy or cost | Sorted last; displayed as `n/a` / `undisclosed` |
| `Sonnet-Khulna` had no `evaluatedAt` | Flagged as date missing |
| Task `t13` (Punjabi diarization) had `status: ""` | Normalised to `pending`, flagged `status_unknown` |
| Task `t14` (Telugu OCR) had `assignedTo: null` | Flagged `unassigned`; excluded from annotator view |

---

## How to run (Linux)

```bash
# 1. Clone the repo
git clone <your-repo-url>
cd saytica-eval-console

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev

# App runs at http://localhost:3000
```

**Requirements:** Node.js ≥ 18, npm ≥ 9.

No environment variables needed — data is read from `data/models.json` and `data/tasks.json`.

---

## Project structure

```
app/
  api/
    models/route.ts      ← GET /api/models  (cleans + serves models.json)
    tasks/route.ts       ← GET /api/tasks   (cleans + serves tasks.json)
    tasks/[id]/route.ts  ← PATCH /api/tasks/:id  (advance status)
  page.tsx               ← Screen 1: Leaderboard
  tasks/page.tsx         ← Screen 2: Task Board
  layout.tsx             ← Root layout with sticky navbar
  globals.css            ← Design tokens & global styles
components/
  Navbar.tsx             ← Navigation between screens
data/
  models.json            ← Raw model data (as given)
  tasks.json             ← Raw task data (as given)
```

---

## Trade-offs

- **In-memory task state**: PATCH updates are stored in memory (not a real DB). A restart resets them. For a production app I'd use SQLite or Postgres via Prisma. Given the scope and time, this keeps the backend simple while still satisfying the "saved through your backend" requirement.
- **Single user assumption**: The annotator is hard-coded as `u_annotator`. A real app would have auth and session context.
- **No tests**: Given the 24-hour window I prioritised a clean, well-reasoned implementation over test coverage. The data-cleaning logic in the API routes is the natural place to start with unit tests.
- **Deployment**: Optimised for Vercel (`next build && next start`). No Docker needed.
