import type { LinkStatus, Role } from '@noexcuse/contracts';
import { hasValidConsent, type ConsentRecord } from './consent';
import { isLinkOpen } from './link';

export type AccessScope = 'profile' | 'health';
export type AccessDecision = 'allow' | 'deny';

export type AccessActor = { id: string; role: Role };

// A party is null only on an ended link whose user deleted their account; such a link never grants access.
export type CoachClientLink = {
  coachId: string | null;
  clientId: string | null;
  status: LinkStatus;
};

export type ClientAccessRequest = {
  actor: AccessActor;
  clientId: string;
  link: CoachClientLink | null;
  consents: readonly ConsentRecord[];
  scope: AccessScope;
};

// The link must also match clientId: a coach's link to another client must never grant access here.
export function decideClientAccess({ actor, clientId, link, consents, scope }: ClientAccessRequest): AccessDecision {
  if (actor.id === clientId) return 'allow';
  if (actor.role !== 'coach') return 'deny';
  if (link === null || link.coachId !== actor.id || link.clientId !== clientId || !isLinkOpen(link.status)) {
    return 'deny';
  }
  if (!hasValidConsent(consents, 'coach_access')) return 'deny';
  if (scope === 'health' && !hasValidConsent(consents, 'health_data')) return 'deny';
  return 'allow';
}
