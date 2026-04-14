/** Normalized adapter / MCP-facing error codes for Things integration. */
export type ThingsErrorCode =
  | 'things_permission_denied'
  | 'things_timeout'
  | 'things_app_error'
  | 'things_parse_error'
  | 'things_validation_error';

export class ThingsError extends Error {
  readonly code: ThingsErrorCode;

  constructor(code: ThingsErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'ThingsError';
    this.code = code;
  }
}

export function isThingsError(e: unknown): e is ThingsError {
  return e instanceof ThingsError;
}
