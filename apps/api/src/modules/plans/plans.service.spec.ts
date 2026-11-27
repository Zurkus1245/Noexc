import { describe, expect, it, vi } from 'vitest';
import type { PlanContent, User } from '@noexcuse/contracts';
import type { AccessPolicy } from '../coaching/access-policy.service';
import { type Db, PlansRepository } from './plans.repository';
import { PlansService } from './plans.service';

const COACH: User = {
  id: '11111111-1111-4111-8111-111111111111',
  role: 'coach',
  displayName: 'Coach',
  timezone: 'Europe/Berlin',
  createdAt: '2026-01-01T00:00:00.000Z',
};
const CLIENT_ID = '22222222-2222-4222-8222-222222222222';
const LINK_ID = '33333333-3333-4333-8333-333333333333';
const WORKOUT_KEY = '44444444-4444-4444-8444-444444444444';
const OTHER_KEY = '55555555-5555-4555-8555-555555555555';
const ENTRY_ID = '66666666-6666-4666-8666-666666666666';
const NOW = new Date('2026-11-21T10:00:00.000Z');

const content = (...workoutKeys: string[]): PlanContent => ({
  blocks: [
    {
      key: '77777777-7777-4777-8777-777777777777',
      title: 'Block',
      workouts: workoutKeys.map((key) => ({
        key,
        title: 'Push',
        exercises: [
          { key: '88888888-8888-4888-8888-888888888888', name: 'Bench', sets: 3, repsMin: 5, repsMax: 5, weightKg: null, restSec: null, note: null },
        ],
      })),
    },
  ],
});

const link = { id: LINK_ID, coachId: COACH.id, client: { id: CLIENT_ID, timezone: 'Europe/Berlin' } };

// Only the collaborators a test exercises are stubbed; the transaction runs its work with a placeholder client.
function buildService(overrides: { repo?: Partial<Record<keyof PlansRepository, unknown>>; now?: Date } = {}) {
  const repo = {
    transaction: vi.fn(async (work: (tx: Db) => Promise<unknown>) => work({} as Db)),
    currentVersion: vi.fn(async () => null),
    currentVersions: vi.fn(async () => []),
    scheduledWorkoutKeys: vi.fn(async () => []),
    insertVersion: vi.fn(async (_tx: Db, data: { version: number; content: PlanContent }) => ({
      version: data.version,
      content: data.content,
      createdAt: NOW,
    })),
    findEntry: vi.fn(async () => null),
    findEntryOfLink: vi.fn(async () => null),
    createEntry: vi.fn(),
    moveEntry: vi.fn(async () => 1),
    deleteEntry: vi.fn(async () => 1),
    ...overrides.repo,
  };
  const access = { assertClientAccess: vi.fn(async () => link), assertClientAccessLocked: vi.fn(async () => link) };
  const clock = { now: () => overrides.now ?? NOW };
  const service = new PlansService(
    repo as unknown as PlansRepository,
    access as unknown as AccessPolicy,
    clock,
  );
  return { service, repo, access };
}

describe('PlansService.putPlan', () => {
  it('answers VERSION_CONFLICT when the base version is stale', async () => {
    const { service, repo } = buildService({
      repo: { currentVersion: vi.fn(async () => ({ version: 2, content: content(), createdAt: NOW })) },
    });

    await expect(service.putPlan(COACH, CLIENT_ID, { baseVersion: 1, content: content() })).rejects.toMatchObject({
      status: 409,
      code: 'VERSION_CONFLICT',
    });
    expect(repo.insertVersion).not.toHaveBeenCalled();
  });

  it('answers VERSION_CONFLICT when a concurrent writer wins the unique (linkId, version) race', async () => {
    const { service } = buildService({
      repo: {
        insertVersion: vi.fn(async () => Promise.reject(Object.assign(new Error('unique'), { code: 'P2002' }))),
      },
    });

    await expect(service.putPlan(COACH, CLIENT_ID, { baseVersion: 0, content: content() })).rejects.toMatchObject({
      status: 409,
      code: 'VERSION_CONFLICT',
    });
  });

  it('writes version 1 on an empty plan', async () => {
    const { service, repo } = buildService();

    const plan = await service.putPlan(COACH, CLIENT_ID, { baseVersion: 0, content: content(WORKOUT_KEY) });

    expect(plan).toMatchObject({ linkId: LINK_ID, clientId: CLIENT_ID, version: 1 });
    expect(repo.insertVersion).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ version: 1, createdById: COACH.id }));
  });

  it('answers WORKOUT_SCHEDULED listing each scheduled key that the new version drops', async () => {
    const { service, repo } = buildService({
      repo: {
        currentVersion: vi.fn(async () => ({ version: 1, content: content(WORKOUT_KEY), createdAt: NOW })),
        scheduledWorkoutKeys: vi.fn(async () => [WORKOUT_KEY, OTHER_KEY]),
      },
    });

    await expect(service.putPlan(COACH, CLIENT_ID, { baseVersion: 1, content: content(OTHER_KEY) })).rejects.toMatchObject({
      status: 409,
      code: 'WORKOUT_SCHEDULED',
      errors: [{ path: 'content', message: WORKOUT_KEY }],
    });
    expect(repo.insertVersion).not.toHaveBeenCalled();
  });

  it('decides access under the link lock, inside the write transaction', async () => {
    const { service, access } = buildService();

    await service.putPlan(COACH, CLIENT_ID, { baseVersion: 0, content: content() });

    expect(access.assertClientAccessLocked).toHaveBeenCalledWith(
      expect.anything(),
      { id: COACH.id, role: 'coach' },
      CLIENT_ID,
      'health',
    );
  });
});

