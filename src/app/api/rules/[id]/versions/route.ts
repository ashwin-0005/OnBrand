import { handle } from "@/server/http";
import { getSession } from "@/server/auth";
import { getRepo } from "@/server/repo";

export async function GET(req: Request, ctx: RouteContext<"/api/rules/[id]/versions">) {
  return handle(async () => {
    const session = await getSession(req);
    return getRepo(session).getRuleVersions(session.workspaceId, (await ctx.params).id);
  });
}
