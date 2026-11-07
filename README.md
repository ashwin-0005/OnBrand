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

### Mock data toggle

All data goes through `src/lib/api.ts`. Mocks are on by default.
Set `NEXT_PUBLIC_USE_MOCKS=false` in `.env.local` once the real API routes exist, and implement the
non-mock branches there. Never put secrets (e.g. the Claude API key) in client code; AI calls belong
in server routes.

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
