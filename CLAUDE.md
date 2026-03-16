# amem — Agentic Memory MCP Server

Local MCP server providing BM25 search, inter-memory links, and enriched metadata for Claude Code's memory system.

## Stack

- **Runtime/Build**: Bun (compiles to standalone binary)
- **Protocol**: MCP over stdio (`@modelcontextprotocol/sdk`)
- **Search**: wink-bm25-text-search + wink-nlp-utils
- **Storage**: Markdown files with YAML frontmatter (gray-matter)

## Project structure

```
src/
├── index.ts              # Entry point: stdio transport
├── server.ts             # MCP tool registration (6 tools)
├── memory/
│   ├── types.ts          # Interfaces: MemoryMeta, Memory, MemoryScope
│   ├── store.ts          # Filesystem CRUD (.md files)
│   ├── search.ts         # BM25 indexing and search
│   └── service.ts        # Orchestration layer
└── utils/
    └── frontmatter.ts    # Parse/serialize YAML frontmatter
```

## Build

```bash
bun install
bun build --compile src/index.ts --outfile amem
```

## Key decisions

- BM25 index is fully rebuilt on each mutation (add/update/delete) — acceptable for <1000 memories
- Scope resolution mirrors Claude Code: git toplevel → cwd → path slug
- Memory IDs follow pattern `{type}_{uuid8}` (e.g., `user_a1b2c3d4`)
- MEMORY.md files are excluded from store.loadAll() to avoid conflicts with Claude Code's index
