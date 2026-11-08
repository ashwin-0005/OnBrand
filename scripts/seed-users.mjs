// Creates the 7 demo sign-in users in YOUR free Supabase project and links them to the Zippy Apps workspace.
// Run AFTER supabase/migrations/0001_init.sql and supabase/seed.sql. Needs (in .env.local):
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DEMO_PASSWORD
// The service-role key is used only here, never by the app. Safe to re-run.
import { createClient } from "@supabase/supabase-js";

process.loadEnvFile?.(".env.local");
const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key, DEMO_PASSWORD: password } = process.env;
if (!url || !key || !password) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or DEMO_PASSWORD in .env.local");
  process.exit(1);
}
if (password.length < 8) {
  console.error("DEMO_PASSWORD must be at least 8 characters.");
  process.exit(1);
}

const WS = "00000000-0000-4000-8000-0000000000a1";
const people = [
  ["priya@zippy.test", "Priya Nair", "Social", "Creator"],
  ["sam@zippy.test", "Sam Okafor", "Growth", "Creator"],
  ["ava@zippy.test", "Ava Chen", "Product", "Creator"],
  ["tom@zippy.test", "Tom Reyes", "Support", "Creator"],
  ["lena@zippy.test", "Lena Brandt", "Brand", "Brand manager"],
  ["diego@zippy.test", "Diego Ruiz", "Legal", "Reviewer"],
  ["mei@zippy.test", "Mei Tanaka", "Brand Ops", "Admin"],
];

const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const { count } = await sb.from("workspaces").select("id", { count: "exact", head: true }).eq("id", WS);
if (!count) {
  console.error("Workspace not found. Run supabase/seed.sql in the SQL editor first.");
  process.exit(1);
}

const { data: existing, error: listError } = await sb.auth.admin.listUsers({ perPage: 1000 });
if (listError) throw listError;
const byEmail = new Map(existing.users.map((u) => [u.email, u.id]));

for (const [email, name, team, role] of people) {
  let id = byEmail.get(email);
  if (id) {
    const { error } = await sb.auth.admin.updateUserById(id, { password, email_confirm: true });
    if (error) throw error;
  } else {
    const { data, error } = await sb.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw error;
    id = data.user.id;
  }
  const { error } = await sb.from("profiles").upsert({ user_id: id, workspace_id: WS, name, team, role });
  if (error) throw error;
  console.log("ok", email, "->", role);
}
console.log("Done. Demo sign-in is ready.");
