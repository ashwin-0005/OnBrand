// @vitest-environment node
// Runs the REAL migration + seed in PGlite (free, in-process Postgres) and proves the RLS rules.
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";

const sql = (f: string) => readFileSync(new URL(`../../supabase/${f}`, import.meta.url), "utf8");
const WS_A = "00000000-0000-4000-8000-0000000000a1";
const WS_B = "00000000-0000-4000-8000-0000000000b2";
const U = {
  creatorA: "00000000-0000-4000-8000-000000000001",
  reviewerA: "00000000-0000-4000-8000-000000000002",
  adminA: "00000000-0000-4000-8000-000000000003",
  creatorB: "00000000-0000-4000-8000-000000000004",
};

let db: PGlite;

/** Run as a signed-in user (like PostgREST does): role `authenticated` + the user's id in the JWT claim. */
async function as<T>(user: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec(
    user ? `set role authenticated; select set_config('request.jwt.claim.sub', '${user}', false);` : "set role anon;",
  );
  try {
    return await fn();
  } finally {
    await db.exec("reset role; select set_config('request.jwt.claim.sub', '', false);");
  }
}
const q = async (text: string, params: unknown[] = []) =>
  (await db.query(text, params)).rows as Record<string, unknown>[];
const rejects = async (p: Promise<unknown>) =>
  p.then(
    () => null,
    (e: Error) => e.message,
  );

beforeAll(async () => {
  db = new PGlite();
  // Minimal stand-in for Supabase's auth schema + roles.
  await db.exec(`
    create role anon nologin; create role authenticated nologin;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable
      as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  `);
  await db.exec(sql("migrations/0001_init.sql"));
  await db.exec(sql("seed.sql"));
  await db.exec(`
    insert into public.workspaces (id, name) values ('${WS_B}', 'Other Co');
    insert into auth.users (id) values ('${U.creatorA}'), ('${U.reviewerA}'), ('${U.adminA}'), ('${U.creatorB}');
    insert into public.profiles (user_id, workspace_id, name, team, role) values
      ('${U.creatorA}', '${WS_A}', 'Priya Nair', 'Social', 'Creator'),
      ('${U.reviewerA}', '${WS_A}', 'Diego Ruiz', 'Legal', 'Reviewer'),
      ('${U.adminA}', '${WS_A}', 'Mei Tanaka', 'Brand Ops', 'Admin'),
      ('${U.creatorB}', '${WS_B}', 'Bo Other', 'Social', 'Creator');
  `);
});

describe("migration + seed", () => {
  it("seeds the Zippy Apps demo workspace, and the seed can be re-run", async () => {
    await db.exec(sql("seed.sql"));
    // Re-seeding deletes profiles (cascade); put them back for the following tests.
    await db.exec(`insert into public.profiles (user_id, workspace_id, name, team, role) values
      ('${U.creatorA}', '${WS_A}', 'Priya Nair', 'Social', 'Creator'),
      ('${U.reviewerA}', '${WS_A}', 'Diego Ruiz', 'Legal', 'Reviewer'),
      ('${U.adminA}', '${WS_A}', 'Mei Tanaka', 'Brand Ops', 'Admin')`);
    expect((await q("select count(*)::int n from public.rules"))[0].n).toBe(8);
    expect((await q("select count(*)::int n from public.insights_history"))[0].n).toBe(96);
    const v = await q("select count(*)::int n from public.rule_versions where rule_id = 'CLM-3.2'");
    expect(v[0].n).toBe(4);
  });
});

describe("workspace isolation (RLS)", () => {
  it("members see only their own workspace's guidelines and people", async () => {
    expect((await as(U.creatorA, () => q("select id from public.rules"))).length).toBe(8);
    expect(await as(U.creatorB, () => q("select id from public.rules"))).toEqual([]);
    const people = await as(U.creatorB, () => q("select name from public.profiles"));
    expect(people.map((p) => p.name)).toEqual(["Bo Other"]);
  });

  it("signed-out (anon) users can read nothing", async () => {
    expect(await as(null, () => rejects(db.query("select * from public.rules")))).toMatch(/permission denied/);
  });

  it("a user cannot create data in someone else's workspace or as someone else", async () => {
    const e1 = await as(U.creatorA, () =>
      rejects(db.query("insert into public.submissions (workspace_id, text) values ($1, 'x')", [WS_B])),
    );
    expect(e1).toMatch(/row-level security/);
    const e2 = await as(U.creatorA, () =>
      rejects(db.query("insert into public.submissions (author_id, text) values ($1, 'x')", [U.reviewerA])),
    );
    expect(e2).toMatch(/row-level security/);
  });
});

