import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { CONSENT_VERSIONS } from '@noexcuse/contracts';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Clock } from '../src/common/clock/clock';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { IdempotencyRepository } from '../src/infra/idempotency/idempotency.repository';
import { RateLimiter } from '../src/infra/rate-limit/rate-limiter.service';
import { createTestApp, resetDatabase, tokenFor } from './support';

const PROFILE = { role: 'client', displayName: 'Alex', timezone: 'Europe/Berlin' };
const COACH = { role: 'coach', displayName: 'Coach', timezone: 'Europe/Berlin' };
const TOS_CONSENT = { type: 'tos', granted: true, version: CONSENT_VERSIONS.tos };
const HOUR_MS = 60 * 60 * 1000;
const START = new Date('2026-11-21T10:00:30.000Z');

describe('idempotency', () => {
  let app: INestApplication;
  let now: Date;
  const clock: Clock = { now: () => now };

  beforeAll(async () => {
    now = START;
    app = await createTestApp({ clock });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    now = START;
    await resetDatabase(app);
  });

  const api = () => request(app.getHttpServer());
  const auth = async () => `Bearer ${await tokenFor(app, `subject-${randomUUID()}`)}`;

  it('replays the stored response for a repeated key and body', async () => {
    const header = await auth();
    const key = randomUUID();

    const first = await api().post('/v1/me').set('Authorization', header).set('Idempotency-Key', key).send(PROFILE).expect(201);
    const replay = await api().post('/v1/me').set('Authorization', header).set('Idempotency-Key', key).send(PROFILE).expect(201);

    expect(replay.body).toEqual(first.body);
    expect(await app.get(PrismaService).user.count()).toBe(1);
  });

  it('answers IDEMPOTENCY_CONFLICT when a key is reused with another body', async () => {
    const header = await auth();
    const key = randomUUID();
    await api().post('/v1/me').set('Authorization', header).set('Idempotency-Key', key).send(PROFILE).expect(201);

    const response = await api()
      .post('/v1/me')
      .set('Authorization', header)
      .set('Idempotency-Key', key)
      .send({ ...PROFILE, displayName: 'Someone else' })
      .expect(409);

    expect(response.body).toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
  });

  it('rejects a non-UUID key', async () => {
    const response = await api()
      .post('/v1/me')
      .set('Authorization', await auth())
      .set('Idempotency-Key', 'not-a-uuid')
      .send(PROFILE)
      .expect(400);

    expect(response.body).toMatchObject({ code: 'VALIDATION_FAILED', errors: [{ path: 'idempotency-key' }] });
  });

  it('frees the key when the attempt fails, so a corrected retry goes through', async () => {
    const header = await auth();
    const key = randomUUID();

    await api().post('/v1/me').set('Authorization', header).set('Idempotency-Key', key).send({ role: 'admin' }).expect(400);
    await api().post('/v1/me').set('Authorization', header).set('Idempotency-Key', key).send(PROFILE).expect(201);
  });

  it('treats a key as new once its 24h window has passed', async () => {
    const header = await auth();
    const key = randomUUID();
    await api().post('/v1/me').set('Authorization', header).set('Idempotency-Key', key).send(PROFILE).expect(201);

    now = new Date(START.getTime() + 24 * HOUR_MS + 1);
    const response = await api()
      .post('/v1/me/consents')
      .set('Authorization', header)
      .set('Idempotency-Key', key)
      .send(TOS_CONSENT)
      .expect(201);

    expect(response.body).toMatchObject({ type: 'tos', granted: true });
  });

  it('never stores an invite code: a repeated invite key is a conflict and no record holds the code', async () => {
    const header = await auth();
    await api().post('/v1/me').set('Authorization', header).send(COACH).expect(201);
    const key = randomUUID();

    const created = await api().post('/v1/invites').set('Authorization', header).set('Idempotency-Key', key).expect(201);
    const replay = await api().post('/v1/invites').set('Authorization', header).set('Idempotency-Key', key).expect(409);

    expect(replay.body).toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
    const records = await app.get(PrismaService).idempotencyRecord.findMany({ where: { key } });
    expect(records).toEqual([expect.objectContaining({ responseStatus: 201, responseBody: null })]);
    expect(JSON.stringify(records)).not.toContain(created.body.code as string);
  });

  it('releases an expired reservation only once it has expired', async () => {
    const records = app.get(IdempotencyRepository);
    const reservation = { subject: `subject-${randomUUID()}`, key: randomUUID() };
    await records.insert({
      ...reservation,
      requestHash: 'h'.repeat(64),
      createdAt: START,
      expiresAt: new Date(START.getTime() + HOUR_MS),
      dataSubjectId: null,
    });

    await records.releaseExpired(reservation, START);
    expect(await records.find(reservation)).not.toBeNull();

    await records.releaseExpired(reservation, new Date(START.getTime() + HOUR_MS));
    expect(await records.find(reservation)).toBeNull();
  });
});

