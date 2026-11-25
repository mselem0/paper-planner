# Rodaina Planner 2027 — Web App Plan

Source: `~/Downloads/planner.pdf` (159 pages, A4 portrait, 2027, all vector art, no extractable text).
Goal: a faithful, delightful SPA version of the paper planner. All data in `localStorage`. No backend.

## 1. What the PDF contains (inventory)

| # | Page type | Where in PDF | Content to reproduce |
|---|-----------|--------------|----------------------|
| A | **Cover** | p1 | Pastel wavy vertical stripes, blue rounded label "HELLO, MY NAME IS :" with dashed inner border, red/blue 8-point star sticker |
| B | **2027 AGENDA (year overview)** | p4 | Big "2027" (blue, heavy) with red handwritten "AGENDA" over it; 4×3 grid of month tiles, each its own pastel color, month name bottom-right |
| C | **Quarterly plan** ×4 | p6, 44, 82, 120 | "Quartly plan" with 3 numbered goal lines; 3 tall colored month columns (big month name + ~13 lines each); Notes (6 lines) |
| D | **Month calendar** ×12 | p8, 20, 32, 46, 58, 70, 84, 96, 108, 122, 134, 146 | Full-page month color background, giant month name, "2027" rotated vertically, colored S M T W T F S header bar, 6×7 grid, day number bottom-right of each cell (week starts **Sunday**) |
| E | **Budget Planner** ×12 | page after each month calendar | "BUDGET" + red script "Planner"; 3 summary boxes: total income / total expenses / left to save; INCOME (Paycheck, Side income, Other — name+amount); SPENDING (tagged "flexible"); EXPENSES (tagged "fixed"); SAVING & DEBT; SAVING GOAL box; EMERGENCY BUDGET box; NOTES box; Quran ayah (الفرقان ٦٧): «وَالَّذِينَ إِذَا أَنفَقُوا لَمْ يُسْرِفُوا وَلَمْ يَقْتُرُوا وَكَانَ بَيْنَ ذَٰلِكَ قَوَامًا» |
| F | **Priority matrix** (weekly) | ~4–5 per month | Month progress dots (12 circles, current month filled in month accent); 2×2 Eisenhower grid: Important & Urgent / Important & not urgent / not important & Urgent / not important & not urgent, ~9 lines each; big "NOTES" with lines |
| G | **Weekly planner + Habit tracker** | follows each matrix | Rows SUN…SAT, each with 5 bullet task lines + a status column; legend: ✓ OK · → DELAY · / STUCK · ✗ CANCEL; "HABIT tracker" stamp: 4 habit names × 7 day dots (S–S) |
| H | **Lined notes** "2027 AGENDA" | p2, 3, 5, 7 and between months | Ruled pages with small 2027/AGENDA logo top-right |
| I | **How was my year?** | p158 | The most important goal I achieved; What inspired me?; The lowest points; New skills I learned; My favorite things; How can next year be better?; What can I improve next year? |

Each month has its own accent color for headings/lines/dots in pages D–G (e.g. JAN olive-yellow, FEB/MAR blue/purple, APR red, MAY orange, JUN pink, AUG green, SEP orange-red, OCT blue, NOV light, DEC teal). Worker must sample exact values from the PDF.

Sampled tile colors (page 4):
JAN `#dde6f3` · FEB `#e6d2e2` · MAR `#f6efab` · APR `#f6bdb6` · MAY `#e2d1e7` · JUN `#efd9af` · JUL `#fdd5a7` · AUG `#dbead5` · SEP `#faebeb` · OCT `#f7f0ac` · NOV `#d2eae9` · DEC `#fdd5a8` · paper `#fefef6` · brand blue ≈ `#5b78bd` · script red ≈ `#c0262d`.

## 2. Product design

**Feel:** a paper planner you can touch. Cream paper, pastel month colors, chunky bold display type, handwritten labels, stickers. Typing feels like writing on ruled lines (inputs sit on the lines, no boxes). Soft page-turn transitions, little bouncy check animations, confetti when a whole habit row hits 7/7 or a week's tasks are all done.

