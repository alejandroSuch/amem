import bm25 from "wink-bm25-text-search";
import nlp from "wink-nlp-utils";
import type { Memory } from "./types.js";

const pipe = [
  nlp.string.lowerCase,
  nlp.string.tokenize0,
  nlp.tokens.removeWords,
  nlp.tokens.stem,
  nlp.tokens.propagateNegations,
];

export class SearchEngine {
  private engine!: ReturnType<typeof bm25>;
  private memories: Memory[] = [];
  private consolidated = false;

  rebuild(memories: Memory[]): void {
    this.memories = memories;
    this.engine = bm25();
    this.engine.defineConfig({ fldWeights: {
      name: 3,
      description: 2,
      keywords: 2,
      tags: 1,
      context: 1,
      content: 1,
    }});
    this.engine.definePrepTasks(pipe);

    for (const m of memories) {
      this.engine.addDoc({
        name: m.meta.name || "",
        description: m.meta.description || "",
        keywords: (m.meta.keywords || []).join(" "),
        tags: (m.meta.tags || []).join(" "),
        context: m.meta.context || "",
        content: m.content || "",
      }, m.id);
    }

    // BM25 requires >= 3 docs to consolidate
    if (memories.length >= 3) {
      this.engine.consolidate();
      this.consolidated = true;
    } else {
      this.consolidated = false;
    }
  }

  search(query: string, limit: number = 10): Memory[] {
    if (this.memories.length === 0) return [];
    // If not enough docs for BM25, fall back to simple substring match
    if (!this.consolidated) {
      const q = query.toLowerCase();
      return this.memories
        .filter((m) => {
          const text = [m.meta.name, m.meta.description, m.content, ...(m.meta.keywords || []), ...(m.meta.tags || [])].join(" ").toLowerCase();
          return q.split(/\s+/).some((term) => text.includes(term));
        })
        .slice(0, limit);
    }
    const results = this.engine.search(query, limit);
    const byId = new Map(this.memories.map((m) => [m.id, m]));
    return results.map((r: [string, number]) => byId.get(r[0])!).filter(Boolean);
  }
}
