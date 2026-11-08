# Supabase setup (free tier)

The app works without Supabase (in-memory demo store). Follow this to use a real free database + login.
Everything here is on Supabase's **free plan** and needs no credit card.

1. **Create a project** at supabase.com (Free plan). Choose any region; save the database password somewhere safe.
2. **Run the SQL.** Dashboard -> SQL Editor -> New query:
   1. paste all of `supabase/migrations/0001_init.sql` and Run.
   2. paste all of `supabase/seed.sql` and Run (demo brand "Zippy Apps"; safe to re-run).
3. **Copy the keys.** Dashboard -> Project Settings -> API. Put these in `.env.local` (never commit it):
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...      # "anon public" key
   SUPABASE_SERVICE_ROLE_KEY=...          # "service_role" key: server/scripts only, keep secret
   DEMO_PASSWORD=choose-a-password        # 8+ characters; the 7 demo accounts share it
   ```
4. **Create the demo users:** `npm run seed:users`
5. **Check everything:** `npm run verify:supabase` (sign-in works; isolation, approvals, roles and the dispute rule hold).
6. Restart `npm run dev`. The app now uses Supabase. Pick a role on /login.

## How it is protected
- Row-level security on every table: you only see your own workspace; Admin-only edits; Reviewer/Admin-only approval;
  disputes need a reason (database CHECK); the revision trail is append-only. Proven by `src/test/db.test.ts`.
- The browser never sees a database key or the user's token (tokens are httpOnly cookies set by our server).
- The app never uses the service-role key.

## Deploying (Vercel Hobby, free)
Add the same variables in Vercel -> Project -> Settings -> Environment Variables:
`AI_PROVIDER`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `RATE_LIMIT_PER_MINUTE`, `RATE_LIMIT_PER_DAY`,
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DEMO_PASSWORD`.
Do **not** add `SUPABASE_SERVICE_ROLE_KEY` (the app doesn't need it).

## Free-tier notes
- Free projects **pause after about a week of no activity**; un-pause in the dashboard (data is kept).
- **Demo accounts:** anyone who can open the site can sign in as any demo role, including Admin. Fine for
  synthetic data; before real use, replace demo sign-in with real accounts.
