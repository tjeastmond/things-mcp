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
3. Keep the adapter contract (wire format, field order) stable; change it deliberately when parsers depend on it.
4. Keep the Things integration simple and transparent.
5. Favor debuggability and explicit schemas over abstraction.
6. Keep write operations conservative and predictable.
7. Make the codebase easy for agents and humans to extend.

**Status:** v1 read/write tools and adapter layer are implemented; second-wave tools (`things_update_todo`, `things_add_project`) are not.

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
* **Runner:** the adapter runs `/usr/bin/osascript` with `child_process.spawn` (argument vector only), passes the script on **stdin** (`osascript -l AppleScript -`), and does **not** invoke a shell. This satisfies the “no shell string execution” rule.
* **Row helpers:** property reads for list output are wrapped in an inner `tell application "Things3"` block inside `rowForToDo` so multi-word properties like `tag names` parse correctly at script scope (AppleScript otherwise misparses phrases such as `set x to tag names of td` outside a `tell`).

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

**Diagnostic (no Things.app access):**

* `things_ping` — returns server readiness and version over MCP only.

**Things v1 tools:**

* `things_add_todo`
* `things_list_inbox`
* `things_list_today`
* `things_search`
* `things_complete_todo`

**Adapter-only (not MCP tools; tests and cleanup):**

* `deleteTodo` in `src/things/client.ts` — deletes a to-do by id (Things moves it to Trash). Used by the smoke test; not exposed as an MCP tool.

Second wave:

* `things_update_todo`
* `things_add_project`

Tool names use **snake_case** at the MCP layer.
File names use **kebab-case**.

Examples:

* MCP tool: `things_add_todo`
* file: `src/tools/things-add-todo.ts`

---

## Adapter contract (implemented)

### Wire format

Use a deterministic text format from AppleScript to TypeScript.

Rules:

* Encoding: UTF-8
* Record separator: newline (`\n`)
* Field separator: ASCII tab (U+0009)
* **List/search row field order (fixed):** `id`, `title`, `notes`, `activation` (unix seconds), `deadline` (unix seconds), `tags`, `project`, `area` — eight tab-separated fields per line. Empty fields are allowed; dates use unix seconds as emitted by AppleScript (may appear in scientific notation); TypeScript normalizes to ISO 8601 for MCP `when` / `deadline` fields.
* First version should avoid optional header rows unless needed
* **Text-field escaping:** Inside field values, use C-style backslash escapes: `\n` for newline, `\t` for tab, `\\` for a literal backslash. AppleScript emits these escapes; TypeScript `unescapeCField` reverses them deterministically.
* **Notes truncation:** list/search responses truncate notes to **500** characters in AppleScript before escaping; add-todo readback uses a high limit so full notes can be returned for that mutation.

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
* **Implementation:** AppleScript emits **unix seconds** for activation and due dates on the wire; `src/lib/dates.ts` and parsers map those to ISO strings for `TodoSummary.when` and `TodoSummary.deadline`. User-provided `deadline` / ISO `when` on `things_add_todo` are parsed in TypeScript and passed to AppleScript as offsets from the unix epoch.

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

* Internal code should throw normalized errors (`ThingsError` in `src/lib/errors.ts` with codes such as `things_permission_denied`, `things_timeout`, `things_app_error`, `things_parse_error`, `things_validation_error`)
* MCP handlers should map those to structured tool failures consistently
* Do not mix multiple failure styles for similar tools
* Raw subprocess stderr should be hidden by default and surfaced only in debug logs

---

## Per-Tool Contracts

These are the stable MCP-layer contracts; keep tool inputs/outputs aligned with `src/schemas/todo.ts` and handlers in `src/tools/`.

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

* Conservative substring-style search: Things `every to do whose name contains query or notes contains query` (Things’ matching rules apply)
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
* **Project vs area:** both cannot be set; the implementation rejects `project` and `area` together.
* **`when`:** optional. Use one of `inbox`, `today`, `anytime`, `someday` (list placement), or an **ISO 8601** string for activation date (stored as `activation date` in Things). Keywords map to built-in lists; ISO `when` keeps default list placement (Inbox) unless `project` / `area` overrides placement.

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

`things_add_todo` returns `item` with `status: "open"` after creation (read back via the same wire row).

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
2. Use `child_process.spawn` with a fixed argv (e.g. `osascript`, `-l`, `AppleScript`, `-`); pass script bytes on stdin — **no** shell invocation and no interpolated shell strings
3. Escape all inputs embedded in AppleScript (`escapeAppleScriptString` in `src/things/scripts.ts`)
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
      things-ping.ts
      things-add-todo.ts
      things-list-inbox.ts
      things-list-today.ts
      things-search.ts
      things-complete-todo.ts
    things/
      client.ts
      osascript.ts
      scripts.ts
      parsers.ts
      mappers.ts
      types.ts
    schemas/
      ping.ts
      todo.ts
      common.ts
    lib/
      errors.ts
      logger.ts
      dates.ts
      text.ts
  test/
    things/
    lib/
    schemas/
    server.spec.ts
    smoke-test.ts
  package.json
  tsconfig.json
  tsconfig.test.json
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

* `src/schemas/*` → Zod schemas (`ping.ts` for `things_ping`, `todo.ts` + `common.ts` for Things tools)
* `src/lib/*` → utilities (`errors.ts`, `logger.ts`, `dates.ts`, `text.ts`)

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

* **Script:** `test/smoke-test.ts` — run with `THINGS_MCP_SMOKE=1 pnpm exec tsx test/smoke-test.ts` or `pnpm smoke`.
* **Cleanup:** the smoke test **deletes** the to-do it creates (`deleteTodo` in the adapter) so tasks are not left in Inbox/Today/Logbook. In Things, delete moves the item to **Trash**; the smoke test does not empty Trash globally.

Minimum smoke-test success criteria:

* can list inbox (or at least run the adapter against Things)
* can add a todo
* can search for the created todo
* deletes the created todo (cleanup)

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

## Build order (reference — implemented)

1. MCP server bootstrap (`things_ping`, stdio)
2. osascript runner (`src/things/osascript.ts`)
3. inbox listing (`things_list_inbox`)
4. add todo (`things_add_todo`)
5. parser / adapter unit tests (`test/things`, `test/lib`)
6. search + complete (`things_search`, `things_complete_todo`)
7. today view (`things_list_today`)

---

## Definition of Done (v1)

* Codex connects via MCP
* Cursor connects via MCP
* Inbox listing works
* Task creation works
* Search returns IDs
* Completion works by ID
* Core tests exist
* Docs are accurate (`README.md` for setup; this file for architecture)
* Optional: `pnpm smoke` succeeds on a Mac with Things 3 and Automation allowed (creates a task, verifies search, **deletes** the task)
