import { handle, parseBody } from "@/server/http";
import { clearCookies, getSession, signInDemo } from "@/server/auth";
import { SessionBody } from "@/server/schemas";

/** Current user. Never includes the access token. */
export async function GET(req: Request) {
  return handle(async () => {
    const { user, workspaceId } = await getSession(req);
    return { user, workspaceId };
  });
}

/** Demo sign-in by role (real Supabase Auth session when Supabase is configured). */
export async function POST(req: Request) {
  return handle(async () => {
    const { role } = await parseBody(req, SessionBody);
    const { session, cookies } = await signInDemo(role);
    const res = Response.json(session);
    cookies.forEach((c) => res.headers.append("Set-Cookie", c));
    return res;
  });
}

export async function DELETE() {
  const res = Response.json({ ok: true });
  clearCookies().forEach((c) => res.headers.append("Set-Cookie", c));
  return res;
}
