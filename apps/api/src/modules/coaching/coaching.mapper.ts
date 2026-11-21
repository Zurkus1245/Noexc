import type { ClientLinkSummary, CoachClient, CoachClientSummary, AccountExport } from '@noexcuse/contracts';
import type {
  CoachClient as CoachClientRow,
  Invite as InviteRow,
} from '../../generated/prisma/client';

// Row -> contract shape. Invite code hashes never leave the API.
export const toCoachClient = (row: CoachClientRow): CoachClient => ({
  id: row.id,
  coachId: row.coachId,
  clientId: row.clientId,
  status: row.status,
  createdAt: row.createdAt.toISOString(),
  endedAt: row.endedAt?.toISOString() ?? null,
  endedBy: row.endedBy,
});

export const toOwnInvite = (
  row: Pick<InviteRow, 'id' | 'coachId' | 'expiresAt' | 'usedAt' | 'revokedAt' | 'createdAt'>,
): AccountExport['invites'][number] => ({
  id: row.id,
  coachId: row.coachId,
  expiresAt: row.expiresAt.toISOString(),
  usedAt: row.usedAt?.toISOString() ?? null,
  revokedAt: row.revokedAt?.toISOString() ?? null,
  createdAt: row.createdAt.toISOString(),
});

// Only open links are listed to a coach, and an open link always has its client (DB check constraint).
export const toClientSummary = (row: CoachClientRow, client: { displayName: string }): CoachClientSummary => {
  if (row.clientId === null) throw new Error(`open link ${row.id} has no client`);
  return {
    id: row.id,
    clientId: row.clientId,
    displayName: client.displayName,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
};

// The coach's display name is null when the coach deleted their account (coach is undefined).
export const toClientLinkSummary = (
  row: CoachClientRow,
  coach: { displayName: string } | undefined,
): ClientLinkSummary => ({
  id: row.id,
  coachId: row.coachId,
  coachDisplayName: coach?.displayName ?? null,
  status: row.status,
  createdAt: row.createdAt.toISOString(),
});
