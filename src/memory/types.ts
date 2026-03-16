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