describe('PlansService calendar writes', () => {
  const entryBody = { id: ENTRY_ID, date: '2026-11-22', workoutKey: WORKOUT_KEY };

  it('answers WORKOUT_NOT_IN_PLAN for a workout the current plan does not contain', async () => {
    const { service, repo } = buildService({
      repo: { currentVersion: vi.fn(async () => ({ version: 1, content: content(OTHER_KEY), createdAt: NOW })) },
    });

    await expect(service.createEntry(COACH, CLIENT_ID, entryBody)).rejects.toMatchObject({
      status: 422,
      code: 'WORKOUT_NOT_IN_PLAN',
    });
    expect(repo.createEntry).not.toHaveBeenCalled();
  });

  it('answers VALIDATION_FAILED for a date beyond the window of the client today', async () => {
    const { service } = buildService();

    await expect(service.createEntry(COACH, CLIENT_ID, { ...entryBody, date: '2028-01-01' })).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_FAILED',
      errors: [{ path: 'date' }],
    });
  });

  it('answers VALIDATION_FAILED for a date before the window', async () => {
    const { service } = buildService();

    await expect(service.moveEntry(COACH, CLIENT_ID, ENTRY_ID, { date: '2025-01-01' })).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_FAILED',
    });
  });

  it('accepts a date exactly at the window edge, measured in the client time zone', async () => {
    // 2026-11-21T23:30Z is already 2026-11-22 in Berlin; the edge is 366 days later.
    const { service, repo } = buildService({
      now: new Date('2026-11-21T23:30:00.000Z'),
      repo: {
        createEntry: vi.fn(async (_tx: Db, data: { id: string; linkId: string; clientId: string; date: Date; workoutKey: string }) => ({
          ...data,
          createdAt: NOW,
          updatedAt: NOW,
        })),
        currentVersion: vi.fn(async () => ({ version: 1, content: content(WORKOUT_KEY), createdAt: NOW })),
      },
    });

    await expect(service.createEntry(COACH, CLIENT_ID, { ...entryBody, date: '2027-11-23' })).resolves.toMatchObject({
      date: '2027-11-23',
    });
    expect(repo.createEntry).toHaveBeenCalled();
  });

  it('answers 404 when the entry id belongs to another link', async () => {
    const { service } = buildService({
      repo: {
        currentVersion: vi.fn(async () => ({ version: 1, content: content(WORKOUT_KEY), createdAt: NOW })),
        findEntry: vi.fn(async () => ({ id: ENTRY_ID, linkId: '99999999-9999-4999-8999-999999999999' })),
      },
    });

    await expect(service.createEntry(COACH, CLIENT_ID, entryBody)).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });

  const storedEntry = (overrides: Partial<{ linkId: string; date: Date; workoutKey: string }> = {}) => ({
    id: ENTRY_ID,
    linkId: LINK_ID,
    clientId: CLIENT_ID,
    date: new Date('2026-11-22T00:00:00.000Z'),
    workoutKey: WORKOUT_KEY,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  });

  it('answers ENTRY_ID_CONFLICT when the entry id holds another date or workout', async () => {
    const { service, repo } = buildService({
      repo: {
        currentVersion: vi.fn(async () => ({ version: 1, content: content(WORKOUT_KEY), createdAt: NOW })),
        findEntry: vi.fn(async () => storedEntry({ date: new Date('2026-11-25T00:00:00.000Z') })),
      },
    });

    await expect(service.createEntry(COACH, CLIENT_ID, entryBody)).rejects.toMatchObject({
      status: 409,
      code: 'ENTRY_ID_CONFLICT',
    });
    expect(repo.createEntry).not.toHaveBeenCalled();
  });

  it('returns the stored entry when the same id repeats the same link, date and workout', async () => {
    const { service, repo } = buildService({
      repo: {
        currentVersion: vi.fn(async () => ({ version: 1, content: content(WORKOUT_KEY), createdAt: NOW })),
        findEntry: vi.fn(async () => storedEntry()),
      },
    });

    await expect(service.createEntry(COACH, CLIENT_ID, entryBody)).resolves.toMatchObject({
      id: ENTRY_ID,
      date: '2026-11-22',
      workoutKey: WORKOUT_KEY,
    });
    expect(repo.createEntry).not.toHaveBeenCalled();
  });

  it('answers 404 when moving an entry of another link', async () => {
    const { service } = buildService();

    await expect(service.moveEntry(COACH, CLIENT_ID, ENTRY_ID, { date: '2026-11-25' })).rejects.toMatchObject({
      status: 404,
    });
  });

  it('answers 404 when the entry is deleted between the read and the move', async () => {
    const { service, repo } = buildService({
      repo: {
        currentVersion: vi.fn(async () => ({ version: 1, content: content(WORKOUT_KEY), createdAt: NOW })),
        findEntryOfLink: vi.fn(async () => storedEntry()),
        moveEntry: vi.fn(async () => 0),
      },
    });

    await expect(service.moveEntry(COACH, CLIENT_ID, ENTRY_ID, { date: '2026-11-25' })).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
    expect(repo.moveEntry).toHaveBeenCalledWith(expect.anything(), ENTRY_ID, LINK_ID, expect.any(Date));
  });

  it('answers 404 when the entry is deleted between the read and the delete', async () => {
    const { service } = buildService({
      repo: { findEntryOfLink: vi.fn(async () => storedEntry()), deleteEntry: vi.fn(async () => 0) },
    });

    await expect(service.deleteEntry(COACH, CLIENT_ID, ENTRY_ID)).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });
});

