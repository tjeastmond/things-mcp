import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { afterEach, describe, expect, it } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createMcpServer } from '../src/server.js';

describe('createMcpServer', () => {
  let client: Client | undefined;
  let mcp: McpServer | undefined;

  afterEach(async () => {
    await client?.close();
    await mcp?.close();
    client = undefined;
    mcp = undefined;
  });

  it('lists things_ping and returns structured output', async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    mcp = createMcpServer();
    client = new Client({ name: 'things-mcp-test', version: '0.0.0' }, {});

    await Promise.all([mcp.connect(serverTransport), client.connect(clientTransport)]);

    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual(
      [
        'things_add_todo',
        'things_complete_todo',
        'things_list_inbox',
        'things_list_today',
        'things_ping',
        'things_search',
      ].sort(),
    );
    const ping = tools.find((t) => t.name === 'things_ping');
    expect(ping?.name).toBe('things_ping');

    const result = await client.callTool({ name: 'things_ping', arguments: {} });
    expect(result).not.toHaveProperty('toolResult');
    if ('isError' in result && result.isError) {
      throw new Error('things_ping failed');
    }
    expect(result.structuredContent).toEqual({
      ok: true,
      version: expect.any(String),
    });
  });

  it('rejects invalid arguments for things_ping', async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    mcp = createMcpServer();
    client = new Client({ name: 'things-mcp-test', version: '0.0.0' }, {});

    await Promise.all([mcp.connect(serverTransport), client.connect(clientTransport)]);

    const result = await client.callTool({
      name: 'things_ping',
      arguments: { unexpected: true } as unknown as Record<string, unknown>,
    });
    expect(result.isError).toBe(true);
  });
});
