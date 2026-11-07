import { handle } from "@/server/http";
import { getSession } from "@/server/auth";
import { getRepo } from "@/server/repo";

export async function GET(req: Request) {
  return handle(async () => getRepo().listUsers((await getSession(req)).workspaceId));
}
