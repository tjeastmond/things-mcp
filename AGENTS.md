# AGENTS.md

## Project

Things MCP Server

A local Model Context Protocol (MCP) server written in TypeScript for integrating AI coding agents with Things.app on macOS.

Primary clients:

* Codex
* Cursor Composer / Cursor MCP integrations

---

## Core Mental Model

This project has three distinct layers. Keep them conceptually separate:

1. **Protocol (MCP)**

   * Defines how tools are exposed to agents
   * Stable interface for all integrations

2. **Transport (stdio for v1)**

   * How the MCP server communicates with the client
   * `stdio` is the default for local usage
   * Can be swapped (HTTP, etc.) without changing tool logic

3. **Adapter (Things.app integration)**

   * AppleScript execution
   * Data parsing and mapping
   * This is where platform-specific behavior lives

Do not blur these layers.

---

## Immediate Goals

1. Build a minimal, reliable MCP server using `stdio`.
2. Expose a small set of safe, well-defined tools for Things.app.
3. Freeze the adapter contract before building parsers.
4. Keep the Things integration simple and transparent.
5. Favor debuggability and explicit schemas over abstraction.
6. Keep write operations conservative and predictable.
7. Make the codebase easy for agents and humans to extend.

---

## Non-Goals for v1

* No remote hosting
* No HTTP transport unless required
* No database
* No bulk mutation tools
* No background syncing
* No full Things data model replication

---

## Runtime Baseline

* **Runtime:** Node.js 22 LTS
* **Language:** TypeScript
* **Module format:** ESM
* **Package manager:** pnpm
* **MCP SDK:** `@modelcontextprotocol/sdk`
* **Validation:** `zod`
* **Dev runner:** `tsx`
* **Tests:** `vitest`

Keep the initial toolchain minimal. Do not add bundlers or extra abstraction layers unless they solve a concrete problem.

---

## Core Decisions and Why

### 1) TypeScript + Node.js

TypeScript provides strong guarantees for tool schemas and parsing. Node.js is the most practical runtime for local macOS integrations and aligns with the MCP TypeScript SDK.

### 2) MCP with stdio transport

Use MCP as the integration layer, with `stdio` as the default transport.

* MCP defines *what* the server exposes
* `stdio` defines *how* it communicates locally

`stdio` is preferred initially because it:

* avoids ports and networking issues
* avoids authentication complexity
* integrates cleanly with Codex and Cursor

Future transports (e.g., HTTP) can be added without changing tool implementations.

### 3) AppleScript via `osascript`

Use plain AppleScript executed through `osascript`.

* No heavy abstraction initially
* Easy to debug
* Direct mapping to Things.app behavior
* Prefer AppleScript first; do not introduce JXA unless it solves a specific formatting or quoting problem that AppleScript cannot handle cleanly

Assumptions:

* Target app is **Things 3** on macOS
* The local machine must allow Apple Events / Automation access for the terminal, Codex, Cursor, or whichever client launches the MCP server
* If Things is not running, the adapter may attempt to launch it once; if that fails, return a normalized error
* If automation permission is denied, return a normalized permission error

### 4) Strict input validation

All tools must validate inputs using Zod.

* No implicit coercion
* No loose schemas
* Fail fast on invalid input

### 5) Separation of concerns

Split responsibilities clearly:

* MCP layer → tool definitions and handlers
* Adapter layer → Things interaction

Do not mix AppleScript logic inside tool files.

### 6) Structured adapter output

AppleScript must return predictable, machine-readable output.

* Avoid free-form text
* Prefer delimited formats or structured strings
* Parsing must be deterministic

### 7) Safe writes

Mutation tools must be narrow and explicit.

* Prefer ID-based operations
* Avoid fuzzy matching
* Avoid bulk changes

---

## Supported v1 Tool Surface

Initial tools:

* `things_add_todo`
* `things_list_inbox`
* `things_list_today`
* `things_search`
* `things_complete_todo`

Second wave:

* `things_update_todo`
* `things_add_project`

