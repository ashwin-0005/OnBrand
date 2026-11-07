import "server-only";
import type { Role, Session } from "@/types";
import { getRepo } from "./repo";
import { DEMO_WORKSPACE } from "./memoryRepo";
import { HttpError } from "./http";
import { RoleSchema } from "./schemas";

/** Demo session cookie (phase B1). Phase B3 replaces this with Supabase Auth. */
export const ROLE_COOKIE = "onbrand_demo_role";
const DEFAULT_ROLE: Role = "Creator";

function readCookie(req: Request, name: string): string | undefined {
  const raw = req.headers.get("cookie") ?? "";
  for (const part of raw.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return undefined;
}

/**
 * Current user. Demo mode: the role chosen on /login (cookie), defaulting to a Creator
 * so first-time visitors can try a review without signing in. Permissions are still enforced.
 */
export async function getSession(req: Request): Promise<Session> {
  const parsed = RoleSchema.safeParse(readCookie(req, ROLE_COOKIE));
  const role = parsed.success ? parsed.data : DEFAULT_ROLE;
  const user = await getRepo().getUserByRole(DEMO_WORKSPACE, role);
  if (!user) throw new HttpError(401, "Please sign in.");
  return { user, workspaceId: DEMO_WORKSPACE };
}

export function requireRole(session: Session, roles: Role[], action: string) {
  if (!roles.includes(session.user.role))
    throw new HttpError(403, `Only ${roles.join(" or ")} can ${action}. You are signed in as ${session.user.role}.`);
}

export function roleCookie(role: Role | null): string {
  const base = `${ROLE_COOKIE}=${role ? encodeURIComponent(role) : ""}; Path=/; HttpOnly; SameSite=Lax`;
  return role ? `${base}; Max-Age=${60 * 60 * 24 * 7}` : `${base}; Max-Age=0`;
}
