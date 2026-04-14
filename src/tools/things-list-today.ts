import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { listTodayInputSchema, listTodayOutputSchema } from '../schemas/todo.js';
import { listToday } from '../things/client.js';

export function registerThingsListToday(server: McpServer): void {
  server.registerTool(
    'things_list_today',
    {
      description:
        'Lists to-dos on the Things 3 Today list in UI order, up to limit. Returns stable ids for follow-up actions.',
      inputSchema: listTodayInputSchema,
      outputSchema: listTodayOutputSchema,
    },
    async (args) => {
      const limit = args.limit ?? 25;
      const result = await listToday(limit);
      return {
        content: [],
        structuredContent: result,
      };
    },
  );
}
