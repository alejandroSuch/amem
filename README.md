# amem — Agentic Memory MCP Server

Local MCP server that adds BM25 search, inter-memory links, and enriched metadata to Claude Code's memory system. No embeddings, no API keys, no heavy dependencies.

Inspired by the [A-mem paper](https://arxiv.org/abs/2502.12110).

## Install

```bash
git clone https://github.com/yourusername/amem.git
cd amem
bun install
bun build --compile src/index.ts --outfile amem
```

## Register

Add to `~/.claude/settings.json` for global use:

```json
{
  "mcpServers": {
    "amem": {
      "command": "/path/to/amem/amem"
    }
  }
}
```

Or add a `.mcp.json` in your project root for per-project use:

```json
{
  "mcpServers": {
    "amem": {
      "command": "/path/to/amem/amem"
    }
  }
}
```

## Memory format

```yaml
---
name: "memory name"
description: "short description"
type: user|feedback|project|reference
keywords: [term1, term2]
tags: [tag1, tag2]
context: "one-line summary"
links: [other-memory-id]
created: 2026-03-16
updated: 2026-03-16
---
Markdown content...
```

Backward compatible with Claude Code's built-in memory — extended fields are optional.

## Tools

### memory_search

BM25-ranked search across memories.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `query` | string | yes | Search query |
| `scope` | `"global"` \| `"project"` | no | Scope to search (default: both) |
| `type` | `"user"` \| `"feedback"` \| `"project"` \| `"reference"` | no | Filter by type |
| `tags` | string[] | no | Filter by tags (OR match) |
| `limit` | number | no | Max results (default: 10) |

### memory_add

Create a new memory.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `content` | string | yes | Memory content (markdown) |
| `name` | string | yes | Memory name |
| `description` | string | yes | Short description for search relevance |
| `type` | `"user"` \| `"feedback"` \| `"project"` \| `"reference"` | yes | Memory type |
| `scope` | `"global"` \| `"project"` | yes | Storage scope |
| `keywords` | string[] | no | Search keywords |
| `tags` | string[] | no | Categorization tags |
| `context` | string | no | One-line context summary |
| `links` | string[] | no | IDs of related memories |

### memory_update

Update an existing memory's metadata or content.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Memory ID |
| `scope` | `"global"` \| `"project"` | yes | Scope where memory lives |
| `name` | string | no | New name |
| `description` | string | no | New description |
| `type` | `"user"` \| `"feedback"` \| `"project"` \| `"reference"` | no | New type |
| `keywords` | string[] | no | New keywords |
| `tags` | string[] | no | New tags |
| `context` | string | no | New context |
| `links` | string[] | no | New links |
| `content` | string | no | New content |

### memory_delete

Delete a memory by ID.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Memory ID |
| `scope` | `"global"` \| `"project"` | yes | Scope where memory lives |

### memory_links

Get a memory and its linked neighbors.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Memory ID |
| `scope` | `"global"` \| `"project"` | yes | Scope where memory lives |

### memory_list

List all memories (metadata only, no content).

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `scope` | `"global"` \| `"project"` | no | Scope to list (default: both) |
| `type` | `"user"` \| `"feedback"` \| `"project"` \| `"reference"` | no | Filter by type |

## Scope resolution

Zero config — project ID is derived automatically:

1. Tries `git rev-parse --show-toplevel` to get repo root (resolves worktrees)
2. Falls back to cwd if not a git repo
3. Converts path to slug: `/Users/me/projects/foo` → `-Users-me-projects-foo`

Storage paths:
- **global**: `~/.claude/memory/`
- **project**: `~/.claude/projects/<project-id>/memory/`

## Search details

- **Engine**: wink-bm25-text-search
- **Indexed fields** with weights: name(3), description(2), keywords(2), tags(1), context(1), content(1)
- **Tokenization**: wink-nlp-utils (tokenize + stem + stopword removal)
- Full index rebuild on mutation — under 10ms for <1000 memories
- Post-filtering by scope, type, tags after BM25 ranking

## Development

```bash
# Run directly (Bun handles TypeScript natively)
bun run src/index.ts

# Rebuild binary
bun build --compile src/index.ts --outfile amem
```

## Requirements

- [Bun](https://bun.sh/) (for building)
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) (MCP host)
