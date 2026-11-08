-- OnBrand schema (Supabase free tier: Postgres + Auth + RLS). No extensions required.
-- Every workspace table is protected by row-level security (RLS): a signed-in user only ever
-- sees rows of their own workspace, and write access depends on their role.

-- ---------------------------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------------------------
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- Synthetic demo numbers only (avgReviewMinutes, repeatErrorPct); real ones need event tracking.
  synthetic_stats jsonb not null default '{}'::jsonb
);

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  team text not null,
  role text not null check (role in ('Creator', 'Brand manager', 'Reviewer', 'Admin'))
);
create index profiles_workspace_idx on public.profiles (workspace_id);

-- Helpers used by every policy. SECURITY DEFINER so they can read profiles without recursing into RLS.
create function public.my_workspace() returns uuid
  language sql stable security definer set search_path = public as
  $$ select workspace_id from public.profiles where user_id = auth.uid() $$;

create function public.my_role() returns text
  language sql stable security definer set search_path = public as
  $$ select role from public.profiles where user_id = auth.uid() $$;

create table public.rules (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  id text not null,
  title text not null,
  text text not null,
  category text not null check (category in ('Outdated fact', 'Unsupported claim', 'Voice drift', 'Off-brand visual')),
  version int not null default 1,
  updated_at date not null default current_date,
  primary key (workspace_id, id)
);

create table public.rule_versions (
  workspace_id uuid not null,
  rule_id text not null,
  version int not null,
  note text not null,
  created_at date not null default current_date,
  primary key (workspace_id, rule_id, version),
  foreign key (workspace_id, rule_id) references public.rules (workspace_id, id) on delete cascade
);

create table public.facts (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  id text not null,
  label text not null,
  value text not null,
  valid_from date not null,
  source text not null,
  primary key (workspace_id, id)
);

create table public.banned_terms (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  term text not null,
  primary key (workspace_id, term)
);

