# Handoff

## What was completed

### Documentation and packaging (committed first)

- **[AGENTS.md](AGENTS.md)** was brought in line with the real implementation: adapter wire format (eight tab-separated fields, unix seconds on the wire, ISO in MCP), `spawn` + stdin to `osascript`, inner `tell` for row building, `ThingsError` codes, `things_ping` and adapter-only `deleteTodo`, smoke test behavior (delete + Trash), and an accurate project tree.
- **[README.md](README.md)** was added with requirements, install/build/run, Cursor MCP JSON example, tool table, logging, and smoke instructions.
- **[package.json](package.json)** gained a `smoke` script (`THINGS_MCP_SMOKE=1`).

### Core implementation (committed second)

- **MCP tools:** `things_list_inbox`, `things_list_today`, `things_search`, `things_add_todo`, `things_complete_todo`, registered alongside existing `things_ping` in [src/server.ts](src/server.ts).
- **Adapter:** [src/things/](src/things/) — AppleScript templates, `runOsascript` via `spawn`, parsing/mapping, [src/things/client.ts](src/things/client.ts) (including `deleteTodo` for smoke cleanup).
- **Shared:** [src/lib/errors.ts](src/lib/errors.ts), [dates.ts](src/lib/dates.ts), [text.ts](src/lib/text.ts); Zod in [src/schemas/todo.ts](src/schemas/todo.ts) and [common.ts](src/schemas/common.ts).
- **Tests:** parser/date/text specs, [test/server.spec.ts](test/server.spec.ts) lists all registered tools; [test/smoke-test.ts](test/smoke-test.ts) creates a task, verifies search, then deletes it (Things moves it to Trash).

Both commits are on **`main`** and were **pushed** to `origin`.

---

## Suggested next step

Pick one of these, depending on priority:

1. **Second-wave tools (per [AGENTS.md](AGENTS.md))** — Implement `things_update_todo` and/or `things_add_project` with the same patterns: Zod schemas in `src/schemas/`, thin handlers in `src/tools/`, AppleScript in `src/things/scripts.ts`, wire through `client.ts`, register in `server.ts`, add tests.

2. **Hardening** — Optional longer timeouts for heavy AppleScript, richer error messages when `osascript` exits non-zero (still no raw stderr in default logs), or tool-handler tests under `test/tools/` for schema + error mapping.

3. **CI** — Add a GitHub Actions workflow that runs `pnpm install`, `pnpm run build`, `pnpm test`, and `pnpm run typecheck` on push/PR (no smoke on CI unless you add a macOS runner and accept Things-dependent flakiness).

The most aligned “next feature” with the project spec is **(1)** starting with **`things_update_todo`** (narrow field set, ID-based) before **`things_add_project`**, unless you prefer shipping project creation first.
