-- Synthetic demo brand "Zippy Apps" (fake data, see docs/sample-brand.md).
-- Run after 0001_init.sql, then run `npm run seed:users` to create the demo sign-in users.
-- Safe to re-run (clears and re-inserts this demo workspace).

delete from public.workspaces where id = '00000000-0000-4000-8000-0000000000a1';

insert into public.workspaces (id, name, synthetic_stats)
values ('00000000-0000-4000-8000-0000000000a1', 'Zippy Apps', '{"avgReviewMinutes": 14, "repeatErrorPct": 18}');

-- Guidelines ------------------------------------------------------------------------------------
insert into public.rules (workspace_id, id, title, text, category, version, updated_at)
select '00000000-0000-4000-8000-0000000000a1', v.id, v.title, v.text, v.category, v.version, v.updated_at::date
from (values
  ('CLM-3.2', 'Claims Policy 3.2', 'Do not use superlatives such as "best", "#1" or "fastest" unless a current, cited benchmark supports them.', 'Unsupported claim', 4, '2026-09-12'),
  ('CLM-3.4', 'Claims Policy 3.4', 'Never promise outcomes. Words like "guaranteed" are not allowed.', 'Unsupported claim', 2, '2026-06-01'),
  ('CLM-4.1', 'Claims Policy 4.1', 'No medical or scientific claims such as "clinically proven".', 'Unsupported claim', 1, '2026-02-20'),
  ('FCT-1.1', 'Facts Register 1.1', 'Prices must match the current price list. Pro plan: $9/month.', 'Outdated fact', 7, '2026-01-15'),
  ('FCT-1.3', 'Facts Register 1.3', 'Do not mention retired features. "Zippy Drive" was replaced by "Offline mode".', 'Outdated fact', 3, '2026-03-30'),
  ('VOI-2.1', 'Voice Guide 2.1', 'Friendly and plain. No ALL CAPS. At most one exclamation mark per piece.', 'Voice drift', 5, '2026-08-08'),
  ('VIS-5.2', 'Visual Standards 5.2', 'Text must have a contrast ratio of at least 4.5:1 against its background.', 'Off-brand visual', 2, '2026-05-10'),
  ('VIS-5.4', 'Visual Standards 5.4', 'Every meaningful image needs alt text.', 'Off-brand visual', 1, '2026-05-10')
) as v(id, title, text, category, version, updated_at);

-- One row per version (newest first in the UI). Notes for the three rules that have them.
insert into public.rule_versions (workspace_id, rule_id, version, note, created_at)
select r.workspace_id, r.id, g.v,
       coalesce(n.note, case when g.v = 1 then 'First version' else 'Wording clarified' end),
       r.updated_at - ((r.version - g.v) * 30)
from public.rules r
cross join lateral generate_series(1, r.version) as g(v)
left join (values
  ('CLM-3.2', 4, 'Added "fastest" to the examples'),
  ('CLM-3.2', 3, 'Benchmarks must be under 12 months old'),
  ('CLM-3.2', 2, 'Allowed superlatives with a cited benchmark'),
  ('CLM-3.2', 1, 'First version'),
  ('FCT-1.1', 7, 'Pro price updated to $9/month'),
  ('FCT-1.1', 6, 'Added annual plan'),
  ('FCT-1.1', 5, 'Price list moved to Facts Register'),
  ('VOI-2.1', 5, 'Limit of one exclamation mark'),
  ('VOI-2.1', 4, 'No ALL CAPS'),
  ('VOI-2.1', 3, 'Friendlier wording'),
  ('VOI-2.1', 2, 'Merged with the old tone guide')
) as n(rule_id, version, note) on n.rule_id = r.id and n.version = g.v
where r.workspace_id = '00000000-0000-4000-8000-0000000000a1';

insert into public.facts (workspace_id, id, label, value, valid_from, source) values
  ('00000000-0000-4000-8000-0000000000a1', 'FACT-01', 'Pro plan price', '$9/month', '2026-01-15', 'Price list v7'),
  ('00000000-0000-4000-8000-0000000000a1', 'FACT-02', 'Sync speed', '2x faster than the 2025 release', '2026-07-01', 'Benchmark Q2 2026'),
  ('00000000-0000-4000-8000-0000000000a1', 'FACT-03', 'Offline storage feature', 'Offline mode (replaced Zippy Drive)', '2026-03-30', 'Release notes 26.3'),
  ('00000000-0000-4000-8000-0000000000a1', 'FACT-04', 'Teams using Zippy Sync', '12,000+', '2026-10-01', 'Usage report Oct 2026');

