import type { User } from '@noexcuse/contracts';
import type { User as UserRow } from '../../../generated/prisma/client';

// Row -> contract shape. authSubject never leaves the API.
export const toUser = (row: UserRow): User => ({
  id: row.id,
  role: row.role,
  displayName: row.displayName,
  timezone: row.timezone,
  createdAt: row.createdAt.toISOString(),
});