// Regression: past entries could be moved or deleted, and they pinned their workouts in the plan forever.
describe('PlansService keeps history fixed', () => {
  const pastEntry = {
    id: ENTRY_ID,
    linkId: LINK_ID,
    clientId: CLIENT_ID,
    date: new Date('2026-11-20T00:00:00.000Z'),
    workoutKey: WORKOUT_KEY,
    createdAt: NOW,
    updatedAt: NOW,
  };

  it('answers ENTRY_IN_PAST when moving an entry dated before the client today', async () => {
    const { service, repo } = buildService({ repo: { findEntryOfLink: vi.fn(async () => pastEntry) } });

    await expect(service.moveEntry(COACH, CLIENT_ID, ENTRY_ID, { date: '2026-11-25' })).rejects.toMatchObject({
      status: 409,
      code: 'ENTRY_IN_PAST',
    });
    expect(repo.moveEntry).not.toHaveBeenCalled();
  });

  it('answers ENTRY_IN_PAST when deleting an entry dated before the client today', async () => {
    const { service, repo } = buildService({ repo: { findEntryOfLink: vi.fn(async () => pastEntry) } });

    await expect(service.deleteEntry(COACH, CLIENT_ID, ENTRY_ID)).rejects.toMatchObject({ status: 409, code: 'ENTRY_IN_PAST' });
    expect(repo.deleteEntry).not.toHaveBeenCalled();
  });

  it('counts only entries from the client today when checking which workouts the plan must keep', async () => {
    const { service, repo } = buildService();

    await service.putPlan(COACH, CLIENT_ID, { baseVersion: 0, content: content(OTHER_KEY) });

    expect(repo.scheduledWorkoutKeys).toHaveBeenCalledWith(LINK_ID, new Date('2026-11-21T00:00:00.000Z'), expect.anything());
  });
});

describe('PlansService.onLinksClosed', () => {
  it('cuts each link at its own client local today', async () => {
    const deleteFutureEntries = vi.fn(async () => undefined);
    const repo = { deleteFutureEntries } as unknown as PlansRepository;
    const service = new PlansService(repo, {} as AccessPolicy, { now: () => new Date('2026-11-21T23:00:00.000Z') });
    const tx = {} as Db;

    await service.onLinksClosed(tx, [
      { linkId: LINK_ID, clientTimezone: 'Pacific/Kiritimati' },
      { linkId: OTHER_KEY, clientTimezone: 'America/Los_Angeles' },
    ]);

    expect(deleteFutureEntries).toHaveBeenCalledWith(tx, [
      { linkId: LINK_ID, from: new Date('2026-11-22T00:00:00.000Z') },
      { linkId: OTHER_KEY, from: new Date('2026-11-21T00:00:00.000Z') },
    ]);
  });
});