describe("review data and permissions", () => {
  let sub: string;
  const finding = "11111111-1111-4111-8111-111111111111";

  beforeAll(async () => {
    sub = (
      await as(U.creatorA, () => q("insert into public.submissions (text) values ('Guaranteed results!') returning id"))
    )[0].id as string;
    await as(U.creatorA, () =>
      db.query(
        `insert into public.findings (id, submission_id, issue, rule_id, severity, confidence, explanation, phrase, source)
         values ($1, $2, 'Promised outcome', 'CLM-3.4', 'High', 0.99, 'x', 'Guaranteed results!', 'deterministic')`,
        [finding, sub],
      ),
    );
  });

  it("workspace B cannot see workspace A's submissions or findings", async () => {
    expect(await as(U.creatorB, () => q("select id from public.submissions"))).toEqual([]);
    expect(await as(U.creatorB, () => q("select id from public.findings"))).toEqual([]);
    expect((await as(U.reviewerA, () => q("select id from public.submissions"))).length).toBe(1);
  });

  it("a dispute without a reason is rejected by the database itself", async () => {
    const blank = await as(U.creatorA, () =>
      rejects(
        db.query(
          "insert into public.decisions (submission_id, finding_id, state, reason) values ($1, $2, 'disputed', '   ')",
          [sub, finding],
        ),
      ),
    );
    expect(blank).toMatch(/dispute_needs_reason/);
    const none = await as(U.creatorA, () =>
      rejects(
        db.query("insert into public.decisions (submission_id, finding_id, state) values ($1, $2, 'disputed')", [
          sub,
          finding,
        ]),
      ),
    );
    expect(none).toMatch(/dispute_needs_reason/);
    await as(U.creatorA, () =>
      db.query(
        "insert into public.decisions (submission_id, finding_id, state, reason) values ($1, $2, 'disputed', 'We have a benchmark.')",
        [sub, finding],
      ),
    );
  });

  it("only Reviewer/Admin can approve, and it is recorded against the approver", async () => {
    const byCreator = await as(U.creatorA, () =>
      q("update public.submissions set status='approved', approved_at=now(), approved_by=$1 where id=$2 returning id", [
        U.creatorA,
        sub,
      ]),
    );
    expect(byCreator).toEqual([]);
    const spoof = await as(U.reviewerA, () =>
      rejects(db.query("update public.submissions set status='approved', approved_by=$1 where id=$2", [U.adminA, sub])),
    );
    expect(spoof).toMatch(/row-level security/);
    const ok = await as(U.reviewerA, () =>
      q(
        "update public.submissions set status='approved', approved_at=now(), approved_by=$1 where id=$2 returning approved_by",
        [U.reviewerA, sub],
      ),
    );
    expect(ok[0].approved_by).toBe(U.reviewerA);
  });

  it("comments cannot be written as another person", async () => {
    const e = await as(U.creatorA, () =>
      rejects(
        db.query("insert into public.comments (submission_id, author_id, text) values ($1, $2, 'hi')", [
          sub,
          U.reviewerA,
        ]),
      ),
    );
    expect(e).toMatch(/row-level security/);
    await as(U.creatorA, () => db.query("insert into public.comments (submission_id, text) values ($1, 'ok')", [sub]));
  });

  it("the revision trail is append-only", async () => {
    await as(U.creatorA, () =>
      db.query("insert into public.revisions (submission_id, action) values ($1, 'checked')", [sub]),
    );
    expect(await as(U.creatorA, () => q("update public.revisions set detail='edited' returning id"))).toEqual([]);
    expect(await as(U.adminA, () => q("delete from public.revisions returning id"))).toEqual([]);
    expect((await as(U.creatorA, () => q("select id from public.revisions"))).length).toBe(1);
  });

  it("live_insights counts real findings and decisions for the viewer's workspace only", async () => {
    const rows = await as(U.adminA, () => q("select rule_id, creator, count, disputed from public.live_insights"));
    expect(rows).toEqual([{ rule_id: "CLM-3.4", creator: "Priya Nair", count: 1, disputed: 1 }]);
    expect(await as(U.creatorB, () => q("select * from public.live_insights"))).toEqual([]);
  });
});

describe("admin-only actions", () => {
  it("only an Admin of the same workspace can change roles", async () => {
    const asCreator = await as(U.creatorA, () =>
      q("update public.profiles set role='Admin' where user_id=$1 returning user_id", [U.creatorA]),
    );
    expect(asCreator).toEqual([]);
    const crossWs = await as(U.adminA, () =>
      q("update public.profiles set role='Admin' where user_id=$1 returning user_id", [U.creatorB]),
    );
    expect(crossWs).toEqual([]);
    const ok = await as(U.adminA, () =>
      q("update public.profiles set role='Brand manager' where user_id=$1 returning role", [U.creatorA]),
    );
    expect(ok[0].role).toBe("Brand manager");
    await as(U.adminA, () => db.query("update public.profiles set role='Creator' where user_id=$1", [U.creatorA]));
  });

  it("only an Admin can edit guidelines", async () => {
    expect(await as(U.creatorA, () => q("update public.rules set title='x' returning id"))).toEqual([]);
    const ok = await as(U.adminA, () =>
      q("update public.rules set version = version + 1 where id='CLM-3.2' returning version"),
    );
    expect(ok[0].version).toBe(5);
  });
});
