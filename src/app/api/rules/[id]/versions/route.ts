import { handle } from "@/server/http";
import { getSession } from "@/server/auth";
import { getRepo } from "@/server/repo";

export async function GET(req: Request, ctx: RouteContext<"/api/rules/[id]/versions">) {
  return handle(async () => getRepo().getRuleVersions((await getSession(req)).workspaceId, (await ctx.params).id));
}
