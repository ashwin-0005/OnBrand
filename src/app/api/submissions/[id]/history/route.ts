import { handle } from "@/server/http";
import { getSession } from "@/server/auth";
import { history } from "@/server/actions";

export async function GET(req: Request, ctx: RouteContext<"/api/submissions/[id]/history">) {
  return handle(async () => history(await getSession(req), (await ctx.params).id));
}
