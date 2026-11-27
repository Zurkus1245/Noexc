import { ApiError } from '../../common/errors/api-error';

const BAD_REQUEST_STATUS = 400;
const MIN_VERSION = 1;

// Opaque to clients. The cursor is the version of the last returned row; versions are unique per link.
export const encodeVersionCursor = (version: number): string =>
  Buffer.from(JSON.stringify({ version })).toString('base64url');

export const decodeVersionCursor = (raw: string): number => {
  const version = parseVersion(raw);
  if (version === undefined) {
    throw new ApiError(BAD_REQUEST_STATUS, 'VALIDATION_FAILED', 'Invalid cursor', [{ path: 'cursor', message: 'invalid' }]);
  }
  return version;
};

function parseVersion(raw: string): number | undefined {
  try {
    const payload: unknown = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    const version = (payload as { version?: unknown } | null)?.version;
    return typeof version === 'number' && Number.isInteger(version) && version >= MIN_VERSION ? version : undefined;
  } catch {
    return undefined;
  }
}
