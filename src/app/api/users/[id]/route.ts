import { handle, parseBody } from "@/server/http";
import { getSession } from "@/server/auth";
import { RoleChangeBody } from "@/server/schemas";
import { changeRole } from "@/server/actions";

/** Admin only. */
export async function PATCH(req: Request, ctx: RouteContext<"/api/users/[id]">) {
  return handle(async () => {
    const session = await getSession(req);
    const { role } = await parseBody(req, RoleChangeBody);
    return changeRole(session, (await ctx.params).id, role);
  });
}
