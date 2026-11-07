import type { Role } from "@/types";

/** Plain-language need of each role (UI copy, from CLAUDE.md). */
export const roleNeeds: Record<Role, string> = {
  Creator: "Submits content and wants fast feedback.",
  "Brand manager": "Wants to see recurring errors.",
  Reviewer: "Needs evidence and an audit trail.",
  Admin: "Manages guidelines, versions and access.",
};
