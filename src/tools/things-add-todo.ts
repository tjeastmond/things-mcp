import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { addTodoInputSchema, addTodoOutputSchema } from '../schemas/todo.js';
import { addTodo } from '../things/client.js';

export function registerThingsAddTodo(server: McpServer): void {
  server.registerTool(
    'things_add_todo',
    {
      description:
        'Creates a to-do in Things 3. Defaults to Inbox unless project or area is set. Use when for list placement (inbox, today, anytime, someday) or an ISO 8601 activation time.',
      inputSchema: addTodoInputSchema,
      outputSchema: addTodoOutputSchema,
    },
    async (args) => {
      const item = await addTodo({
        title: args.title,
        notes: args.notes,
        project: args.project,
        area: args.area,
        when: args.when,
        deadline: args.deadline,
        tags: args.tags,
      });
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
