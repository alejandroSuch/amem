import { readdir, readFile, writeFile, unlink, mkdir } from "fs/promises";
import { join } from "path";
import type { Memory } from "./types.js";
import { parseMemory, serializeMemory } from "../utils/frontmatter.js";

export class MemoryStore {
  constructor(private dir: string) {}

  async init(): Promise<void> {
    await mkdir(this.dir, { recursive: true });
  }

  async loadAll(): Promise<Memory[]> {
    const files = await readdir(this.dir);
    const mdFiles = files.filter((f) => f.endsWith(".md") && f !== "MEMORY.md");
    const memories: Memory[] = [];
    for (const file of mdFiles) {
      try {
        const raw = await readFile(join(this.dir, file), "utf-8");
        memories.push(parseMemory(file.replace(/\.md$/, ""), raw));
      } catch {
        // skip unreadable files
      }
    }
    return memories;
  }

  async save(memory: Memory): Promise<void> {
    await writeFile(join(this.dir, `${memory.id}.md`), serializeMemory(memory));
  }

  async load(id: string): Promise<Memory | null> {
    try {
      const raw = await readFile(join(this.dir, `${id}.md`), "utf-8");
      return parseMemory(id, raw);
    } catch {
      return null;
    }
  }

  async remove(id: string): Promise<boolean> {
    try {
      await unlink(join(this.dir, `${id}.md`));
      return true;
    } catch {
      return false;
    }
  }
}
