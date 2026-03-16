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
  return matter.stringify(`\n${memory.content}\n`, memory.meta);
}
