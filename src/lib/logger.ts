export type LogLevel = 'error' | 'info' | 'debug';

function parseLevel(): LogLevel {
  const raw = process.env.THINGS_MCP_LOG?.toLowerCase();
  if (raw === 'debug' || raw === 'info' || raw === 'error') {
    return raw;
  }
  return 'error';
}

let level: LogLevel = parseLevel();

function enabled(at: LogLevel): boolean {
  const order: LogLevel[] = ['error', 'info', 'debug'];
  return order.indexOf(at) <= order.indexOf(level);
}

/** For tests: reset level from env. */
export function resetLogLevelForTests(): void {
  level = parseLevel();
}

export const log = {
  error(message: string, meta?: Record<string, unknown>): void {
    if (!enabled('error')) return;
    if (meta && Object.keys(meta).length > 0) {
      console.error(`[things-mcp] ${message}`, meta);
    } else {
      console.error(`[things-mcp] ${message}`);
    }
  },

  info(message: string): void {
    if (!enabled('info')) return;
    console.error(`[things-mcp] ${message}`);
  },

  debug(message: string): void {
    if (!enabled('debug')) return;
    console.error(`[things-mcp] ${message}`);
  },
};
