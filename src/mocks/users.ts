import type { Role, User } from "@/types";

export const users: User[] = [
  { id: "u1", name: "Priya Nair", role: "Creator", team: "Social" },
  { id: "u2", name: "Sam Okafor", role: "Creator", team: "Growth" },
  { id: "u6", name: "Ava Chen", role: "Creator", team: "Product" },
  { id: "u7", name: "Tom Reyes", role: "Creator", team: "Support" },
  { id: "u3", name: "Lena Brandt", role: "Brand manager", team: "Brand" },
  { id: "u4", name: "Diego Ruiz", role: "Reviewer", team: "Legal" },
  { id: "u5", name: "Mei Tanaka", role: "Admin", team: "Brand Ops" },
];

export const roleNeeds: Record<Role, string> = {
  Creator: "Submits content and wants fast feedback.",
  "Brand manager": "Wants to see recurring errors.",
  Reviewer: "Needs evidence and an audit trail.",
  Admin: "Manages guidelines, versions and access.",
};
