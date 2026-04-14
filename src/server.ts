import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import packageJson from '../package.json' with { type: 'json' };
import { log } from './lib/logger.js';
import { registerThingsAddTodo } from './tools/things-add-todo.js';
import { registerThingsCompleteTodo } from './tools/things-complete-todo.js';
import { registerThingsListInbox } from './tools/things-list-inbox.js';
import { registerThingsListToday } from './tools/things-list-today.js';
import { registerThingsPing } from './tools/things-ping.js';
import { registerThingsSearch } from './tools/things-search.js';

export function createMcpServer(): McpServer {
  const server = new McpServer(
    { name: 'things-mcp', version: packageJson.version },
    {},
  );
  registerThingsPing(server, packageJson.version);
  registerThingsListInbox(server);
  registerThingsListToday(server);
  registerThingsSearch(server);
  registerThingsAddTodo(server);
  registerThingsCompleteTodo(server);
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
