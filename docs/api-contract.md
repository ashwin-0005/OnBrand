# OnBrand API contract

Status: phase **B2** (server routes, in-memory demo store, free AI: Gemini free tier / Ollama / mock). Everything is free to run.
The browser only uses `src/lib/api.ts`, which only calls our own `/api/*` routes.
All errors come back as `{ "error": "plain-language message" }` with an HTTP status.

## Session (demo sign-in until Supabase Auth in B3)
| `api.ts` | Route | In | Out |
|---|---|---|---|
| `getSession()` | `GET /api/session` | – | `Session { user: User, workspaceId }` (no cookie = demo Creator) |
| `signInDemo(role)` | `POST /api/session` | `{ role }` | `Session` + httpOnly cookie |
| `signOut()` | `DELETE /api/session` | – | `{ ok: true }` |
| `listUsers()` | `GET /api/users` | – | `User[]` |
| `setUserRole(id, role)` | `PATCH /api/users/[id]` | `{ role }` | `User`. **Admin only** (403); can't empty a role (400) |

## Review
| `api.ts` | Route | In | Out |
|---|---|---|---|
| `checkContent(text)` | `POST /api/review` | `{ text }` ≤ **1500 chars** (400 otherwise) | `ReviewResult { findings, dropped, submissionId?, notice? }` |
| `saveDecision(sid, findingId, decision)` | `POST /api/submissions/[id]/decisions` | `{ findingId, decision: { state: accepted\|edited\|disputed, fix?, reason? } }` | `Decision`. **Dispute without reason → 400.** Accept always uses the server's suggested fix. Approved drafts → 409 |
| `getComments(sid)` / `addComment(sid, text)` | `GET/POST /api/submissions/[id]/comments` | `{ text }` ≤ 2000 | `Comment[]` / `Comment` |
| `getHistory(sid)` | `GET /api/submissions/[id]/history` | – | `HistoryEvent[]` (from saved revisions) |
| `approveSubmission(sid)` | `POST /api/submissions/[id]/approve` | – | `{ approved: true, at, by }`. **Reviewer/Admin only** (403). Never publishes |

Pipeline behind `POST /api/review` (`src/server/review.ts`):
rule checks (`checks.ts`) → redact (`redact.ts`) → AI (`src/lib/ai.ts`, zod-validated; 24 h cache of identical checks; per-user rate limit;
on quota/outage/bad JSON/limit → saved sample findings + `notice`) → phrase must exist in the draft → rule checks win over AI on the
same words → **citation gate** (`citationGate.ts`: unknown `rule_id` → `dropped`, "no source found")
→ save submission + "checked" revision.

## Guidelines and insights
| `api.ts` | Route | Out |
|---|---|---|
| `getRules()` | `GET /api/rules` | `Rule[]` |
| `getRuleVersions(id)` | `GET /api/rules/[id]/versions` | `RuleVersion[]` newest first |
| `getFacts()` | `GET /api/facts` | `Fact[]` |
| `getBannedTerms()` | `GET /api/terms` | `string[]` |
| `getInsights(filters?)` | `GET /api/insights?rule&team&creator&from&to` | `{ stats, records, mistakesByRule, heatmap, teams, creators }` |

## Shapes
See `src/types.ts`: `Rule, RuleVersion, Fact, TermRule, Finding, DroppedFinding, ReviewResult, Decision,
Submission, Revision, HistoryEvent, Comment, User, Session, InsightStats, InsightRecord`.
`Finding` = AI format (`issue, rule_id, severity, confidence 0–1, explanation, suggested_fix`) + `id`,
`phrase` (exact text from the draft) and `source` (`deterministic` | `ai`).

## Not yet (later phases)
- B3: Supabase schema + RLS + Auth (replaces the in-memory store and demo cookie).
- B4: insights/admin from the database; Vercel Hobby deploy notes.
- Uploads/import are UI-only.
