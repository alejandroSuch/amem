import { homedir } from "os";
import { execSync } from "child_process";
import { join } from "path";
import { v4 as uuid } from "uuid";
import { validateTags } from "./types.js";
import type { Memory, MemoryMeta, MemoryScope } from "./types.js";
import { MemoryStore } from "./store.js";
import { SearchEngine } from "./search.js";

function resolveProjectId(cwd: string): string {
  try {
    const root = execSync("git rev-parse --show-toplevel", {
      cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    return root.replace(/\//g, "-");
  } catch {
    return cwd.replace(/\//g, "-");
  }
}

function baseDir(): string {
  return process.env.AMEM_BASE_DIR || join(homedir(), ".claude");
}

function memoryDir(scope: MemoryScope, projectId: string): string {
  const base = baseDir();
  if (scope === "global") return join(base, "memory");
  return join(base, "projects", projectId, "memory");
}

export class MemoryService {
  private stores = new Map<string, MemoryStore>();
  private engines = new Map<string, SearchEngine>();
  private defaultProjectId: string;

  constructor(cwd: string = process.cwd()) {
    this.defaultProjectId = resolveProjectId(cwd);
  }

  private resolveProject(projectDir?: string): string {
    return projectDir ? resolveProjectId(projectDir) : this.defaultProjectId;
  }

  private storeKey(scope: MemoryScope, projectId: string): string {
    return scope === "global" ? "global" : `project:${projectId}`;
  }

  private async getStore(scope: MemoryScope, projectId: string): Promise<MemoryStore> {
    const key = this.storeKey(scope, projectId);
    if (!this.stores.has(key)) {
      const dir = memoryDir(scope, projectId);
      const store = new MemoryStore(dir);
      await store.init();
      this.stores.set(key, store);
    }
    return this.stores.get(key)!;
  }

  private async getEngine(scope: MemoryScope, projectId: string): Promise<SearchEngine> {
    const key = this.storeKey(scope, projectId);
    if (!this.engines.has(key)) {
      const store = await this.getStore(scope, projectId);
      const engine = new SearchEngine();
      engine.rebuild(await store.loadAll());
      this.engines.set(key, engine);
    }
    return this.engines.get(key)!;
  }

  private async rebuildIndex(scope: MemoryScope, projectId: string): Promise<void> {
    const key = this.storeKey(scope, projectId);
    const store = await this.getStore(scope, projectId);
    const engine = new SearchEngine();
    engine.rebuild(await store.loadAll());
    this.engines.set(key, engine);
  }

  async add(params: {
    content: string;
    name: string;
    description: string;
    type: MemoryMeta["type"];
    scope: MemoryScope;
    keywords?: string[];
    tags?: string[];
    context?: string;
    links?: string[];
    projectDir?: string;
  }): Promise<Memory> {
    if (params.tags?.length) {
      const result = validateTags(params.tags);
      if (!result.valid) {
        throw new Error(
          `Invalid tags: ${result.invalid.join(", ")}. Use one of: workflow, tooling, testing, style, architecture, security, performance, dependencies — or prefix with "custom:" (e.g., custom:infra).`
        );
      }
    }
    const projectId = this.resolveProject(params.projectDir);
    const now = new Date().toISOString().slice(0, 10);
    const id = `${params.type}_${uuid().slice(0, 8)}`;
    const memory: Memory = {
      id,
      meta: {
        name: params.name,
        description: params.description,
        type: params.type,
        keywords: params.keywords,
        tags: params.tags,
        context: params.context,
        links: params.links,
        created: now,
        updated: now,
      },
      content: params.content,
    };
    const store = await this.getStore(params.scope, projectId);
    await store.save(memory);
    await this.rebuildIndex(params.scope, projectId);
    return memory;
  }

  async update(params: {
    id: string;
    scope: MemoryScope;
    name?: string;
    description?: string;
    type?: MemoryMeta["type"];
    keywords?: string[];
    tags?: string[];
    context?: string;
    links?: string[];
    content?: string;
    projectDir?: string;
  }): Promise<Memory | null> {
    const projectId = this.resolveProject(params.projectDir);
    const store = await this.getStore(params.scope, projectId);
    const existing = await store.load(params.id);
    if (!existing) return null;

    if (params.tags?.length) {
      const result = validateTags(params.tags);
      if (!result.valid) {
        throw new Error(
          `Invalid tags: ${result.invalid.join(", ")}. Use one of: workflow, tooling, testing, style, architecture, security, performance, dependencies — or prefix with "custom:" (e.g., custom:infra).`
        );
      }
    }
    if (params.name !== undefined) existing.meta.name = params.name;
    if (params.description !== undefined) existing.meta.description = params.description;
    if (params.type !== undefined) existing.meta.type = params.type;
    if (params.keywords !== undefined) existing.meta.keywords = params.keywords;
    if (params.tags !== undefined) existing.meta.tags = params.tags;
    if (params.context !== undefined) existing.meta.context = params.context;
    if (params.links !== undefined) existing.meta.links = params.links;
    if (params.content !== undefined) existing.content = params.content;
    existing.meta.updated = new Date().toISOString().slice(0, 10);

    await store.save(existing);
    await this.rebuildIndex(params.scope, projectId);
    return existing;
  }

  async delete(id: string, scope: MemoryScope, projectDir?: string): Promise<boolean> {
    const projectId = this.resolveProject(projectDir);
    const store = await this.getStore(scope, projectId);
    const ok = await store.remove(id);
    if (ok) await this.rebuildIndex(scope, projectId);
    return ok;
  }

  async search(params: {
    query: string;
    scope?: MemoryScope;
    type?: MemoryMeta["type"];
    tags?: string[];
    limit?: number;
    projectDir?: string;
  }): Promise<Memory[]> {
    if (params.tags?.length) {
      const result = validateTags(params.tags);
      if (!result.valid) {
        throw new Error(
          `Invalid tags: ${result.invalid.join(", ")}. Use one of: workflow, tooling, testing, style, architecture, security, performance, dependencies — or prefix with "custom:" (e.g., custom:infra).`
        );
      }
    }
    const projectId = this.resolveProject(params.projectDir);
    const scopes: MemoryScope[] = params.scope ? [params.scope] : ["global", "project"];
    let results: Memory[] = [];

    for (const scope of scopes) {
      const engine = await this.getEngine(scope, projectId);
      results.push(...engine.search(params.query, params.limit || 10));
    }

    if (params.type) {
      results = results.filter((m) => m.meta.type === params.type);
    }
    if (params.tags?.length) {
      results = results.filter((m) =>
        params.tags!.some((t) => m.meta.tags?.includes(t))
      );
    }

    return results.slice(0, params.limit || 10);
  }

  async links(id: string, scope: MemoryScope, projectDir?: string): Promise<{ memory: Memory; linked: Memory[] } | null> {
    const projectId = this.resolveProject(projectDir);
    const store = await this.getStore(scope, projectId);
    const memory = await store.load(id);
    if (!memory) return null;

    const linked: Memory[] = [];
    for (const linkId of memory.meta.links || []) {
      const m = await store.load(linkId);
      if (m) linked.push(m);
    }
    return { memory, linked };
  }

  async list(params: {
    scope?: MemoryScope;
    type?: MemoryMeta["type"];
    projectDir?: string;
  }): Promise<Array<{ id: string; meta: MemoryMeta }>> {
    const projectId = this.resolveProject(params.projectDir);
    const scopes: MemoryScope[] = params.scope ? [params.scope] : ["global", "project"];
    let results: Array<{ id: string; meta: MemoryMeta }> = [];

    for (const scope of scopes) {
      const store = await this.getStore(scope, projectId);
      const memories = await store.loadAll();
      results.push(...memories.map((m) => ({ id: m.id, meta: m.meta })));
    }

    if (params.type) {
      results = results.filter((m) => m.meta.type === params.type);
    }
    return results;
  }
}
