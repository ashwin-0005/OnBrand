import { handle, parseBody } from "@/server/http";
import { getSession } from "@/server/auth";
import { DecisionBody } from "@/server/schemas";
import { decide } from "@/server/actions";

/** Accept / edit / dispute one finding. Disputes without a reason are rejected (400). */
export async function POST(req: Request, ctx: RouteContext<"/api/submissions/[id]/decisions">) {
  return handle(async () => {
    const session = await getSession(req);
    const { id } = await ctx.params;
    return decide(session, id, await parseBody(req, DecisionBody));
  });
}