describe('rate limiter', () => {
  let app: INestApplication;
  let now: Date;
  const clock: Clock = { now: () => now };

  beforeAll(async () => {
    now = START;
    app = await createTestApp({ clock });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    now = START;
    await resetDatabase(app);
  });

  it('allows the limit per fixed window and resets in the next window', async () => {
    const limiter = app.get(RateLimiter);
    const policy = { limit: 2, windowSeconds: 60 };
    const key = `coach:${randomUUID()}`;

    await limiter.consume(key, policy);
    await limiter.consume(key, policy);
    await expect(limiter.consume(key, policy)).rejects.toMatchObject({ status: 429, code: 'RATE_LIMITED' });

    now = new Date('2026-11-21T10:01:00.000Z');
    await expect(limiter.consume(key, policy)).resolves.toBeUndefined();
  });

  it('keeps keys independent', async () => {
    const limiter = app.get(RateLimiter);
    const policy = { limit: 1, windowSeconds: 60 };
    await limiter.consume('user:a', policy);

    await expect(limiter.consume('user:b', policy)).resolves.toBeUndefined();
  });
});

describe('database constraints', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(app);
  });

  it('allows one open link per coach and client, and a new one once the previous link ended', async () => {
    const prisma = app.get(PrismaService);
    const coachId = (await prisma.user.create({ data: { authSubject: 'coach-c', role: 'coach', displayName: 'C', timezone: 'UTC' } })).id;
    const clientId = (await prisma.user.create({ data: { authSubject: 'client-c', role: 'client', displayName: 'K', timezone: 'UTC' } })).id;
    await prisma.coachClient.create({ data: { coachId, clientId, status: 'active' } });

    await expect(prisma.coachClient.create({ data: { coachId, clientId, status: 'paused' } })).rejects.toMatchObject({ code: 'P2002' });

    await prisma.coachClient.updateMany({
      where: { coachId, clientId },
      data: { status: 'ended', endedAt: new Date(), endedBy: 'client' },
    });
    await expect(prisma.coachClient.create({ data: { coachId, clientId, status: 'active' } })).resolves.toMatchObject({ status: 'active' });
  });

  it('keeps a party only on ended links: an open link cannot lose its coach or client', async () => {
    const prisma = app.get(PrismaService);
    const coachId = (await prisma.user.create({ data: { authSubject: 'coach-p', role: 'coach', displayName: 'P', timezone: 'UTC' } })).id;

    // The pg adapter reports CHECK violations as the generic database error P2039 (not a unique violation).
    await expect(prisma.coachClient.create({ data: { coachId, clientId: null, status: 'active' } })).rejects.toMatchObject({
      code: 'P2039',
    });
    await expect(prisma.coachClient.create({ data: { coachId, clientId: null, status: 'ended', endedBy: 'coach' } })).resolves.toMatchObject({
      clientId: null,
    });
  });

  it('indexes both link lists by party, creation order and id', async () => {
    const prisma = app.get(PrismaService);
    const rows = await prisma.$queryRaw<{ indexdef: string }[]>`
      SELECT indexdef FROM pg_indexes WHERE tablename = 'CoachClient' AND schemaname = current_schema()`;
    const definitions = rows.map((row) => row.indexdef);

    expect(definitions.some((def) => def.includes('("coachId", status, "createdAt", id)'))).toBe(true);
    expect(definitions.some((def) => def.includes('("clientId", "createdAt", id)'))).toBe(true);
  });

  it('never stores two invites with the same code hash', async () => {
    const prisma = app.get(PrismaService);
    const coachId = (await prisma.user.create({ data: { authSubject: 'coach-i', role: 'coach', displayName: 'I', timezone: 'UTC' } })).id;
    const data = { coachId, codeHash: 'c'.repeat(64), expiresAt: new Date(Date.now() + HOUR_MS) };
    await prisma.invite.create({ data });

    await expect(prisma.invite.create({ data })).rejects.toMatchObject({ code: 'P2002' });
  });
});

describe('problem responses', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(app);
  });

  it('answers a malformed JSON body without echoing it', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/me')
      .set('Authorization', `Bearer ${await tokenFor(app, `subject-${randomUUID()}`)}`)
      .set('Content-Type', 'application/json')
      .send('{"displayName":"echo-body-secret"')
      .expect(400);

    expect(response.body).toMatchObject({ status: 400, code: 'VALIDATION_FAILED', detail: 'Malformed request' });
    expect(JSON.stringify(response.body)).not.toContain('echo-body-secret');
  });
});
