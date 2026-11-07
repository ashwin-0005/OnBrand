import { handle, parseBody } from "@/server/http";
import { getSession } from "@/server/auth";
import { ReviewBody } from "@/server/schemas";
import { runReview } from "@/server/review";

/** Runs the full check pipeline on a draft (max 1500 chars). */
export async function POST(req: Request) {
  return handle(async () => {
    const session = await getSession(req);
    const { text } = await parseBody(req, ReviewBody);
    return runReview(session, text);
  });
}
