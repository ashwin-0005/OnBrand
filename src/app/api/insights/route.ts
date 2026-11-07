import { handle } from "@/server/http";
import { getSession } from "@/server/auth";
import { insights } from "@/server/actions";

/** Optional filters: ?rule=&team=&creator=&from=YYYY-MM&to=YYYY-MM */
export async function GET(req: Request) {
  return handle(async () => {
    const q = new URL(req.url).searchParams;
    const get = (k: string) => q.get(k) || undefined;
    return insights(await getSession(req), {
      rule: get("rule"),
      team: get("team"),
      creator: get("creator"),
      from: get("from"),
      to: get("to"),
    });
  });
}
