import {
  CalendarClock,
  ImageOff,
  MessageSquareWarning,
  ShieldAlert,
  Lock,
  Users,
  Eye,
  Accessibility,
} from "lucide-react";

export const problems = [
  {
    icon: CalendarClock,
    title: "Outdated facts",
    body: "Old prices, dead features, stale stats.",
    sample: "“Only $5/month!” (it's $9 now)",
  },
  {
    icon: ShieldAlert,
    title: "Unsupported claims",
    body: "“Best”, “guaranteed”, “clinically proven”.",
    sample: "“Guaranteed results in 7 days!”",
  },
  {
    icon: MessageSquareWarning,
    title: "Voice drift",
    body: "Inconsistent tone across people and AI tools.",
    sample: "“THE BEST DEAL EVER!!!”",
  },
  {
    icon: ImageOff,
    title: "Off-brand visuals",
    body: "Wrong logo, low contrast, missing alt text.",
    sample: "Hero image with no alt text",
  },
];

export const steps = [
  {
    title: "Import",
    body: "Bring in your guidelines, facts and terms. They become the knowledge base that every finding cites.",
  },
  {
    title: "Submit",
    body: "Drop in text, an image or a PDF. Creators get feedback in seconds, before anything goes public.",
  },
  {
    title: "Analyse",
    body: "Plain code checks run first: banned terms, alt text, contrast, stale dates. Then retrieval and AI look for subtler issues.",
  },
  {
    title: "Explain",
    body: "Each finding points at the exact words, cites its source rule, and suggests a fix in plain language.",
  },
  { title: "Decide", body: "You accept, edit or dispute. A dispute needs a reason, and every choice is saved." },
  { title: "Approve", body: "Reviewers sign off with comments. The full history stays with the content." },
];

export const loop = [
  "Every action saved as a revision",
  "Insights by rule, team, creator",
  "Admins fix unclear guidelines",
];

export const responsible = [
  {
    icon: Lock,
    title: "Privacy and security",
    body: "Sensitive text is redacted before AI calls. Workspaces are isolated. The API key never reaches the browser.",
  },
  {
    icon: Users,
    title: "Human oversight",
    body: "Suggestions only. Never auto-publish or auto-rewrite. Overrides need a reason and are logged.",
  },
  {
    icon: Eye,
    title: "Transparency",
    body: "AI use is labelled. Every finding cites an approved source and shows its confidence. No source, no finding.",
  },
  {
    icon: Accessibility,
    title: "Fairness and access",
    body: "Built to WCAG 2.2 AA: keyboard and screen-reader friendly, with reduced motion.",
  },
];

/** Illustrative targets for a synthetic pilot, not measured results. */
export const benefits = [
  { value: 40, suffix: "%", title: "Fewer corrections", body: "after content goes live" },
  { value: 3, suffix: "×", title: "Faster review", body: "evidence arrives with every flag" },
  { value: 35, suffix: "%", title: "Fewer repeat errors", body: "insights show which rules fail" },
  { value: 100, suffix: "%", title: "Full audit trail", body: "every decision saved with a reason" },
];
