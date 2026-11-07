# OnBrand (frontend)

Catch brand risk before content goes live. Explain every finding. Keep humans in control.
Product rules live in `CLAUDE.md`; the synthetic test brand ("Zippy Apps") is in `docs/sample-brand.md`.

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # component + mock-pipeline tests (Vitest)
npm run build && npx next start -p 3001
npm run audit:a11y   # axe WCAG 2.2 AA on every page (needs the prod server on :3001)
npm run audit:responsive  # horizontal-overflow check at 360 / 768 / 1920 px
```

The audit scripts use the installed Microsoft Edge. Set `BROWSER_PATH` to use Chrome instead.

## Frontend architecture

```
src/
  app/                 Routes: / (landing), /review, /insights, /admin, /login
  components/
    landing/           Hero 3D (Shield3D, FloatingDraftCard, ParticleField, HeroCanvas, HeroScene),
                       ScrollStory + StoryScene, CitationGateScene, BeforeAfterDemo,
                       Sections (Problem, RoleCards, ResponsibleCards, BenefitTiles), CountUp, SmoothScroll
    review/            ReviewWorkspace, FindingCard, HighlightedText, Dialogs (SourceDrawer,
                       DisputeModal, ConfirmApprove), Panels (NoSourceList, HistoryTimeline, CommentThread)
    insights/          StatCard, RuleBarChart, RuleTable, Heatmap
    Navbar, Footer, AiBadge, SeverityBadge, Logo
  hooks/               useMousePosition (damped), useInView, useDialog (focus trap / Escape / focus return)
  lib/
    api.ts             THE ONLY data entry point. Mocked today.
    preferences.tsx    Reduce-motion (OS setting OR navbar toggle) + demo role, stored in localStorage
  mocks/               rules, findings, insights, users, facts, drafts (synthetic Zippy Apps data)
  content/landing.ts   Landing page copy
  test/                Vitest tests
scripts/               axe + responsive audits
```

### Backend (phase B1) and mock switches

Everything is free to run. The browser only uses `src/lib/api.ts`, which calls our own `/api/*` routes
(`src/app/api`). Server code lives in `src/server` (pipeline, citation gate, rule checks, redaction,
data store) and the only AI code is `src/lib/ai.ts`. See `docs/api-contract.md`.

- `cp .env.example .env.local`. `AI_PROVIDER=mock` (or `MOCK_AI=true`) uses saved sample AI findings.
  `AI_PROVIDER=gemini` + a free `GEMINI_API_KEY` (aistudio.google.com) uses `gemini-3.5-flash-lite` by default;
  `AI_PROVIDER=ollama` uses a local model. Quota errors, outages, bad JSON and our own rate limit
  (`RATE_LIMIT_PER_MINUTE`/`PER_DAY`) all fall back to sample AI findings with a visible notice.
  Identical checks are cached for 24 h and don't use quota.
- Without Supabase settings the server uses an in-memory demo store seeded with Zippy Apps
  (resets when the server restarts). Supabase arrives in phase B3.
- Demo sign-in: `/login` sets a role cookie; the server enforces permissions (only Reviewer/Admin approve,
  only Admin changes roles, disputes need a reason).

### Metallic theme

Gunmetal base, chrome text (`.text-chrome`), gold accents (`.text-gold`, `.btn-gold`), copper = risk,
emerald = verified. Token names in `globals.css` are role names kept from v1 (navy = gunmetal, coral = copper,
yellow = gold). The landing page has a live liquid-metal shader background (`MetalBackground`, raw WebGL,
half resolution) that drifts with the mouse and shifts chrome -> gold -> copper with scroll. Scroll-scrubbed
effects live in `ScrollFX` (`data-reveal`, `data-sheen`, `data-marquee`, `data-hero-copy`).

### Motion and performance rules

- Three.js, GSAP and Lenis are only imported by landing components. `/review`, `/insights` and
  `/admin` never load them.
- The hero's WebGL bundle is lazy (`next/dynamic`, `ssr: false`). It loads at browser idle on desktop and on
  the first touch, scroll or key press on phones/low-power devices. A static shield shows until then.
- The canvas pauses when off-screen or when the tab is hidden. DPR is capped at 2 (1.5 on low-power devices).
- Motion is ON by default on every visit (the OS reduce-motion setting is intentionally ignored). The navbar
  "Reduce motion" toggle turns it off for the tab session (sessionStorage). When on: no WebGL, no parallax, no pinning, no smooth scroll.
  Motion falls back to fades, and the scroll story becomes plain stacked sections.

## Quality results (Phase F6, production build)

| Page | Lighthouse mobile perf | A11y | Best practices | SEO | CLS |
|---|---|---|---|---|---|
| `/` | 93 (desktop: 87-90, with 3D + live background) | 100 | 100 | 100 | 0 |
| `/review` | 99 | 100 | 100 | 100 | 0 |
| `/insights` | 99 | 100 | 100 | 100 | 0 |

axe (WCAG 2.0/2.1/2.2 A+AA): 0 violations on all 5 pages, with and without reduced motion.
