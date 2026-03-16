import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { MemoryService } from "./memory/service.js";
import type { MemoryScope, MemoryMeta } from "./memory/types.js";
import { log } from "./utils/logger.js";

export function createServer(): McpServer {
  const service = new MemoryService();

  const server = new McpServer({
    name: "amem",
    version: "0.1.0",
  });

  server.tool(
    "memory_search",
    "Search memories using BM25 text search. Returns ranked results.",
    {
      query: z.string().describe("Search query"),
      scope: z.enum(["global", "project"]).optional().describe("Scope to search (default: both)"),
      type: z.enum(["user", "feedback", "project", "reference"]).optional().describe("Filter by type"),
      tags: z.array(z.string()).optional().describe("Filter by tags (OR match)"),
      limit: z.number().optional().describe("Max results (default: 10)"),
    },
    async (params) => {
      const results = await service.search(params);
      const text = JSON.stringify(results, null, 2);
      log("memory_search", params, results);
      return { content: [{ type: "text" as const, text }] };
    }
  );

  server.tool(
    "memory_add",
    "Create a new memory. Returns the created memory with its ID.",
    {
      content: z.string().describe("Memory content (markdown)"),
      name: z.string().describe("Memory name"),
      description: z.string().describe("Short description for search relevance"),
      type: z.enum(["user", "feedback", "project", "reference"]).describe("Memory type"),
      scope: z.enum(["global", "project"]).describe("Storage scope"),
      keywords: z.array(z.string()).optional().describe("Search keywords"),
      tags: z.array(z.string()).optional().describe("Categorization tags"),
      context: z.string().optional().describe("One-line context summary"),
      links: z.array(z.string()).optional().describe("IDs of related memories"),
    },
    async (params) => {
      const memory = await service.add(params);
      const text = JSON.stringify(memory, null, 2);
      log("memory_add", params, memory);
      return { content: [{ type: "text" as const, text }] };
    }
  );

  server.tool(
    "memory_update",
    "Update an existing memory's metadata or content.",
    {
      id: z.string().describe("Memory ID"),
      scope: z.enum(["global", "project"]).describe("Scope where memory lives"),
      name: z.string().optional(),
      description: z.string().optional(),
      type: z.enum(["user", "feedback", "project", "reference"]).optional(),
      keywords: z.array(z.string()).optional(),
      tags: z.array(z.string()).optional(),
      context: z.string().optional(),
      links: z.array(z.string()).optional(),
      content: z.string().optional(),
    },
    async (params) => {
      const memory = await service.update(params);
      log("memory_update", params, memory ?? "not_found");
      if (!memory) {
        return { content: [{ type: "text" as const, text: "Memory not found" }], isError: true };
      }
      return { content: [{ type: "text" as const, text: JSON.stringify(memory, null, 2) }] };
    }
  );

  server.tool(
    "memory_delete",
    "Delete a memory by ID.",
    {
      id: z.string().describe("Memory ID"),
      scope: z.enum(["global", "project"]).describe("Scope where memory lives"),
    },
    async ({ id, scope }) => {
      const ok = await service.delete(id, scope);
      log("memory_delete", { id, scope }, ok ? "deleted" : "not_found");
      return {
        content: [{ type: "text" as const, text: ok ? "Deleted" : "Not found" }],
        isError: !ok,
      };
    }
  );

  server.tool(
    "memory_links",
    "Get a memory and its linked neighbors.",
    {
      id: z.string().describe("Memory ID"),
      scope: z.enum(["global", "project"]).describe("Scope where memory lives"),
    },
    async ({ id, scope }) => {
      const result = await service.links(id, scope);
      log("memory_links", { id, scope }, result ?? "not_found");
      if (!result) {
        return { content: [{ type: "text" as const, text: "Memory not found" }], isError: true };
      }
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "memory_list",
    "List all memories (metadata only, no content).",
    {
      scope: z.enum(["global", "project"]).optional().describe("Scope to list (default: both)"),
      type: z.enum(["user", "feedback", "project", "reference"]).optional().describe("Filter by type"),
    },
    async (params) => {
      const results = await service.list(params);
      log("memory_list", params, results);
      return { content: [{ type: "text" as const, text: JSON.stringify(results, null, 2) }] };
    }
  );

  return server;
}
