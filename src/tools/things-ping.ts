import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { thingsPingInputSchema, thingsPingOutputSchema } from '../schemas/ping.js';

export function registerThingsPing(server: McpServer, version: string): void {
  server.registerTool(
    'things_ping',
    {
      description:
        'Returns MCP server readiness and version. Use to verify the stdio connection without touching Things.app.',
      inputSchema: thingsPingInputSchema,
      outputSchema: thingsPingOutputSchema,
    },
    async () => ({
      content: [],
      structuredContent: {
        ok: true as const,
        version,
      },
    }),
  );
}