**Navigation (SPA, hash routes so it works from any static host):**
- `#/` Cover → name entry, "open planner" button
- `#/year` 2027 Agenda grid (tap a tile → month)
- `#/today` Today: today's tasks, today's habits, this month's budget snapshot (default landing once a name is set)
- `#/q/1..4` Quarterly plan
- `#/m/:month` Month calendar (tap day → inline editor; dots show tasks from weekly planner on that date)
- `#/m/:month/budget` Budget planner
- `#/w/:sundayDate` Week: tabs/flip between Priority matrix and Weekly planner + habits; prev/next week arrows
- `#/notes` Notes notebook (many ruled pages, add/delete, titles)
- `#/review` How was my year?
- `#/settings` backup export/import JSON, reset, owner name, start-of-week fixed to Sunday
- Persistent side/bottom tab bar styled like paper tabs in month colors (desktop: left rail of 12 month tabs + sections; mobile: bottom bar + month swiper).

**Weeks:** generated from the real 2027 calendar (Sun–Sat), keyed by the Sunday ISO date. A week overlapping two months shows in both months' lists; data is shared. Progress dots use the month of the week's Thursday.

**Budget:** amounts numeric with live totals: total income = income rows; total expenses = spending + expenses + saving&debt; left to save = income − expenses (red when negative). Currency setting (default EGP, editable).

**Weekly task status:** click the status circle to cycle empty → OK → DELAY → STUCK → CANCEL. "DELAY" offers "move to tomorrow". Rows grow beyond 5 lines if needed.

## 3. Tech stack

- Vite + React 18 + TypeScript (strict)
- React Router (HashRouter)
- Zustand + `persist` middleware → one versioned localStorage key `rodaina-planner:v1`, with a migration hook
- Framer Motion (transitions, micro-interactions), canvas-confetti
- Plain CSS modules + CSS variables for tokens (no UI kit) so the paper look stays custom
- Fonts self-hosted via @fontsource (works offline): display = "Archivo Black" (big month/BUDGET/HABIT words), handwriting = "Gochi Hand" or "Caveat" for labels, body = "Nunito", Arabic ayah = "Amiri Quran"
- Decorative art (stripes, star sticker, stamp, progress dots, ruled lines) as inline SVG/CSS — not raster copies of the PDF
- vite-plugin-pwa: installable on phone/iPad, offline
- Vitest for store/date/budget logic; Playwright smoke test optional

Folder: `src/{app,routes,components/paper,features/{cover,year,quarter,month,budget,week,habits,notes,review,today,settings},store,lib/dates,styles}`.

## 4. Data model (single store)

```ts
{ version: 1,
  profile: { name, currency },
  yearAgenda: Record<Month, string>,
  quarters: Record<1|2|3|4, { goals: [string,string,string], months: Record<Month,string[]>, notes: string }>,
  days: Record<ISODate, { note: string }>,           // month calendar cells
  budgets: Record<Month, { income: Row[], spending: Row[], expenses: Row[], savingDebt: Row[], savingGoal: string, emergency: string, notes: string }>,
  weeks: Record<SundayISO, { matrix: {ui:string[], inu:string[], niu:string[], ninu:string[]}, notes: string,
                             days: Record<0..6, Task[]>, habits: {name:string, done:boolean[7]}[4] }>,
  notes: { id, title, body, updatedAt }[],
  review: { goal, inspired, lowest, skills, favorites, betterNextYear, improve } }
Row = { id, label, amount: number|null }
Task = { id, text, status: null|'ok'|'delay'|'stuck'|'cancel' }
```
Debounced writes; quota/parse errors surfaced as a toast, never silent data loss.

## 5. Milestones (each executed by a fresh Sonnet worker, verified before the next)

1. **Foundation** — scaffold, tokens/palette (sample exact accent colors from PDF), fonts, paper components (`RuledLines`, `LineInput`, `PaperPage`, `MonthDots`, `Sticker`, `BigTitle`), store + persistence + export/import, router + nav shell, Cover, Year Agenda.
2. **Month** — month calendar (12 themes) + Budget planner with live totals + ayah.
3. **Week** — week generation, Priority matrix, Weekly planner with status cycle, Habit tracker, confetti, Today view.
4. **Rest + polish** — Quarterly plans, Notes notebook, Year review, Settings, PWA, responsive/mobile pass, animations, empty states, accessibility (labels, focus, keyboard: Enter → next line, Backspace on empty → previous line).
5. **Verification** — independent verifier: build + tests, then browser walkthrough of every route at desktop and mobile widths, reload to prove persistence, side-by-side visual check against PDF pages.

## 6. Acceptance checks

- `npm run build` and `npm test` pass, no TS errors.
- Every page type A–I exists and visually matches the PDF (colors, layout, labels).
- All 12 months, 4 quarters, every 2027 week reachable; calendar dates correct (Jan 1 2027 = Friday).
- Data survives reload; export → reset → import restores everything.
- Usable at 375px width and on desktop.
