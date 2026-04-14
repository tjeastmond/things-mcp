import { spawn } from 'node:child_process';
import { log } from '../lib/logger.js';
import { ThingsError } from '../lib/errors.js';

export type RunOsascriptOptions = {
  /** Default 5000 ms per AGENTS.md */
  timeoutMs?: number;
};

export type OsascriptResult = {
  stdout: string;
  stderr: string;
};

function mapFailure(code: number | null, stderr: string, err: unknown): ThingsError {
  const combined = `${stderr}`.toLowerCase();
  if (
    combined.includes('not authorized') ||
    combined.includes('not allowed') ||
    combined.includes('-1743') ||
    combined.includes('(-1743)')
  ) {
    return new ThingsError(
      'things_permission_denied',
      'Automation permission for Things was denied. Grant access in System Settings → Privacy & Security → Automation.',
      { cause: err },
    );
  }
  if (combined.includes("can't get application") || combined.includes('not running')) {
    return new ThingsError(
      'things_app_error',
      'Things could not be reached. Ensure Things 3 is installed and can be opened.',
      { cause: err },
    );
  }
  return new ThingsError(
    'things_app_error',
    `Things automation failed (exit ${code ?? 'unknown'}). Enable THINGS_MCP_LOG=debug for details.`,
    { cause: err },
  );
}

export async function runOsascript(
  script: string,
  options: RunOsascriptOptions = {},
): Promise<OsascriptResult> {
  const timeoutMs = options.timeoutMs ?? 5000;
  const started = Date.now();

  return await new Promise<OsascriptResult>((resolve, reject) => {
    const child = spawn('/usr/bin/osascript', ['-l', 'AppleScript', '-'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new ThingsError('things_timeout', 'Things automation timed out.'));
    }, timeoutMs);

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(mapFailure(null, stderr, err));
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (process.env.THINGS_MCP_LOG === 'debug') {
        log.debug(`osascript done in ${Date.now() - started}ms`);
        if (stderr) log.debug(`osascript stderr: ${stderr}`);
      }
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(mapFailure(code, stderr, new Error(`osascript exited ${code}`)));
      }
    });

    child.stdin.write(script, 'utf8', (err) => {
      if (err) {
        clearTimeout(timer);
        reject(mapFailure(null, stderr, err));
        return;
      }
      child.stdin.end();
    });
  });
}
