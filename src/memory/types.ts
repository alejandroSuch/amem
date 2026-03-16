export const STANDARD_TAGS = [
  "workflow",
  "tooling",
  "testing",
  "style",
  "architecture",
  "security",
  "performance",
  "dependencies",
] as const;

export type StandardTag = (typeof STANDARD_TAGS)[number];

const CUSTOM_TAG_RE = /^custom:.+$/;

export function validateTags(tags: string[]): { valid: true } | { valid: false; invalid: string[] } {
  const invalid = tags.filter(
    (t) => !(STANDARD_TAGS as readonly string[]).includes(t) && !CUSTOM_TAG_RE.test(t)
  );
  if (invalid.length) return { valid: false, invalid };
  return { valid: true };
}

export interface MemoryMeta {
  name: string;
  description: string;
  type: "user" | "feedback" | "project" | "reference";
  keywords?: string[];
  tags?: string[];
  context?: string;
  links?: string[];
  created: string;
  updated: string;
}

export interface Memory {
  id: string; // filename without .md
  meta: MemoryMeta;
  content: string;
}

export type MemoryScope = "global" | "project";
