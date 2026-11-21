import { z } from 'zod';
import { IsoDateTimeSchema, UuidSchema } from '@noexcuse/contracts';
import { ApiError } from '../../common/errors/api-error';

const BAD_REQUEST = 400;

// Keyset position of the last returned row: createdAt desc, id desc is a total order.
export type LinkCursor = { createdAt: Date; id: string };

const CursorPayloadSchema = z.object({ createdAt: IsoDateTimeSchema, id: UuidSchema });

export const encodeCursor = (cursor: LinkCursor): string =>
  Buffer.from(JSON.stringify({ createdAt: cursor.createdAt.toISOString(), id: cursor.id })).toString('base64url');

// Opaque to clients; a tampered or foreign cursor is a validation error, never a silent first page.
export const decodeCursor = (raw: string): LinkCursor => {
  const parsed = CursorPayloadSchema.safeParse(parseJson(raw));
  if (!parsed.success) {
    throw new ApiError(BAD_REQUEST, 'VALIDATION_FAILED', 'Invalid cursor', [{ path: 'cursor', message: 'invalid' }]);
  }
  return { createdAt: new Date(parsed.data.createdAt), id: parsed.data.id };
};

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
  } catch {
    return undefined;
  }
}
