import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { completeTodoInputSchema, completeTodoOutputSchema } from '../schemas/todo.js';
import { completeTodo } from '../things/client.js';

export function registerThingsCompleteTodo(server: McpServer): void {
  server.registerTool(
    'things_complete_todo',
    {
      description: 'Marks a to-do completed by id (opaque Things id). Does not match by title.',
      inputSchema: completeTodoInputSchema,
      outputSchema: completeTodoOutputSchema,
    },
    async (args) => {
      const item = await completeTodo(args.id);
      return {
        content: [],
        structuredContent: {
          ok: true as const,
          item,
        },
      };
    },
  );
}
