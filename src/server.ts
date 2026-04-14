import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import packageJson from '../package.json' with { type: 'json' };
import { log } from './lib/logger.js';
import { registerThingsPing } from './tools/things-ping.js';

export function createMcpServer(): McpServer {
  const server = new McpServer(
    { name: 'things-mcp', version: packageJson.version },
    {},
  );
  registerThingsPing(server, packageJson.version);
  return server;
}

/**
 * Runs the MCP server over stdio. Resolves after the transport is connected; process stays alive until stdin closes.
 */
export async function startStdioServer(): Promise<void> {
  const transport = new StdioServerTransport();
  const server = createMcpServer();
  await server.connect(transport);
  log.info(`stdio transport ready (things-mcp ${packageJson.version})`);
}