Tool names use **snake_case** at the MCP layer.
File names use **kebab-case**.

Examples:

* MCP tool: `things_add_todo`
* file: `src/tools/things-add-todo.ts`

---

## Pre-Implementation Spec

Freeze the following before implementing the first parser.

### Adapter wire format

Use a deterministic text format from AppleScript to TypeScript.

Rules:

* Encoding: UTF-8
* Record separator: newline (`\n`)
* Field separator: ASCII tab (U+0009)
* Field order must be fixed per script
* First version should avoid optional header rows unless needed
* **Text-field escaping:** Inside field values, use C-style backslash escapes: `\n` for newline, `\t` for tab, `\\` for a literal backslash. AppleScript must emit these escapes; TypeScript parsers must reverse them deterministically.
* Large notes may be truncated for list/search responses; if truncation is used, it must be explicit and documented

Do not change field order casually after parsers are written.

### IDs

* Treat Things IDs as opaque strings
* Never infer structure from IDs
* Mutation tools should operate by ID whenever possible

### Dates

For MCP responses, normalize all dates to ISO 8601 strings.

Rules:

* Prefer full ISO 8601 when a time component exists
* For date-only concepts, return `YYYY-MM-DD`
* Do not return localized date strings from the MCP layer
* If a source field is missing, omit it rather than inventing a value

### Timeouts

* Default `osascript` timeout: 5 seconds
* Mutating operations may allow a slightly higher timeout if needed
* Timeouts must produce normalized adapter errors

### Logging

* Use `THINGS_MCP_LOG` for log level control
* Supported levels initially: `error`, `info`, `debug`
* “Sanitized input” means notes may be redacted or truncated in logs
* Raw AppleScript stderr may be logged only in debug mode

### Error mapping

Use one consistent pattern for errors.

Rules:

* Internal code should throw normalized errors
* MCP handlers should map those to structured tool failures consistently
* Do not mix multiple failure styles for similar tools
* Raw subprocess stderr should be hidden by default and surfaced only in debug logs

---

## Per-Tool Contracts

These are the minimum contracts to freeze before coding.

### `things_list_inbox`

Input:

* `limit?`: integer, default 25, max 100

Behavior:

* Returns inbox tasks only
* Sorted in a deterministic order
* Limited to `limit`

Output:

* `items: TodoSummary[]`
* `count: number`

### `things_list_today`

Input:

* `limit?`: integer, default 25, max 100

Behavior:

* Returns today tasks only
* Sorted in a deterministic order
* Limited to `limit`

Output:

* `items: TodoSummary[]`
* `count: number`

### `things_search`

Input:

* `query`: non-empty string
* `limit?`: integer, default 25, max 100
* optional scope may be added later, but not in the first vertical slice unless required

Behavior:

* Conservative substring-style search initially
* Return stable IDs for follow-up actions
* Limited to `limit`

Output:

* `items: TodoSummary[]`
* `count: number`

### `things_add_todo`

Input:

* `title`: required
* `notes?`
* `project?`
* `area?`
* `when?`
* `deadline?`
* `tags?`

Behavior:

* Default destination is Inbox unless an explicit project or area is provided
* Must validate mutually incompatible inputs if such cases arise in implementation

Output:

* `ok: true`
* `item: TodoDetail`

### `things_complete_todo`

Input:

* `id`: required

Behavior:

* Complete by ID only in v1
* Do not complete by fuzzy title match

Output:

* `ok: true`
* `item: { id, title, status }`

### Shared response shapes

`TodoSummary` should be compact and stable:

* `id: string`
* `title: string`
* `notes?: string`
* `when?: string`
* `deadline?: string`
* `tags?: string[]`
* `project?: string`
* `area?: string`

`TodoDetail` may extend `TodoSummary` for mutation responses.

---

## Tool Design Rules

1. Use explicit, action-oriented names
2. Keep descriptions precise
3. Prefer required fields unless truly optional
4. Return stable, typed shapes
5. Avoid large raw payloads
6. Always include IDs when possible
7. Mutation tools must confirm results

