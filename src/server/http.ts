import "server-only";
import type { z } from "zod";
import { unstable_rethrow } from "next/navigation";

/** An error with a plain-language message that is safe to show to the user. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Wraps a route handler: HttpError -> JSON {error}; anything else -> 500 without leaking details. */
export async function handle(fn: () => Promise<unknown>): Promise<Response> {
  try {
    return Response.json(await fn());
  } catch (e) {
    // Let Next.js's own control-flow signals (e.g. "this route is dynamic") pass through untouched.
    unstable_rethrow(e);
    if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
    console.error(e);
    return Response.json({ error: "Something went wrong on our side. Please try again." }, { status: 500 });
  }
}

/** Parses a JSON body with a zod schema; the first problem becomes a 400 message. */
export async function parseBody<T extends z.ZodType>(req: Request, schema: T): Promise<z.infer<T>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new HttpError(400, "The request body must be JSON.");
  }
  const r = schema.safeParse(raw);
  if (!r.success) throw new HttpError(400, r.error.issues[0]?.message ?? "Invalid request.");
  return r.data;
}
