import { Inject, Injectable } from '@nestjs/common';
import {
  type AccountExport,
  type ClientLinksPage,
  type CoachClient,
  type CoachClientDetail,
  type CoachClientPage,
  type CreateInviteResponse,
  type PageQuery,
  RATE_LIMITS,
  RedeemInviteBodySchema,
  type Role,
  type User,
} from '@noexcuse/contracts';
import {
  type LinkAction,
  type LinkActor,
  inviteExpiresAt,
  inviteState,
  missingRequiredForRedeem,
  transitionLink as decideLinkTransition,
} from '@noexcuse/domain';
import { ApiError } from '../../common/errors/api-error';
import { CLOCK, type Clock } from '../../common/clock/clock';
import { isForeignKeyViolation, isUniqueViolation } from '../../common/prisma/prisma-errors';
import { parseOrThrow } from '../../common/validation/zod-validation.pipe';
import { RateLimiter } from '../../infra/rate-limit/rate-limiter.service';
import { ConsentService } from '../consent/consent.service';
import { type PublicProfile, SessionService } from '../auth/session/session.service';
import type { Db } from './coaching.repository';
import { CoachingRepository } from './coaching.repository';
import { AccessPolicy } from './access-policy.service';
import { toClientLinkSummary, toClientSummary, toCoachClient, toOwnInvite } from './coaching.mapper';
import { type LinkCursor, decodeCursor, encodeCursor } from './pagination';
import { type InviteCodeGenerator, INVITE_CODE_GENERATOR, hashInviteCode } from './invite-code';

const BAD_REQUEST_STATUS = 400;
const FORBIDDEN_STATUS = 403;
const NOT_FOUND_STATUS = 404;
const CONFLICT_STATUS = 409;

type OpenLinkRow = Awaited<ReturnType<CoachingRepository['listOpenLinksOfCoach']>>[number];

@Injectable()
export class CoachingService {
  constructor(
    private readonly repo: CoachingRepository,
    private readonly access: AccessPolicy,
    private readonly consents: ConsentService,
    private readonly session: SessionService,
    private readonly rateLimiter: RateLimiter,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(INVITE_CODE_GENERATOR) private readonly codes: InviteCodeGenerator,
  ) {}

  async createInvite(coach: User): Promise<CreateInviteResponse> {
    assertRole(coach, 'coach');
    await this.rateLimiter.consume(`invite:create:${coach.id}`, RATE_LIMITS.createInvite);

    const code = this.codes.generate();
    const createdAt = this.clock.now();
    const invite = await this.repo.createInvite({
      coachId: coach.id,
      codeHash: hashInviteCode(code),
      createdAt,
      expiresAt: inviteExpiresAt(createdAt),
    });
    return { id: invite.id, code, expiresAt: invite.expiresAt.toISOString() };
  }

  async revokeInvite(coach: User, inviteId: string): Promise<void> {
    assertRole(coach, 'coach');
    const invite = await this.repo.findOwnInvite(inviteId, coach.id);
    if (invite === null) throw notFound();
    if (invite.revokedAt === null) await this.repo.revokeInvite(inviteId, this.clock.now());
  }

  // The attempt is counted before the body is validated, so malformed guesses also spend the budget.
  async redeemInvite(client: User, body: unknown): Promise<CoachClient> {
    assertRole(client, 'client');
    await this.rateLimiter.consume(`invite:redeem:${client.id}`, RATE_LIMITS.redeemAttempt);
    const { code, consents } = parseOrThrow(RedeemInviteBodySchema, body);
    // Checked before the invite lookup: the answer must not depend on whether the code exists.
    if (missingRequiredForRedeem(consents).length > 0) throw consentRequired();
    const now = this.clock.now();

    try {
      return await this.repo.transaction(async (tx) => {
        const invite = await this.repo.lockInviteByCodeHash(tx, hashInviteCode(code));
        if (invite === null || inviteState(invite, now) !== 'valid') throw inviteInvalid();
        if ((await this.repo.findOpenLinkBetween(tx, invite.coachId, client.id)) !== null) throw linkExists();

        await this.repo.markInviteUsed(tx, invite.id, now);
        await this.consents.appendInTransaction(tx, client.id, consents, now);
        return toCoachClient(await this.repo.createActiveLink(tx, invite.coachId, client.id));
      });
    } catch (error) {
      // The partial unique index catches two different invites from one coach redeemed concurrently.
      if (isUniqueViolation(error)) throw linkExists();
      // A party was deleted after it authenticated (account deletion raced this redeem): the foreign key refuses the write.
      if (isForeignKeyViolation(error)) throw profileRequired();
      throw error;
    }
  }

  async listClients(coach: User, query: PageQuery): Promise<CoachClientPage> {
    assertRole(coach, 'coach');
    const after = query.cursor === undefined ? null : decodeCursor(query.cursor);
    const page = await this.visibleLinkPage(coach.id, after, query.limit);
    const clients = await this.session.findPublicProfiles(presentIds(page.items.map((row) => row.clientId)));
    return {
      items: page.items.map((row) => toClientSummary(row, requiredProfile(clients, row.clientId))),
      nextCursor: page.next === null ? null : encodeCursor(page.next),
    };
  }

