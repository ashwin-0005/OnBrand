import { z } from "zod";
import { MAX_DRAFT_CHARS } from "@/content/demo";

export const RoleSchema = z.enum(["Creator", "Brand manager", "Reviewer", "Admin"]);
export const SeveritySchema = z.enum(["High", "Medium", "Low"]);

export const ReviewBody = z.object({
  text: z
    .string({ error: "Please send the draft text." })
    .trim()
    .min(1, "The draft is empty. Paste some text to check.")
    .max(MAX_DRAFT_CHARS, `Drafts can be at most ${MAX_DRAFT_CHARS} characters on the free plan.`),
});

/** What every AI provider must return (one item). The server adds id + source. */
export const AiFindingSchema = z.object({
  issue: z.string().trim().min(1),
  /** May be empty/missing: the citation gate then drops it as "no source found". */
  rule_id: z.string().trim().default(""),
  severity: SeveritySchema,
  confidence: z.number().min(0).max(1),
  explanation: z.string().trim().min(1),
  suggested_fix: z.string().trim(),
  phrase: z.string().trim().min(1),
});
export const AiOutputSchema = z.object({ findings: z.array(AiFindingSchema) });
export type AiFinding = z.infer<typeof AiFindingSchema>;

/** Human decision. Disputes MUST carry a written reason (also enforced by a DB CHECK in phase B3). */
export const DecisionBody = z
  .object({
    findingId: z.string().min(1),
    decision: z.object({
      state: z.enum(["accepted", "edited", "disputed"]),
      fix: z.string().trim().max(2000).optional(),
      reason: z.string().trim().max(2000).optional(),
    }),
  })
  .superRefine((v, ctx) => {
    const d = v.decision;
    if (d.state === "disputed" && !d.reason)
      ctx.addIssue({ code: "custom", message: "A dispute needs a written reason. Overrides are audited." });
    if (d.state === "edited" && !d.fix) ctx.addIssue({ code: "custom", message: "An edit needs the new text." });
  });

export const CommentBody = z.object({
  text: z.string().trim().min(1, "Comment is empty.").max(2000, "Comments can be at most 2000 characters."),
});

export const SessionBody = z.object({ role: RoleSchema });
export const RoleChangeBody = z.object({ role: RoleSchema });
