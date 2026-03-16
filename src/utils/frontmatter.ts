import matter from "gray-matter";
import type { Memory, MemoryMeta } from "../memory/types.js";

export function parseMemory(id: string, raw: string): Memory {
  const { data, content } = matter(raw);
  return {
    id,
    meta: data as MemoryMeta,
    content: content.trim(),
  };
}

export function serializeMemory(memory: Memory): string {
  // Strip undefined values — gray-matter/js-yaml can't serialize them
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(memory.meta)) {
    if (v !== undefined) clean[k] = v;
  }
  return matter.stringify(`\n${memory.content}\n`, clean);
}