  // Keyset scan that skips links whose client no longer grants coach_access, so a page holds only visible clients.
  private async visibleLinkPage(
    coachId: string,
    after: LinkCursor | null,
    limit: number,
  ): Promise<{ items: OpenLinkRow[]; next: LinkCursor | null }> {
    const items: OpenLinkRow[] = [];
    let cursor = after;
    for (;;) {
      const rows = await this.repo.listOpenLinksOfCoach(coachId, cursor, limit);
      const visible = new Set((await this.access.filterVisibleLinks(coachId, rows)).map((row) => row.id));
      for (const row of rows) {
        cursor = cursorOf(row);
        if (!visible.has(row.id)) continue;
        const last = items.at(-1);
        if (items.length === limit && last !== undefined) return { items, next: cursorOf(last) };
        items.push(row);
      }
      if (rows.length < limit) return { items, next: null };
    }
  }

  async getClientDetail(coach: User, clientId: string): Promise<CoachClientDetail> {
    assertRole(coach, 'coach');
    const link = await this.access.assertClientAccess({ id: coach.id, role: 'coach' }, clientId, 'profile');
    return {
      link: toCoachClient(link),
      client: { id: link.client.id, displayName: link.client.displayName, timezone: link.client.timezone },
    };
  }

  async listOwnLinks(client: User, query: PageQuery): Promise<ClientLinksPage> {
    assertRole(client, 'client');
    const after = query.cursor === undefined ? null : decodeCursor(query.cursor);
    // One row past the limit answers "is there a next page" without a count query.
    const rows = await this.repo.listLinksOfClient(client.id, after, query.limit + 1);
    const items = rows.slice(0, query.limit);
    const coaches = await this.session.findPublicProfiles(presentIds(items.map((row) => row.coachId)));
    const last = items.at(-1);
    return {
      items: items.map((row) => toClientLinkSummary(row, row.coachId === null ? undefined : coaches.get(row.coachId))),
      nextCursor: rows.length > query.limit && last !== undefined ? encodeCursor(cursorOf(last)) : null,
    };
  }

  // Only the two participants of a link may act on it; anyone else learns nothing (404).
  async transitionLink(user: User, linkId: string, action: LinkAction): Promise<CoachClient> {
    const link = await this.repo.findLinkById(linkId);
    if (link === null || (link.coachId !== user.id && link.clientId !== user.id)) throw notFound();

    const actor: Exclude<LinkActor, 'admin'> = link.coachId === user.id ? 'coach' : 'client';
    const transition = decideLinkTransition(link.status, action, actor);
    if (!transition.ok) throw invalidTransition();

    const now = this.clock.now();
    const endedFields = transition.status === 'ended' ? { endedAt: now, endedBy: actor } : {};
    const updated = await this.repo.transitionLinkFrom(linkId, link.status, { status: transition.status, ...endedFields });
    if (updated === 0) throw invalidTransition();

    const current = await this.repo.findLinkById(linkId);
    if (current === null) throw notFound();
    return toCoachClient(current);
  }

  // Called by identity inside the account-deletion transaction; the caller owns the transaction.
  async closeAllForUser(userId: string, tx: Db): Promise<void> {
    await this.repo.closeLinksOf(userId, this.clock.now(), tx);
  }

  async exportAccountData(userId: string): Promise<Pick<AccountExport, 'links' | 'invites'>> {
    const [links, invites] = await Promise.all([this.repo.listLinksOf(userId), this.repo.listInvitesOf(userId)]);
    return { links: links.map(toCoachClient), invites: invites.map(toOwnInvite) };
  }
}

function assertRole(user: User, role: Role): void {
  if (user.role !== role) {
    throw new ApiError(FORBIDDEN_STATUS, 'FORBIDDEN_ROLE', `This action requires the ${role} role`);
  }
}

function cursorOf(row: { createdAt: Date; id: string }): LinkCursor {
  return { createdAt: row.createdAt, id: row.id };
}

function presentIds(values: readonly (string | null)[]): string[] {
  return values.filter((value): value is string => value !== null);
}

// An open link always has a live party; a missing profile is a data defect, not a client error.
function requiredProfile(profiles: ReadonlyMap<string, PublicProfile>, userId: string | null): PublicProfile {
  const profile = userId === null ? undefined : profiles.get(userId);
  if (profile === undefined) throw new Error(`open link party ${userId} has no profile`);
  return profile;
}

// Same answer for every failure reason (unknown, expired, used, revoked): the code is an oracle otherwise.
function inviteInvalid(): ApiError {
  return new ApiError(BAD_REQUEST_STATUS, 'INVITE_INVALID', 'Invite code is not valid');
}

function consentRequired(): ApiError {
  return new ApiError(BAD_REQUEST_STATUS, 'CONSENT_REQUIRED', 'Required consents must be granted');
}

function linkExists(): ApiError {
  return new ApiError(CONFLICT_STATUS, 'LINK_EXISTS', 'You are already linked to this coach');
}

function profileRequired(): ApiError {
  return new ApiError(FORBIDDEN_STATUS, 'PROFILE_REQUIRED', 'Create a profile first');
}

function invalidTransition(): ApiError {
  return new ApiError(CONFLICT_STATUS, 'INVALID_TRANSITION', 'This action is not allowed for the link status');
}

function notFound(): ApiError {
  return new ApiError(NOT_FOUND_STATUS, 'NOT_FOUND', 'Not found');
}