create table public.term_rules (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  id text not null,
  rule_id text not null,
  kind text not null check (kind in ('banned', 'replace')),
  term text not null,
  replacement text not null default '',
  issue text not null,
  severity text not null check (severity in ('High', 'Medium', 'Low')),
  explanation text not null,
  primary key (workspace_id, id)
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null default public.my_workspace() references public.workspaces (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles (user_id),
  text text not null check (length(text) between 1 and 1500),
  status text not null default 'checked' check (status in ('checked', 'approved')),
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid references public.profiles (user_id)
);
create index submissions_ws_idx on public.submissions (workspace_id, created_at desc);

create table public.findings (
  id uuid primary key,
  submission_id uuid not null references public.submissions (id) on delete cascade,
  workspace_id uuid not null default public.my_workspace() references public.workspaces (id) on delete cascade,
  position int not null default 0,
  issue text not null,
  rule_id text not null,
  severity text not null check (severity in ('High', 'Medium', 'Low')),
  confidence double precision not null check (confidence between 0 and 1),
  explanation text not null,
  suggested_fix text not null default '',
  phrase text not null,
  source text not null check (source in ('deterministic', 'ai'))
);
create index findings_submission_idx on public.findings (submission_id, position);

create table public.dropped_findings (
  id uuid primary key,
  submission_id uuid not null references public.submissions (id) on delete cascade,
  workspace_id uuid not null default public.my_workspace() references public.workspaces (id) on delete cascade,
  issue text not null,
  claimed_rule_id text,
  reason text not null default 'no source found'
);

create table public.decisions (
  submission_id uuid not null references public.submissions (id) on delete cascade,
  finding_id uuid not null references public.findings (id) on delete cascade,
  workspace_id uuid not null default public.my_workspace() references public.workspaces (id) on delete cascade,
  state text not null check (state in ('accepted', 'edited', 'disputed')),
  fix text,
  reason text,
  decided_by uuid not null default auth.uid() references public.profiles (user_id),
  decided_at timestamptz not null default now(),
  primary key (submission_id, finding_id),
  -- Overrides need a reason: enforced by the database itself, not just the app.
  constraint dispute_needs_reason check (state <> 'disputed' or length(trim(coalesce(reason, ''))) > 0)
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions (id) on delete cascade,
  workspace_id uuid not null default public.my_workspace() references public.workspaces (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles (user_id),
  text text not null check (length(trim(text)) > 0),
  created_at timestamptz not null default now()
);

-- Append-only audit trail: no update or delete policies exist for this table.
create table public.revisions (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions (id) on delete cascade,
  workspace_id uuid not null default public.my_workspace() references public.workspaces (id) on delete cascade,
  actor_id uuid not null default auth.uid() references public.profiles (user_id),
  action text not null check (action in ('checked', 'accepted', 'edited', 'disputed', 'commented', 'approved')),
  finding_id uuid,
  detail text,
  at timestamptz not null default now()
);
create index revisions_submission_idx on public.revisions (submission_id, at);

-- Free-tier protection
create table public.review_cache (
  key text primary key,
  workspace_id uuid not null default public.my_workspace() references public.workspaces (id) on delete cascade,
  findings jsonb not null,
  expires_at timestamptz not null
);

create table public.ai_calls (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.profiles (user_id) on delete cascade,
  at timestamptz not null default now()
);
create index ai_calls_user_idx on public.ai_calls (user_id, at desc);

-- Synthetic history for the demo dashboard (real checks are added on top via live_insights).
create table public.insights_history (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  rule_id text not null,
  team text not null,
  creator text not null,
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  count int not null,
  accepted int not null,
  disputed int not null,
  primary key (workspace_id, rule_id, team, creator, month)
);

-- Live counts from real checks. security_invoker => the viewer's RLS applies (needs Postgres 15+).
create view public.live_insights with (security_invoker = true) as
select f.workspace_id,
       f.rule_id,
       p.team,
       p.name as creator,
       to_char(s.created_at, 'YYYY-MM') as month,
       count(*)::int as count,
       (count(*) filter (where d.state in ('accepted', 'edited')))::int as accepted,
       (count(*) filter (where d.state = 'disputed'))::int as disputed
from public.findings f
join public.submissions s on s.id = f.submission_id
join public.profiles p on p.user_id = s.author_id
left join public.decisions d on d.finding_id = f.id and d.submission_id = f.submission_id
group by f.workspace_id, f.rule_id, p.team, p.name, to_char(s.created_at, 'YYYY-MM');

-- ---------------------------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['workspaces','profiles','rules','rule_versions','facts','banned_terms','term_rules',
    'submissions','findings','dropped_findings','decisions','comments','revisions','review_cache','ai_calls','insights_history']
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Read: members of the workspace only.
create policy ws_read on public.workspaces for select to authenticated using (id = public.my_workspace());
create policy profiles_read on public.profiles for select to authenticated using (workspace_id = public.my_workspace());
create policy rules_read on public.rules for select to authenticated using (workspace_id = public.my_workspace());
create policy rule_versions_read on public.rule_versions for select to authenticated using (workspace_id = public.my_workspace());
create policy facts_read on public.facts for select to authenticated using (workspace_id = public.my_workspace());
create policy banned_read on public.banned_terms for select to authenticated using (workspace_id = public.my_workspace());
create policy term_rules_read on public.term_rules for select to authenticated using (workspace_id = public.my_workspace());
create policy submissions_read on public.submissions for select to authenticated using (workspace_id = public.my_workspace());
create policy findings_read on public.findings for select to authenticated using (workspace_id = public.my_workspace());
create policy dropped_read on public.dropped_findings for select to authenticated using (workspace_id = public.my_workspace());
create policy decisions_read on public.decisions for select to authenticated using (workspace_id = public.my_workspace());
create policy comments_read on public.comments for select to authenticated using (workspace_id = public.my_workspace());
create policy revisions_read on public.revisions for select to authenticated using (workspace_id = public.my_workspace());
create policy cache_read on public.review_cache for select to authenticated using (workspace_id = public.my_workspace());
create policy ai_calls_read on public.ai_calls for select to authenticated using (user_id = auth.uid());
create policy insights_read on public.insights_history for select to authenticated using (workspace_id = public.my_workspace());

-- Admin-only: change roles, edit guidelines, facts and terms. (Role changes can't move people between workspaces.)
create policy profiles_admin_update on public.profiles for update to authenticated
  using (workspace_id = public.my_workspace() and public.my_role() = 'Admin')
  with check (workspace_id = public.my_workspace() and public.my_role() = 'Admin');

create policy rules_admin_write on public.rules for all to authenticated
  using (workspace_id = public.my_workspace() and public.my_role() = 'Admin')
  with check (workspace_id = public.my_workspace() and public.my_role() = 'Admin');
create policy rule_versions_admin_write on public.rule_versions for all to authenticated
  using (workspace_id = public.my_workspace() and public.my_role() = 'Admin')
  with check (workspace_id = public.my_workspace() and public.my_role() = 'Admin');
create policy facts_admin_write on public.facts for all to authenticated
  using (workspace_id = public.my_workspace() and public.my_role() = 'Admin')
  with check (workspace_id = public.my_workspace() and public.my_role() = 'Admin');
create policy banned_admin_write on public.banned_terms for all to authenticated
  using (workspace_id = public.my_workspace() and public.my_role() = 'Admin')
  with check (workspace_id = public.my_workspace() and public.my_role() = 'Admin');
create policy term_rules_admin_write on public.term_rules for all to authenticated
  using (workspace_id = public.my_workspace() and public.my_role() = 'Admin')
  with check (workspace_id = public.my_workspace() and public.my_role() = 'Admin');

-- Any member: create and check their own drafts, decide, comment.
create policy submissions_insert on public.submissions for insert to authenticated
  with check (workspace_id = public.my_workspace() and author_id = auth.uid() and status = 'checked');
-- Approval: Reviewer or Admin only, recorded against the approver.
create policy submissions_approve on public.submissions for update to authenticated
  using (workspace_id = public.my_workspace() and public.my_role() in ('Reviewer', 'Admin'))
  with check (workspace_id = public.my_workspace() and approved_by = auth.uid());

create policy findings_insert on public.findings for insert to authenticated
  with check (workspace_id = public.my_workspace());
create policy dropped_insert on public.dropped_findings for insert to authenticated
  with check (workspace_id = public.my_workspace());

create policy decisions_insert on public.decisions for insert to authenticated
  with check (workspace_id = public.my_workspace() and decided_by = auth.uid());
create policy decisions_update on public.decisions for update to authenticated
  using (workspace_id = public.my_workspace())
  with check (workspace_id = public.my_workspace() and decided_by = auth.uid());

create policy comments_insert on public.comments for insert to authenticated
  with check (workspace_id = public.my_workspace() and author_id = auth.uid());
create policy revisions_insert on public.revisions for insert to authenticated
  with check (workspace_id = public.my_workspace() and actor_id = auth.uid());

create policy cache_insert on public.review_cache for insert to authenticated with check (workspace_id = public.my_workspace());
create policy cache_update on public.review_cache for update to authenticated
  using (workspace_id = public.my_workspace()) with check (workspace_id = public.my_workspace());
create policy cache_delete on public.review_cache for delete to authenticated using (workspace_id = public.my_workspace());

create policy ai_calls_insert on public.ai_calls for insert to authenticated with check (user_id = auth.uid());
create policy ai_calls_delete on public.ai_calls for delete to authenticated using (user_id = auth.uid());

-- Table privileges (Supabase grants these by default; repeated so the file is self-contained).
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on function public.my_workspace(), public.my_role() to authenticated;
-- The anon (signed-out) role gets nothing.
revoke all on all tables in schema public from anon;
