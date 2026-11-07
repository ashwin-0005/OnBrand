/**
 * PRIVACY: strip sensitive text before any AI call.
 * Replaced with labelled placeholders so the AI still understands the sentence.
 */
const PATTERNS: [RegExp, string][] = [
  [/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, "[EMAIL]"],
  [/\bhttps?:\/\/\S+|\bwww\.\S+/gi, "[URL]"],
  [/\b(?:\d[ -]?){13,19}\b/g, "[CARD]"],
  [/(?:\+\d{1,3}[ -]?)?(?:\(\d{2,4}\)[ -]?)?\d{3,5}[ -]\d{3,6}(?:[ -]\d{2,4})?\b/g, "[PHONE]"],
];

export function redact(text: string): string {
  return PATTERNS.reduce((t, [re, label]) => t.replace(re, label), text);
}
