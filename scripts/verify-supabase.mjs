// Checks YOUR Supabase project end to end: demo sign-in works and row-level security holds.
// Needs in .env.local: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, DEMO_PASSWORD.
import { createClient } from "@supabase/supabase-js";

process.loadEnvFile?.(".env.local");
const { NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_ANON_KEY: anon, DEMO_PASSWORD: password } = process.env;
if (!url || !anon || !password) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY or DEMO_PASSWORD in .env.local");
  process.exit(1);
}
const mk = () => createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
let failed = 0;
const check = (name, ok, extra = "") => {
  console.log((ok ? "PASS " : "FAIL ") + name + (ok ? "" : " " + extra));
  if (!ok) failed++;
};
async function login(email) {
  const c = mk();
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw new Error(email + ": " + error.message);
  return c;
}

const anonClient = mk();
const signedOut = await anonClient.from("rules").select("id");
check("signed-out users see no rules", !signedOut.data?.length, JSON.stringify(signedOut.error ?? signedOut.data));

const creator = await login("priya@zippy.test");
const reviewer = await login("diego@zippy.test");
const admin = await login("mei@zippy.test");

const rules = await creator.from("rules").select("id");
check("creator sees the 8 guidelines", rules.data?.length === 8, JSON.stringify(rules.error));

const { data: me } = await creator.auth.getUser();
const sub = await creator.from("submissions").insert({ text: "verify run" }).select().single();
check("creator can create a submission", !!sub.data, JSON.stringify(sub.error));
const id = sub.data?.id;

const f = await creator
  .from("findings")
  .insert({
    id: crypto.randomUUID(),
    submission_id: id,
    issue: "x",
    rule_id: "CLM-3.4",
    severity: "High",
    confidence: 0.9,
    explanation: "x",
    phrase: "verify",
    source: "deterministic",
  })
  .select()
  .single();
check("creator can save findings", !!f.data, JSON.stringify(f.error));

const bad = await creator
  .from("decisions")
  .insert({ submission_id: id, finding_id: f.data?.id, state: "disputed", reason: " " });
check(
  "dispute without a reason is rejected",
  !!bad.error && /dispute_needs_reason/.test(bad.error.message),
  JSON.stringify(bad.error),
);

const ap1 = await creator
  .from("submissions")
  .update({ status: "approved", approved_at: new Date().toISOString(), approved_by: me.user.id })
  .eq("id", id)
  .select();
check("creator cannot approve", !ap1.data?.length);
const { data: rv } = await reviewer.auth.getUser();
const ap2 = await reviewer
  .from("submissions")
  .update({ status: "approved", approved_at: new Date().toISOString(), approved_by: rv.user.id })
  .eq("id", id)
  .select();
check("reviewer can approve", ap2.data?.length === 1, JSON.stringify(ap2.error));

const role1 = await creator.from("profiles").update({ role: "Admin" }).eq("user_id", me.user.id).select();
check("creator cannot make themselves Admin", !role1.data?.length);
const rule1 = await creator.from("rules").update({ title: "hacked" }).eq("id", "CLM-3.2").select();
check("creator cannot edit guidelines", !rule1.data?.length);
const rule2 = await admin.from("rules").select("id").eq("id", "CLM-3.2");
check("admin can read guidelines", rule2.data?.length === 1);

// Tidy: no app role may delete submissions, so only the service key (if present) can remove the test row.
if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
  await createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    .from("submissions")
    .delete()
    .eq("id", id);
} else {
  console.log("(Test submission left in the database: add SUPABASE_SERVICE_ROLE_KEY to .env.local to auto-clean it.)");
}
console.log(failed ? "\n" + failed + " check(s) FAILED" : "\nAll checks passed.");
process.exit(failed ? 1 : 0);
