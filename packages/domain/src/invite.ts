import { INVITE_TTL_HOURS } from '@noexcuse/contracts';

export type InviteState = 'valid' | 'expired' | 'used' | 'revoked';

export type InviteFacts = {
  expiresAt: Date;
  usedAt: Date | null;
  revokedAt: Date | null;
};

const MS_PER_HOUR = 60 * 60 * 1000;

export function inviteExpiresAt(createdAt: Date): Date {
  return new Date(createdAt.getTime() + INVITE_TTL_HOURS * MS_PER_HOUR);
}

// Explicit facts outrank the passive expiry clock, so a revoked or redeemed code never reads as merely expired; revoked outranks used so an owner's revocation stays visible.
export function inviteState(invite: InviteFacts, now: Date): InviteState {
  if (invite.revokedAt !== null) return 'revoked';
  if (invite.usedAt !== null) return 'used';
  if (now.getTime() >= invite.expiresAt.getTime()) return 'expired';
  return 'valid';
}
