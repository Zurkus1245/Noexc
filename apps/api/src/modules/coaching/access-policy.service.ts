import { Injectable } from '@nestjs/common';
import { ApiError } from '../../common/errors/api-error';
import type { ConsentType } from '@noexcuse/contracts';
import {
  type AccessActor,
  type AccessScope,
  type ConsentRecord,
  type CoachClientLink,
  decideClientAccess,
} from '@noexcuse/domain';
import { ConsentService } from '../consent/consent.service';
import { SessionService } from '../auth/session/session.service';
import { CoachingRepository } from './coaching.repository';

const NOT_FOUND_STATUS = 404;
const ACCESS_CONSENT_TYPES = ['coach_access', 'health_data'] as const satisfies readonly ConsentType[];
const LIST_CONSENT_TYPES = ['coach_access'] as const satisfies readonly ConsentType[];

// The only path to client data: a deny is indistinguishable from a missing client (404, no existence leak).
@Injectable()
export class AccessPolicy {
  constructor(
    private readonly repo: CoachingRepository,
    private readonly consents: ConsentService,
    private readonly session: SessionService,
  ) {}

  async assertClientAccess(actor: AccessActor, clientId: string, scope: AccessScope) {
    const [link, consents] = await Promise.all([
      this.repo.findOpenLink(actor.id, clientId),
      this.consents.findConsents(clientId, ACCESS_CONSENT_TYPES),
    ]);
    const decision = decideClientAccess({
      actor,
      clientId,
      link: link === null ? null : { coachId: link.coachId, clientId: link.clientId, status: link.status },
      consents,
      scope,
    });
    // An allowed actor without an open link can only be the client themself, who has no coach-side view.
    const client = link === null ? undefined : (await this.session.findPublicProfiles([clientId])).get(clientId);
    if (decision === 'deny' || link === null || client === undefined) {
      throw new ApiError(NOT_FOUND_STATUS, 'NOT_FOUND', 'Not found');
    }
    return { ...link, client };
  }

  // The list-page form of the profile decision: the same rule as assertClientAccess, one consent query per page.
  async filterVisibleLinks<T extends CoachClientLink & { id: string }>(coachId: string, links: readonly T[]): Promise<T[]> {
    const clientIds = links.flatMap((link) => (link.clientId === null ? [] : [link.clientId]));
    const consents = await this.consents.findConsentsOfUsers(clientIds, LIST_CONSENT_TYPES);
    const byClient = new Map<string, ConsentRecord[]>();
    for (const consent of consents) byClient.set(consent.userId, [...(byClient.get(consent.userId) ?? []), consent]);

    return links.filter(
      (link) =>
        link.clientId !== null &&
        decideClientAccess({
          actor: { id: coachId, role: 'coach' },
          clientId: link.clientId,
          link,
          consents: byClient.get(link.clientId) ?? [],
          scope: 'profile',
        }) === 'allow',
    );
  }
}