---

## Error Handling Rules

1. Normalize AppleScript and subprocess errors
2. Avoid leaking raw system errors by default
3. Provide actionable messages
4. Fail fast on invalid input
5. Never silently ignore parsing issues

---

## Logging Rules

* Log to stderr only
* Keep logs minimal and structured
* No debug noise by default
* Control verbosity with `THINGS_MCP_LOG`

Debug logs (when enabled) should include:

* tool name
* sanitized input
* execution time
* result summary

---

## Security and Safety Rules

1. Never execute arbitrary AppleScript input
2. Use `execFile`, not shell string execution
3. Escape all inputs
4. Treat all text as untrusted
5. Keep tool capabilities intentionally limited
6. Prefer ID-based mutations

---

## Project Structure

```text
things-mcp/
  src/
    index.ts
    server.ts
    tools/
      things-add-todo.ts
      things-list-inbox.ts
      things-list-today.ts
      things-search.ts
      things-complete-todo.ts
      things-update-todo.ts
      things-add-project.ts
    things/
      client.ts
      osascript.ts
      scripts.ts
      parsers.ts
      mappers.ts
      types.ts
    schemas/
      todo.ts
      project.ts
      common.ts
    lib/
      errors.ts
      logger.ts
      dates.ts
      text.ts
  test/
    tools/
    things/
    fixtures/
  scripts/
    smoke-test.ts
  package.json
  tsconfig.json
  vitest.config.ts
  README.md
  AGENTS.md
```

---

## Directory Responsibilities

### MCP Layer

* `src/index.ts` → entrypoint
* `src/server.ts` → MCP setup and tool registration
* `src/tools/*` → tool definitions and handlers

### Adapter Layer

* `src/things/client.ts` → high-level API
* `src/things/osascript.ts` → process execution
* `src/things/scripts.ts` → AppleScript templates
* `src/things/parsers.ts` → output parsing
* `src/things/mappers.ts` → response shaping
* `src/things/types.ts` → domain types

### Shared

* `src/schemas/*` → Zod schemas
* `src/lib/*` → utilities

---

## Coding Standards

1. Small, single-purpose files
2. Prefer functions over classes
3. Keep handlers thin
4. Keep parsing pure
5. Comment *why*, not *what*
6. Avoid premature abstraction

---

## Testing Strategy

Test files use the naming convention `*.spec.ts` or `*.spec.tsx` (for example, `things-add-todo.spec.ts`).

### `test/tools/*`

Tool handler tests:

* schema validation
* handler behavior
* MCP-layer result mapping
* error mapping

### `test/things/*`

Adapter tests:

* script generation
* parser behavior
* mapper behavior
* normalized adapter errors

### Smoke tests

Validate real Things.app interactions locally.

Minimum smoke-test success criteria:

* can connect and start server
* can list inbox
* can add a todo
* can search for the created todo
* can complete the created todo

---

## Tool Behavior Notes

### things_add_todo

* Default to Inbox unless specified

### things_list_inbox / today

* Return compact typed results

### things_search

* Return IDs for follow-up actions

### things_complete_todo

* Prefer ID-based completion only

### things_update_todo

* Limit editable fields initially

---

## Output Conventions

List/search:

```ts
{
  items: [...],
  count: number
}
```

Mutation:

```ts
{
  ok: true,
  item: {...}
}
```

---

## Development Workflow

1. Freeze the adapter contract first
2. Build the smallest vertical slice
3. Ship one read tool early
4. Add one write tool
5. Add tests as the adapter stabilizes
6. Keep docs updated
7. Put client setup instructions in `README.md`

---

## Immediate Build Order

1. MCP server bootstrap
2. osascript wrapper
3. inbox listing
4. add todo
5. parser tests
6. search + complete
7. today view

---

## Definition of Done (v1)

* Codex connects via MCP
* Cursor connects via MCP
* Inbox listing works
* Task creation works
* Search returns IDs
* Completion works by ID
* Core tests exist
* Docs are accurate
