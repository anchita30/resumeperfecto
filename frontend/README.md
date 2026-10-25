# ResumePerfecto — Frontend

Next.js dashboard for the Resume ↔ JD Semantic Matcher, styled with a soft
"claymorphism" look (puffy pastel cards, soft shadows, colorful section
blocks) and a floating chatbot character that reacts to your match score
and answers questions about your report.

## Setup

Make sure the backend is running first (`http://localhost:8000` by default —
see the backend's own README).

```bash
npm install
npm run dev
```

Open http://localhost:3000

If your backend runs on a different URL, edit `.env.local`:
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

## What's included

- **Dashboard layout** — history sidebar (left) + main analysis panel
- **Upload or paste** — resume and JD, either as a file (.pdf/.docx/.txt) or pasted text
- **Dedicated results pages** — each analysis gets its own route at
  `/results/[id]`, fetched from the backend's history endpoint, so results
  are shareable/bookmarkable and the sidebar links straight to them
- **Tabbed results**: Score / Skills / Gaps / Weak Sections, with colorful
  pastel section blocks (blue/green/pink/yellow/lavender) instead of a flat
  white layout
- **"Learn this skill" links** — every missing skill automatically gets
  YouTube / freeCodeCamp / Coursera search links (`lib/learnLinks.ts`) — no
  manual curation, works for any skill the backend reports
- **PDF export** — "Download PDF Report" button renders the full report
  (all sections, not just the active tab) to a downloadable PDF using
  `html2canvas` + `jspdf`, entirely client-side
- **Floating chatbot** (`components/ChatWidget.tsx`) — uses your character
  image (`public/character.png`) as its avatar; answers questions about
  scores/skills/gaps using a free, rule-based FAQ engine
  (`lib/faqBot.ts` — keyword matching, no API key or external calls)
- **Score mascot** — separate reacting character (`components/Mascot.tsx`,
  original SVG) shown inline on the results/score tab:
  - 80+: great / happy · 60-79: good · 40-59: meh/concerned · <40: sad

## Project structure
```
app/
  layout.tsx              # root layout, fonts/metadata, mounts ChatWidget globally
  page.tsx                 # homepage: sidebar + analyze form only
  results/[id]/page.tsx      # dedicated results page, fetched by history ID
  globals.css                # claymorphism CSS utility classes, colorful pastel background
components/
  Sidebar.tsx       # history list, calls GET /api/history, routes to /results/[id]
  AnalyzeForm.tsx    # resume/JD upload + paste form, calls POST /api/analyze
  ResultsPanel.tsx    # tabbed results + learn-skill links + PDF export
  ScoreGauge.tsx       # circular score gauge (SVG)
  SkillChip.tsx         # small pill component for skill tags
  Mascot.tsx             # inline reacting character with mood states (original SVG)
  ChatWidget.tsx           # floating chatbot using your character image + FAQ engine
lib/
  api.ts                 # typed API client (axios) for the FastAPI backend
  learnLinks.ts            # auto-generates learning links for any missing skill
  faqBot.ts                  # rule-based keyword-matching FAQ answers
public/
  character.png             # your character image — used in header, homepage, and chatbot
```

## Replacing the character
Just overwrite `public/character.png` with a new image (same filename) to
swap the character everywhere it's used — header, homepage, and the chatbot
avatar all reference this one file.

## Customizing the palette
All pastel colors live in `tailwind.config.js` under `theme.extend.colors.clay`.
Change those hex values to retheme the whole app — every component references
these tokens (`bg-clay-pink`, `bg-clay-blue`, etc.) rather than hardcoded colors.

## Customizing the mascot
`components/Mascot.tsx` is a hand-drawn SVG (head, hat, face, scarf) built
from simple shapes, not a copied image — you can freely edit the paths/colors
there, or swap in your own illustration by replacing the `<svg>` block.