insert into public.banned_terms (workspace_id, term)
select '00000000-0000-4000-8000-0000000000a1', t
from unnest(array['guaranteed', 'clinically proven', '#1', 'best ever', 'risk-free', 'Zippy Drive']) as t;

insert into public.term_rules (workspace_id, id, rule_id, kind, term, replacement, issue, severity, explanation) values
  ('00000000-0000-4000-8000-0000000000a1', 't1', 'FCT-1.1', 'replace', '$5/month', '$9/month', 'Outdated price', 'Medium', 'The Pro plan has cost $9/month since January 2026.'),
  ('00000000-0000-4000-8000-0000000000a1', 't2', 'FCT-1.3', 'replace', 'Zippy Drive', 'Offline mode', 'Retired feature', 'Medium', 'Zippy Drive was retired in March 2026 and replaced by Offline mode.'),
  ('00000000-0000-4000-8000-0000000000a1', 't3', 'CLM-3.4', 'banned', 'guaranteed', '', 'Promised outcome', 'High', '“Guaranteed” is on the banned-terms list. We can''t promise results.'),
  ('00000000-0000-4000-8000-0000000000a1', 't4', 'CLM-3.4', 'banned', 'risk-free', '', 'Promised outcome', 'High', '“Risk-free” promises an outcome we can''t guarantee.'),
  ('00000000-0000-4000-8000-0000000000a1', 't5', 'CLM-4.1', 'banned', 'clinically proven', 'designed', 'Scientific claim', 'High', 'We don''t make medical or scientific claims.');

-- Synthetic insights history (Sep-Nov 2026): 4 teams x 8 rules, split 30/30/40% across 3 months. ----
insert into public.insights_history (workspace_id, rule_id, team, creator, month, count, accepted, disputed)
select '00000000-0000-4000-8000-0000000000a1', h.rule_id, h.team, c.creator, m.month,
       round(h.total * m.share)::int,
       round(round(h.total * m.share) * 0.72)::int,
       round(round(h.total * m.share) * d.pct / 100.0)::int
from (values
  ('Social','CLM-3.2',120),('Social','FCT-1.1',40),('Social','VOI-2.1',90),('Social','CLM-3.4',60),('Social','FCT-1.3',20),('Social','VIS-5.4',55),('Social','VIS-5.2',25),('Social','CLM-4.1',10),
  ('Growth','CLM-3.2',110),('Growth','FCT-1.1',95),('Growth','VOI-2.1',50),('Growth','CLM-3.4',80),('Growth','FCT-1.3',30),('Growth','VIS-5.4',30),('Growth','VIS-5.2',20),('Growth','CLM-4.1',15),
  ('Product','CLM-3.2',50),('Product','FCT-1.1',70),('Product','VOI-2.1',28),('Product','CLM-3.4',20),('Product','FCT-1.3',70),('Product','VIS-5.4',16),('Product','VIS-5.2',9),('Product','CLM-4.1',4),
  ('Support','CLM-3.2',32),('Support','FCT-1.1',36),('Support','VOI-2.1',30),('Support','CLM-3.4',16),('Support','FCT-1.3',13),('Support','VIS-5.4',20),('Support','VIS-5.2',10),('Support','CLM-4.1',10)
) as h(team, rule_id, total)
join (values ('Social','Priya Nair'),('Growth','Sam Okafor'),('Product','Ava Chen'),('Support','Tom Reyes')) as c(team, creator) on c.team = h.team
join (values ('2026-09', 0.3),('2026-10', 0.3),('2026-11', 0.4)) as m(month, share) on true
join (values ('CLM-3.2',31),('FCT-1.1',4),('VOI-2.1',27),('CLM-3.4',6),('FCT-1.3',3),('VIS-5.4',2),('VIS-5.2',5),('CLM-4.1',12)) as d(rule_id, pct) on d.rule_id = h.rule_id;
