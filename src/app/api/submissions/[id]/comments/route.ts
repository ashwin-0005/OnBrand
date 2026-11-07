import { handle, parseBody } from "@/server/http";
import { getSession } from "@/server/auth";
import { CommentBody } from "@/server/schemas";
import { comment, comments } from "@/server/actions";

export async function GET(req: Request, ctx: RouteContext<"/api/submissions/[id]/comments">) {
  return handle(async () => comments(await getSession(req), (await ctx.params).id));
}

export async function POST(req: Request, ctx: RouteContext<"/api/submissions/[id]/comments">) {
  return handle(async () => {
    const session = await getSession(req);
    const { text } = await parseBody(req, CommentBody);
    return comment(session, (await ctx.params).id, text);
  });
}
