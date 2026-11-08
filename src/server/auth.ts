import "server-only";
import { cookies } from "next/headers";
import type { Role, Session } from "@/types";
import { memoryRepo } from "./repo";
import { DEMO_WORKSPACE } from "./memoryRepo";
import { HttpError } from "./http";
import { RoleSchema } from "./schemas";
import { supabaseConfigured, userClient, type ServerSession } from "./mode";

/**
 * Two modes, same interface:
 *  - Supabase (URL + anon key set): real Supabase Auth. The access/refresh tokens live in httpOnly cookies.
 *  - Otherwise: a demo role cookie against the in-memory store (visitors without a role act as a Creator).
 */
export const ROLE_COOKIE = "onbrand_demo_role";
const AT = "onbrand_at";
const RT = "onbrand_rt";
const DEFAULT_ROLE: Role = "Creator";

/** Seeded demo sign-ins (scripts/seed-users.mjs). Password comes from DEMO_PASSWORD (server env only). */
export const DEMO_EMAILS: Record<Role, string> = {
  Creator: "priya@zippy.test",
  "Brand manager": "lena@zippy.test",
  Reviewer: "diego@zippy.test",
  Admin: "mei@zippy.test",
};

function readCookie(req: Request, name: string): string | undefined {
  const raw = req.headers.get("cookie") ?? "";
  for (const part of raw.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return undefined;
}

const secure = () => (process.env.NODE_ENV === "production" ? "; Secure" : "");
const cookie = (name: string, value: string, maxAge: number) =>
  `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure()}`;

const authCookies = (s: { access_token: string; refresh_token: string; expires_in: number }) => [
  cookie(AT, s.access_token, s.expires_in),
  cookie(RT, s.refresh_token, 60 * 60 * 24 * 7),
];

export const roleCookie = (role: Role | null) => cookie(ROLE_COOKIE, role ?? "", role ? 60 * 60 * 24 * 7 : 0);
export const clearCookies = () => [roleCookie(null), cookie(AT, "", 0), cookie(RT, "", 0)];

async function profileFor(token: string, userId: string): Promise<Session> {
  const { data, error } = await userClient(token)
    .from("profiles")
    .select("user_id, workspace_id, name, team, role")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new HttpError(500, "Could not load your profile. Please try again.");
  if (!data) throw new HttpError(403, "Your account isn't part of a workspace yet. Ask an Admin.");
  return {
    workspaceId: data.workspace_id as string,
    user: { id: data.user_id as string, name: data.name as string, team: data.team as string, role: data.role as Role },
  };
}

async function supabaseSession(req: Request): Promise<ServerSession> {
  const auth = userClient().auth;
  let token = readCookie(req, AT);
  const refresh = readCookie(req, RT);
  let userId: string | undefined;

  if (token) userId = (await auth.getUser(token)).data.user?.id; // asks Supabase Auth to validate the token
  if (!userId && refresh) {
    const { data } = await auth.refreshSession({ refresh_token: refresh });
    if (data.session) {
      token = data.session.access_token;
      userId = data.session.user.id;
      try {
        const jar = await cookies();
        const s = data.session;
        const opts = {
          httpOnly: true,
          sameSite: "lax" as const,
          path: "/",
          secure: process.env.NODE_ENV === "production",
        };
        jar.set(AT, s.access_token, { ...opts, maxAge: s.expires_in });
        jar.set(RT, s.refresh_token, { ...opts, maxAge: 60 * 60 * 24 * 7 });
      } catch {
        /* cookies can't be set here; the next sign-in refreshes them */
      }
    }
  }
  if (!userId || !token) throw new HttpError(401, "Please sign in.");
  return { ...(await profileFor(token, userId)), token };
}

/** Current user. Supabase mode requires a real sign-in (401 otherwise). */
export async function getSession(req: Request): Promise<ServerSession> {
  if (supabaseConfigured()) return supabaseSession(req);
  const parsed = RoleSchema.safeParse(readCookie(req, ROLE_COOKIE));
  const role = parsed.success ? parsed.data : DEFAULT_ROLE;
  const user = await memoryRepo().getUserByRole(DEMO_WORKSPACE, role);
  if (!user) throw new HttpError(401, "Please sign in.");
  return { user, workspaceId: DEMO_WORKSPACE };
}

/** Demo sign-in by role. Returns the session (without the token) and the cookies to set. */
export async function signInDemo(role: Role): Promise<{ session: Session; cookies: string[] }> {
  if (!supabaseConfigured()) {
    const user = await memoryRepo().getUserByRole(DEMO_WORKSPACE, role);
    if (!user) throw new HttpError(400, "Nobody has that role right now. Ask an Admin.");
    return { session: { user, workspaceId: DEMO_WORKSPACE }, cookies: [roleCookie(role)] };
  }
  const password = process.env.DEMO_PASSWORD;
  if (!password) throw new HttpError(503, "Demo sign-in isn't set up (DEMO_PASSWORD is missing on the server).");
  const { data, error } = await userClient().auth.signInWithPassword({ email: DEMO_EMAILS[role], password });
  if (error || !data.session) {
    console.warn("[auth] demo sign-in failed:", error?.message);
    throw new HttpError(400, "Demo sign-in failed. Has `npm run seed:users` been run?");
  }
  return { session: await profileFor(data.session.access_token, data.user.id), cookies: authCookies(data.session) };
}

export function requireRole(session: Session, roles: Role[], action: string) {
  if (!roles.includes(session.user.role))
    throw new HttpError(403, `Only ${roles.join(" or ")} can ${action}. You are signed in as ${session.user.role}.`);
}
