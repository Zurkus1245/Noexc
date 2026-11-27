import { describe, expect, it, vi } from 'vitest';
import type { User } from '@noexcuse/contracts';
import { CoachingService, MAX_LINK_SCAN_BATCHES } from './coaching.service';
import type { CoachingRepository } from './coaching.repository';
import type { AccessPolicy } from './access-policy.service';
import type { ConsentService } from '../consent/consent.service';
import type { SessionService } from '../auth/session/session.service';
import type { RateLimiter } from '../../infra/rate-limit/rate-limiter.service';
import type { LinkLifecycleHook } from './link-lifecycle';

const COACH: User = {
  id: '11111111-1111-4111-8111-111111111111',
  role: 'coach',
  displayName: 'Coach',
  timezone: 'Europe/Berlin',
  createdAt: '2026-01-01T00:00:00.000Z',
};
const CLIENT_ID = '22222222-2222-4222-8222-222222222222';
const NOW = new Date('2026-11-21T10:00:00.000Z');

const openLinkRow = {
  id: '33333333-3333-4333-8333-333333333333',
  coachId: COACH.id,
  clientId: CLIENT_ID,
  status: 'active' as const,
  createdAt: NOW,
  endedAt: null,
  endedBy: null,
};

// Only the collaborators a test exercises are stubbed; everything else is never reached.
function buildService(overrides: {
  repo?: Partial<Record<keyof CoachingRepository, unknown>>;
  access?: Partial<Record<keyof AccessPolicy, unknown>>;
  session?: Partial<Record<keyof SessionService, unknown>>;
}) {
  const repo = { listOpenLinksOfCoach: vi.fn(), createInvite: vi.fn(), ...overrides.repo };
  const access = { filterVisibleLinks: vi.fn(async (_coachId: string, rows: unknown[]) => rows), ...overrides.access };
  const session = { findPublicProfiles: vi.fn(), ...overrides.session };
  const rateLimiter = { consume: vi.fn(async () => undefined) };
  const clock = { now: () => NOW };
  const codes = { generate: () => '0123456789ABCDEFGHJKMNPQRS' };
  return new CoachingService(
    repo as unknown as CoachingRepository,
    access as unknown as AccessPolicy,
    {} as ConsentService,
    session as unknown as SessionService,
    rateLimiter as unknown as RateLimiter,
    clock,
    codes,
    {} as LinkLifecycleHook,
  );
}

describe('CoachingService.listClients when a client deletes their account mid-request', () => {
  it('skips the vanished client instead of failing the whole page', async () => {
    const service = buildService({
      repo: { listOpenLinksOfCoach: vi.fn(async () => [openLinkRow]) },
      session: { findPublicProfiles: vi.fn(async () => new Map()) },
    });

    await expect(service.listClients(COACH, { limit: 20 })).resolves.toEqual({ items: [], nextCursor: null });
  });

  it('keeps the clients whose profile still exists', async () => {
    const otherClientId = '44444444-4444-4444-8444-444444444444';
    const otherRow = { ...openLinkRow, id: '55555555-5555-4555-8555-555555555555', clientId: otherClientId };
    const service = buildService({
      repo: { listOpenLinksOfCoach: vi.fn(async () => [openLinkRow, otherRow]) },
      session: {
        findPublicProfiles: vi.fn(async () => new Map([[otherClientId, { id: otherClientId, displayName: 'Ada', timezone: 'UTC' }]])),
      },
    });

    const page = await service.listClients(COACH, { limit: 20 });

    expect(page.items.map((item) => item.clientId)).toEqual([otherClientId]);
    expect(page.items[0]?.displayName).toBe('Ada');
  });
});

// Regression: with many clients who withdrew coach_access, one list request scanned every link of the coach.
describe('CoachingService.listClients when most clients are hidden', () => {
  it('stops after a bounded number of batches and hands back a cursor to continue', async () => {
    const limit = 2;
    let created = 0;
    const hiddenBatch = () =>
      Array.from({ length: limit }, () => {
        created += 1;
        const suffix = String(created).padStart(12, '0');
        return { ...openLinkRow, id: `33333333-3333-4333-8333-${suffix}`, createdAt: new Date(NOW.getTime() - created) };
      });
    const listOpenLinksOfCoach = vi.fn(async () => hiddenBatch());
    const service = buildService({
      repo: { listOpenLinksOfCoach },
      access: { filterVisibleLinks: vi.fn(async () => []) },
      session: { findPublicProfiles: vi.fn(async () => new Map()) },
    });

    const page = await service.listClients(COACH, { limit });

    expect(listOpenLinksOfCoach).toHaveBeenCalledTimes(MAX_LINK_SCAN_BATCHES);
    expect(page.items).toEqual([]);
    expect(page.nextCursor).not.toBeNull();
  });
});

describe('CoachingService.createInvite when the coach deletes their account mid-request', () => {
  it('answers PROFILE_REQUIRED when the invite foreign key refuses the insert', async () => {
    const service = buildService({
      repo: { createInvite: vi.fn(async () => Promise.reject(Object.assign(new Error('fk'), { code: 'P2003' }))) },
    });

    await expect(service.createInvite(COACH)).rejects.toMatchObject({ status: 403, code: 'PROFILE_REQUIRED' });
  });
});
