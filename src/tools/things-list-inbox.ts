import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { listInboxInputSchema, listInboxOutputSchema } from '../schemas/todo.js';
import { listInbox } from '../things/client.js';

export function registerThingsListInbox(server: McpServer): void {
  server.registerTool(
    'things_list_inbox',
    {
      description:
        'Lists to-dos in the Things 3 Inbox in UI order, up to limit. Returns stable ids for follow-up actions.',
      inputSchema: listInboxInputSchema,
      outputSchema: listInboxOutputSchema,
    },
    async (args) => {
      const limit = args.limit ?? 25;
      const result = await listInbox(limit);
      return {
        content: [],
        structuredContent: result,
      };
    },
  );
}
