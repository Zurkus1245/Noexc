import type { Consent } from '@noexcuse/contracts';
import type { Consent as ConsentRow } from '../../generated/prisma/client';

export const toConsent = (row: ConsentRow): Consent => ({
  id: row.id,
  userId: row.userId,
  type: row.type,
  version: row.version,
  granted: row.granted,
  createdAt: row.createdAt.toISOString(),
});
