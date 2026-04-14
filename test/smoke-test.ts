/**
 * Manual smoke test against real Things 3 (macOS only).
 * Run: THINGS_MCP_SMOKE=1 pnpm exec tsx test/smoke-test.ts
 *
 * Always deletes the created to-do when finished (moves to Trash in Things).
 */
import { addTodo, deleteTodo, listInbox, searchTodos } from '../src/things/client.js';

async function main(): Promise<void> {
  if (process.env.THINGS_MCP_SMOKE !== '1') {
    console.error('Set THINGS_MCP_SMOKE=1 to run this smoke test.');
    process.exit(1);
  }
  const title = `things-mcp smoke ${Date.now()}`;
  let createdId: string | undefined;

  try {
    await listInbox(1);
    const created = await addTodo({ title, tags: ['things-mcp-smoke'] });
    createdId = created.id;
    const found = await searchTodos(title, 5);
    if (!found.items.some((i) => i.id === created.id)) {
      throw new Error('search did not return created todo');
    }
    console.log('smoke ok', created.id);
  } finally {
    if (createdId) {
      try {
        await deleteTodo(createdId);
      } catch (e) {
        console.error('smoke cleanup: failed to delete test to-do:', e);
        process.exitCode = 1;
      }
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
