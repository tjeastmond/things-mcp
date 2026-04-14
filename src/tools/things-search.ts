import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { searchInputSchema, searchOutputSchema } from '../schemas/todo.js';
import { searchTodos } from '../things/client.js';

export function registerThingsSearch(server: McpServer): void {
  server.registerTool(
    'things_search',
    {
      description:
        'Substring search over to-do titles and notes (conservative matching). Returns stable ids for follow-up actions.',
      inputSchema: searchInputSchema,
      outputSchema: searchOutputSchema,
    },
    async (args) => {
      const limit = args.limit ?? 25;
      const result = await searchTodos(args.query, limit);
      return {
        content: [],
        structuredContent: result,
      };
    },
  );
}
