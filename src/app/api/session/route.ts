import { HttpError, handle, parseBody } from "@/server/http";
import { getSession, roleCookie } from "@/server/auth";
import { SessionBody } from "@/server/schemas";
import { getRepo } from "@/server/repo";
import { DEMO_WORKSPACE } from "@/server/memoryRepo";

/** Current user (demo: defaults to a Creator). */
export async function GET(req: Request) {
  return handle(async () => getSession(req));
}

/** Demo sign-in by role (phase B1). Phase B3 replaces this with Supabase Auth. */
export async function POST(req: Request) {
  const res = await handle(async () => {
    const { role } = await parseBody(req, SessionBody);
    const user = await getRepo().getUserByRole(DEMO_WORKSPACE, role);
    if (!user) throw new HttpError(400, "Nobody has that role right now. Ask an Admin.");
    return { user, workspaceId: DEMO_WORKSPACE };
  });
  if (res.ok) {
    const { user } = (await res.clone().json()) as { user: { role: Parameters<typeof roleCookie>[0] } };
    res.headers.append("Set-Cookie", roleCookie(user.role));
  }
  return res;
}

export async function DELETE() {
  const res = Response.json({ ok: true });
  res.headers.append("Set-Cookie", roleCookie(null));
  return res;
}
