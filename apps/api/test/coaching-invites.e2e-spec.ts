import { createHash, randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import {
  CONSENT_VERSIONS,
  CoachClientDetailSchema,
  CoachClientSchema,
  INVITE_CODE_LENGTH,
  ProblemDetailsSchema,
} from '@noexcuse/contracts';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Clock } from '../src/common/clock/clock';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { CoachingRepository } from '../src/modules/coaching/coaching.repository';
import { createTestApp, resetDatabase } from './support';
import { ALL_REQUIRED_CONSENTS, createInvite, linkBetween, redeem, signIn } from './coaching-helpers';

const HOUR_MS = 60 * 60 * 1000;
const INVITE_TTL_HOURS = 168;
const START = new Date('2026-11-21T10:00:00.000Z');
const UNKNOWN_CODE = '7K2QM9XA';
const STALE_VERSION = '2000-01-01';

const withoutRequestId = (body: Record<string, unknown>) => {
  const copy = { ...body };
  delete copy.requestId;
  return copy;
};

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

describe('coaching invites', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let now: Date;
  const clock: Clock = { now: () => now };

  beforeAll(async () => {
    now = START;
    app = await createTestApp({ clock });
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    now = START;
    await resetDatabase(app);
  });

  const api = () => request(app.getHttpServer());

  it('links a client through an invite and lets the coach see the client', async () => {
    const coach = await signIn(app, 'coach', 'Coach');
    const client = await signIn(app, 'client', 'Ada');

    const invite = await createInvite(app, coach);
    expect(invite.code).toHaveLength(INVITE_CODE_LENGTH);
    expect(invite.expiresAt).toBe(new Date(START.getTime() + INVITE_TTL_HOURS * HOUR_MS).toISOString());

    const redeemed = await redeem(app, client, invite.code).expect(201);
    const link = CoachClientSchema.parse(redeemed.body);
    expect(link).toMatchObject({ coachId: coach.id, clientId: client.id, status: 'active', endedAt: null });

    const list = await api().get('/v1/coach/clients').set('Authorization', coach.auth).expect(200);
    expect(list.body.items).toEqual([
      expect.objectContaining({ id: link.id, clientId: client.id, displayName: 'Ada', status: 'active' }),
    ]);
    expect(list.body.nextCursor).toBeNull();

    const detail = await api().get(`/v1/coach/clients/${client.id}`).set('Authorization', coach.auth).expect(200);
    expect(CoachClientDetailSchema.parse(detail.body)).toEqual({
      link,
      client: { id: client.id, displayName: 'Ada', timezone: 'Europe/Berlin' },
    });

    const own = await api().get('/v1/client/links').set('Authorization', client.auth).expect(200);
    expect(own.body.items).toEqual([expect.objectContaining({ id: link.id, coachId: coach.id, coachDisplayName: 'Coach' })]);
  });

  it('answers PROFILE_REQUIRED, not a server error, when the redeemer is deleted mid-redeem', async () => {
    const coach = await signIn(app, 'coach');
    const client = await signIn(app, 'client');
    const invite = await createInvite(app, coach);
    const prisma = app.get(PrismaService);
    const repo = app.get(CoachingRepository);
    const lockInvite = repo.lockInviteByCodeHash.bind(repo);
    // The deletion commits while the redeem transaction is open, so its consent and link inserts reference a missing user.
    vi.spyOn(repo, 'lockInviteByCodeHash').mockImplementationOnce(async (tx, codeHash) => {
      await prisma.user.delete({ where: { id: client.id } });
      return lockInvite(tx, codeHash);
    });

    const response = await redeem(app, client, invite.code).expect(403);

    expect(response.body).toMatchObject({ code: 'PROFILE_REQUIRED' });
    expect(await prisma.invite.findUnique({ where: { id: invite.id } })).toMatchObject({ usedAt: null });
  });

  it('answers a missing-consent redeem identically for a valid and a guessed code', async () => {
    const coach = await signIn(app, 'coach');
    const client = await signIn(app, 'client');
    const invite = await createInvite(app, coach);

    const valid = await redeem(app, client, invite.code, []).expect(400);
    const guessed = await redeem(app, client, UNKNOWN_CODE, []).expect(400);

    expect(valid.body.code).toBe('CONSENT_REQUIRED');
    expect(withoutRequestId(guessed.body)).toEqual(withoutRequestId(valid.body));
  });

  it('pages own links by cursor without repeats or gaps', async () => {
    const client = await signIn(app, 'client');
    for (let index = 0; index < 3; index += 1) {
      await linkBetween(app, await signIn(app, 'coach'), client);
    }

    const first = await api().get('/v1/client/links?limit=2').set('Authorization', client.auth).expect(200);
    expect(first.body.items).toHaveLength(2);
    expect(first.body.nextCursor).not.toBeNull();
    const second = await api()
      .get('/v1/client/links')
      .query({ limit: 2, cursor: first.body.nextCursor })
      .set('Authorization', client.auth)
      .expect(200);

    const ids = [...first.body.items, ...second.body.items].map((link: { id: string }) => link.id);
    expect(new Set(ids).size).toBe(3);
    expect(second.body.items).toHaveLength(1);
    expect(second.body.nextCursor).toBeNull();
  });

  it('defaults the page size to 20 and rejects a page larger than 100', async () => {
    const client = await signIn(app, 'client');

    const page = await api().get('/v1/client/links').set('Authorization', client.auth).expect(200);
    expect(page.body).toEqual({ items: [], nextCursor: null });
    await api().get('/v1/client/links?limit=101').set('Authorization', client.auth).expect(400);
  });

  it('answers a tampered cursor with VALIDATION_FAILED', async () => {
    const client = await signIn(app, 'client');

    const response = await api()
      .get('/v1/client/links?cursor=not-a-cursor')
      .set('Authorization', client.auth)
      .expect(400);
    expect(ProblemDetailsSchema.parse(response.body)).toMatchObject({ code: 'VALIDATION_FAILED' });
  });

  it('stores only the sha256 of the code', async () => {
    const coach = await signIn(app, 'coach');
    const invite = await createInvite(app, coach);

    const rows = await prisma.invite.findMany();

    expect(rows).toHaveLength(1);
    expect(rows[0]?.codeHash).toBe(sha256(invite.code));
    expect(JSON.stringify(rows)).not.toContain(invite.code);
  });

  describe('invalid invites answer one identical INVITE_INVALID body', () => {
    it('reports a used, expired, revoked and unknown code the same way', async () => {
      const coach = await signIn(app, 'coach');
      const used = await createInvite(app, coach);
      await redeem(app, await signIn(app, 'client'), used.code).expect(201);

      const expired = await createInvite(app, coach);
      now = new Date(START.getTime() + INVITE_TTL_HOURS * HOUR_MS);

      const revoked = await createInvite(app, coach);
      await api().delete(`/v1/invites/${revoked.id}`).set('Authorization', coach.auth).expect(204);

      const responses = [
        await redeem(app, await signIn(app, 'client'), used.code),
        await redeem(app, await signIn(app, 'client'), expired.code),
        await redeem(app, await signIn(app, 'client'), revoked.code),
        await redeem(app, await signIn(app, 'client'), UNKNOWN_CODE),
      ];

      for (const response of responses) {
        expect(response.status).toBe(400);
        expect(ProblemDetailsSchema.parse(response.body)).toMatchObject({ code: 'INVITE_INVALID' });
      }
      const [first, ...rest] = responses.map((response) => withoutRequestId(response.body));
      for (const body of rest) expect(body).toEqual(first);
    });

    it('answers INVITE_INVALID to a client redeeming the same code twice', async () => {
      const coach = await signIn(app, 'coach');
      const client = await signIn(app, 'client');
      const invite = await createInvite(app, coach);
      await redeem(app, client, invite.code).expect(201);

      const again = await redeem(app, client, invite.code).expect(400);

      expect(again.body).toMatchObject({ code: 'INVITE_INVALID' });
    });

    it('keeps an invite unused when the redeem fails on consents', async () => {
      const coach = await signIn(app, 'coach');
      const client = await signIn(app, 'client');
      const invite = await createInvite(app, coach);

      await redeem(app, client, invite.code, ALL_REQUIRED_CONSENTS.slice(0, 2)).expect(400);

      const row = await prisma.invite.findFirstOrThrow({ where: { codeHash: sha256(invite.code) } });
      expect(row.usedAt).toBeNull();
      await redeem(app, client, invite.code).expect(201);
    });
  });

  describe('consents', () => {
    const [tos, healthData] = ALL_REQUIRED_CONSENTS;

    it.each([
      ['a required consent missing', [tos, healthData]],
      [
        'a required consent at a stale version',
        [tos, healthData, { type: 'coach_access', version: STALE_VERSION, granted: true }],
      ],
      [
        'a required consent withdrawn',
        [tos, healthData, { type: 'coach_access', version: CONSENT_VERSIONS.coach_access, granted: false }],
      ],
    ])('answers CONSENT_REQUIRED for %s', async (_label, consents) => {
      const coach = await signIn(app, 'coach');
      const invite = await createInvite(app, coach);

      const response = await redeem(app, await signIn(app, 'client'), invite.code, consents).expect(400);

      expect(response.body).toMatchObject({ code: 'CONSENT_REQUIRED' });
    });

    it('records the redeem consents in the append-only log', async () => {
      const coach = await signIn(app, 'coach');
      const client = await signIn(app, 'client');
      const invite = await createInvite(app, coach);
      const marketingDeclined = { type: 'marketing', version: CONSENT_VERSIONS.marketing, granted: false };

      await redeem(app, client, invite.code, [...ALL_REQUIRED_CONSENTS, marketingDeclined]).expect(201);

      const log = await api().get('/v1/me/consents').set('Authorization', client.auth).expect(200);
      expect(log.body.map((row: { type: string; granted: boolean }) => [row.type, row.granted])).toEqual([
        ['tos', true],
        ['health_data', true],
        ['coach_access', true],
        ['marketing', false],
      ]);
    });
  });

  describe('roles', () => {
    it('refuses a client on a coach-only invite route', async () => {
      const client = await signIn(app, 'client');

      const response = await api().post('/v1/invites').set('Authorization', client.auth).expect(403);

      expect(response.body).toMatchObject({ code: 'FORBIDDEN_ROLE' });
    });

    it('refuses a coach redeeming an invite', async () => {
      const coach = await signIn(app, 'coach');
      const invite = await createInvite(app, await signIn(app, 'coach'));

      const response = await redeem(app, coach, invite.code).expect(403);

      expect(response.body).toMatchObject({ code: 'FORBIDDEN_ROLE' });
    });
  });

  describe('rate limits', () => {
    it('answers RATE_LIMITED after five redeem attempts, counting malformed ones too', async () => {
      const coach = await signIn(app, 'coach');
      const client = await signIn(app, 'client');
      const invite = await createInvite(app, coach);

      for (let attempt = 0; attempt < 5; attempt += 1) {
        await api().post('/v1/invites/redeem').set('Authorization', client.auth).send({}).expect(400);
      }
      const blocked = await redeem(app, client, invite.code).expect(429);

      expect(blocked.body).toMatchObject({ code: 'RATE_LIMITED' });
    });

    it('answers RATE_LIMITED after ten invite creations in an hour', async () => {
      const coach = await signIn(app, 'coach');
      for (let created = 0; created < 10; created += 1) {
        await createInvite(app, coach);
      }

      const response = await api().post('/v1/invites').set('Authorization', coach.auth).expect(429);

      expect(response.body).toMatchObject({ code: 'RATE_LIMITED' });
    });
  });

  describe('existing links', () => {
    it('answers LINK_EXISTS for a second invite from an already linked coach and leaves it unused', async () => {
      const coach = await signIn(app, 'coach');
      const client = await signIn(app, 'client');
      await linkBetween(app, coach, client);

      const second = await createInvite(app, coach);
      const response = await redeem(app, client, second.code).expect(409);

      expect(response.body).toMatchObject({ code: 'LINK_EXISTS' });
      const row = await prisma.invite.findFirstOrThrow({ where: { codeHash: sha256(second.code) } });
      expect(row.usedAt).toBeNull();
    });

    it('rejects a second open link to the same coach at the database level', async () => {
      const coach = await signIn(app, 'coach');
      const client = await signIn(app, 'client');
      await linkBetween(app, coach, client);

      await expect(
        prisma.coachClient.create({ data: { coachId: coach.id, clientId: client.id, status: 'active' } }),
      ).rejects.toMatchObject({ code: 'P2002' });
    });
  });

  describe('revocation', () => {
    it('lets only the owner revoke; a foreign or unknown invite answers NOT_FOUND', async () => {
      const coach = await signIn(app, 'coach');
      const other = await signIn(app, 'coach');
      const invite = await createInvite(app, coach);

      await api().delete(`/v1/invites/${invite.id}`).set('Authorization', other.auth).expect(404);
      await api().delete(`/v1/invites/${randomUUID()}`).set('Authorization', coach.auth).expect(404);
      await api().delete(`/v1/invites/${invite.id}`).set('Authorization', coach.auth).expect(204);
    });
  });
});
