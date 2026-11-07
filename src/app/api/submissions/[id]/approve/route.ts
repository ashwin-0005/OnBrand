import { handle } from "@/server/http";
import { getSession } from "@/server/auth";
import { approve } from "@/server/actions";

/** Reviewer/Admin sign-off. Records who and when. Never publishes anything. */
export async function POST(req: Request, ctx: RouteContext<"/api/submissions/[id]/approve">) {
  return handle(async () => approve(await getSession(req), (await ctx.params).id));
}
