# OnBrand

Reviews content (ads, posts, documents) against a company's approved rules and
facts BEFORE it goes public, explains every finding, keeps humans in control.

Catches: 1) outdated facts 2) unsupported claims 3) voice drift 4) off-brand visuals.

Roles: Creator (fast feedback), Brand manager (recurring errors),
Reviewer (evidence + audit trail), Admin (guidelines, versions, access).

Flow: Import -> Submit -> Analyse (rules + retrieval + AI) -> Explain (cited
finding + fix) -> Decide (accept/edit/dispute) -> Approve. Every action is a
revision -> insights -> admins fix unclear rules.

## Non-negotiable principles
- DETERMINISTIC FIRST, AI SECOND: plain code checks before the AI.
- CITATION GATE: every AI finding needs a rule_id that exists in the DB, else
  DROP it and report "no source found".
- HUMAN-LED: suggestions only. Never auto-publish or auto-rewrite. Overrides
  need a reason and are logged.
- PRIVACY: redact before AI calls, isolate workspaces, no API key in browser.
- ACCESSIBILITY: WCAG 2.2 AA.
- Label AI use; show confidence on each finding.

## Finding format
{ issue, rule_id, severity: "High|Medium|Low", confidence: 0-1, explanation, suggested_fix }

## Stack
Next.js, TypeScript, Tailwind, Postgres + pgvector (RLS), Claude API, private
blob storage, RBAC, Vercel.

## Working rules
- Small phases, stop for review after each. Explain in simple language.
- Tests for rule checks and citation gate. Synthetic brand data only
  (see docs/sample-brand.md).
- Frontend: all backend calls go through src/lib/api.ts (mocked for now).
