import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { AccountExportSchema, type PlanContent } from '@noexcuse/contracts';
import { addDays, todayInTimeZone } from '@noexcuse/domain';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { type Actor, linkBetween, signIn } from './coaching-helpers';
import { planWith } from './plan-helpers';
import { createTestApp, resetDatabase } from './support';

const CLIENT_TIMEZONE = 'Europe/Berlin';
const LOCK_WAIT_TIMEOUT_MS = 5000;
const LOCK_POLL_MS = 20;

describe('plans and calendar', () => {
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

  const api = () => request(app.getHttpServer());
  const today = () => todayInTimeZone(CLIENT_TIMEZONE, new Date());
  const planPath = (client: Actor) => `/v1/coach/clients/${client.id}/plan`;
  const calendarPath = (client: Actor) => `/v1/coach/clients/${client.id}/calendar`;
  const putPlan = (coach: Actor, client: Actor, baseVersion: number, content: PlanContent) =>
    api().put(planPath(client)).set('Authorization', coach.auth).send({ baseVersion, content });
  const clientCalendar = (client: Actor, from: string, to: string) =>
    api().get('/v1/client/calendar').query({ from, to }).set('Authorization', client.auth).expect(200);

  it('shows the coach edit to the client on the next read', async () => {
    const coach = await signIn(app, 'coach');
    const client = await signIn(app, 'client');
    await linkBetween(app, coach, client);
    const workoutKey = randomUUID();
    const date = addDays(today(), 1);

    await putPlan(coach, client, 0, planWith(workoutKey, 'Push')).expect(200);
    await api()
      .post(calendarPath(client))
      .set('Authorization', coach.auth)
      .send({ id: randomUUID(), date, workoutKey })
      .expect(201);

    const before = await clientCalendar(client, date, date);
    expect(before.body.items).toHaveLength(1);
    expect(before.body.items[0]).toMatchObject({ date, workoutKey, blockTitle: 'Strength', workout: { title: 'Push' } });

    await putPlan(coach, client, 1, planWith(workoutKey, 'Pull')).expect(200);

    const after = await clientCalendar(client, date, date);
    expect(after.body.items[0].workout.title).toBe('Pull');
    const ownPlans = await api().get('/v1/client/plans').set('Authorization', client.auth).expect(200);
    expect(ownPlans.body.items).toEqual([expect.objectContaining({ version: 2 })]);
  });

  it('lets exactly one of two writers with the same base version succeed', async () => {
    const coach = await signIn(app, 'coach');
    const client = await signIn(app, 'client');
    await linkBetween(app, coach, client);
    const workoutKey = randomUUID();

    const responses = await Promise.all([
      putPlan(coach, client, 0, planWith(workoutKey, 'A')),
      putPlan(coach, client, 0, planWith(workoutKey, 'B')),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
    const conflict = responses.find((response) => response.status === 409);
    expect(conflict?.body).toMatchObject({ code: 'VERSION_CONFLICT' });
  });

  it('refuses a plan that drops a workout still on the calendar', async () => {
    const coach = await signIn(app, 'coach');
    const client = await signIn(app, 'client');
    await linkBetween(app, coach, client);
    const workoutKey = randomUUID();
    await putPlan(coach, client, 0, planWith(workoutKey, 'Push')).expect(200);
    await api()
      .post(calendarPath(client))
      .set('Authorization', coach.auth)
      .send({ id: randomUUID(), date: today(), workoutKey })
      .expect(201);

    const response = await putPlan(coach, client, 1, planWith(randomUUID(), 'Other')).expect(409);

    expect(response.body).toMatchObject({ code: 'WORKOUT_SCHEDULED', errors: [{ path: 'content', message: workoutKey }] });
  });

  it('keeps future entries away from the client after the link ends, and keeps past ones', async () => {
    const coach = await signIn(app, 'coach');
    const client = await signIn(app, 'client');
    const link = await linkBetween(app, coach, client);
    const workoutKey = randomUUID();
    const past = addDays(today(), -2);
    const future = addDays(today(), 3);
    await putPlan(coach, client, 0, planWith(workoutKey, 'Push')).expect(200);
    for (const date of [past, future]) {
      await api()
        .post(calendarPath(client))
        .set('Authorization', coach.auth)
        .send({ id: randomUUID(), date, workoutKey })
        .expect(201);
    }

    await api().post(`/v1/links/${link.id}/end`).set('Authorization', coach.auth).expect(200);

    const remaining = await clientCalendar(client, addDays(today(), -5), addDays(today(), 5));
    expect(remaining.body.items.map((item: { date: string }) => item.date)).toEqual([past]);
  });

  it('answers 404 to a coach outside the link and 403 to a client on coach routes', async () => {
    const coach = await signIn(app, 'coach');
    const stranger = await signIn(app, 'coach');
    const client = await signIn(app, 'client');
    await linkBetween(app, coach, client);

    await api().get(planPath(client)).set('Authorization', stranger.auth).expect(404);
    await api().get(calendarPath(client)).query({ from: today(), to: today() }).set('Authorization', client.auth).expect(403);
  });

  it('includes the current plan and the calendar entries in the client export', async () => {
    const coach = await signIn(app, 'coach');
    const client = await signIn(app, 'client');
    await linkBetween(app, coach, client);
    const workoutKey = randomUUID();
    await putPlan(coach, client, 0, planWith(workoutKey, 'Push')).expect(200);
    await api()
      .post(calendarPath(client))
      .set('Authorization', coach.auth)
      .send({ id: randomUUID(), date: today(), workoutKey })
      .expect(201);

    const response = await api().get('/v1/me/export').set('Authorization', client.auth).expect(200);

    const exported = AccountExportSchema.parse(response.body);
    expect(exported.plans).toEqual([expect.objectContaining({ version: 1, clientId: client.id })]);
    expect(exported.calendarEntries).toEqual([expect.objectContaining({ workoutKey, workout: expect.objectContaining({ title: 'Push' }) })]);
  });

  // A request parked on a link lock shows as an advisory-lock waiter in the server, so the test can order its steps.
  async function waitForLockWaiters(count: number): Promise<void> {
    const prisma = app.get(PrismaService);
    const deadline = Date.now() + LOCK_WAIT_TIMEOUT_MS;
    while (Date.now() < deadline) {
      const [row] = await prisma.$queryRaw<{ waiters: number }[]>`
        SELECT count(*)::int AS waiters FROM pg_stat_activity
        WHERE wait_event_type = 'Lock' AND wait_event = 'advisory'`;
      if ((row?.waiters ?? 0) >= count) return;
      await new Promise((resolve) => setTimeout(resolve, LOCK_POLL_MS));
    }
    throw new Error(`no request waits on the link lock after ${LOCK_WAIT_TIMEOUT_MS} ms`);
  }

  it('keeps a future entry written under the link lock from surviving the link end', async () => {
    const coach = await signIn(app, 'coach');
    const client = await signIn(app, 'client');
    const link = await linkBetween(app, coach, client);
    const workoutKey = randomUUID();
    await putPlan(coach, client, 0, planWith(workoutKey, 'Push')).expect(200);
    await api()
      .post(calendarPath(client))
      .set('Authorization', coach.auth)
      .send({ id: randomUUID(), date: addDays(today(), -2), workoutKey })
      .expect(201);
    const prisma = app.get(PrismaService);
    const endingResponse = api().post(`/v1/links/${link.id}/end`).set('Authorization', coach.auth).then((response) => response);

    // The writer holds the link lock, so the end must queue behind it and cannot cut the entry before it is committed.
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${link.id}::text, 0))`;
      await waitForLockWaiters(1);
      await tx.calendarEntry.create({
        data: {
          id: randomUUID(),
          linkId: link.id,
          clientId: client.id,
          date: new Date(`${addDays(today(), 3)}T00:00:00.000Z`),
          workoutKey,
        },
      });
    });

    expect((await endingResponse).status).toBe(200);
    const survivors = await prisma.calendarEntry.findMany({ where: { linkId: link.id }, select: { date: true } });
    expect(survivors.map((row) => row.date.toISOString())).toEqual([`${addDays(today(), -2)}T00:00:00.000Z`]);
  });

  it('answers 404 to a calendar write that arrives after the link ended', async () => {
    const coach = await signIn(app, 'coach');
    const client = await signIn(app, 'client');
    const link = await linkBetween(app, coach, client);
    const workoutKey = randomUUID();
    await putPlan(coach, client, 0, planWith(workoutKey, 'Push')).expect(200);
    await api().post(`/v1/links/${link.id}/end`).set('Authorization', coach.auth).expect(200);

    await api()
      .post(calendarPath(client))
      .set('Authorization', coach.auth)
      .send({ id: randomUUID(), date: addDays(today(), 3), workoutKey })
      .expect(404);
  });

  it('deletes the client plans and calendar entries with the client account', async () => {
    const coach = await signIn(app, 'coach');
    const client = await signIn(app, 'client');
    await linkBetween(app, coach, client);
    const workoutKey = randomUUID();
    await putPlan(coach, client, 0, planWith(workoutKey, 'Push')).expect(200);
    await api()
      .post(calendarPath(client))
      .set('Authorization', coach.auth)
      .send({ id: randomUUID(), date: today(), workoutKey })
      .expect(201);

    await api().delete('/v1/me').set('Authorization', client.auth).expect(204);

    const prisma = app.get(PrismaService);
    expect(await prisma.planVersion.count()).toBe(0);
    expect(await prisma.calendarEntry.count()).toBe(0);
  });

  // Regression: a past entry pinned its workout in the plan forever and could be moved or deleted.
  it('keeps past entries fixed and lets the plan drop a workout that is only in the past', async () => {
    const coach = await signIn(app, 'coach');
    const client = await signIn(app, 'client');
    await linkBetween(app, coach, client);
    const workoutKey = randomUUID();
    await putPlan(coach, client, 0, planWith(workoutKey, 'Push')).expect(200);
    const entryId = randomUUID();
    await api()
      .post(calendarPath(client))
      .set('Authorization', coach.auth)
      .send({ id: entryId, date: addDays(today(), -1), workoutKey })
      .expect(201);

    const move = await api()
      .patch(`${calendarPath(client)}/${entryId}`)
      .set('Authorization', coach.auth)
      .send({ date: today() })
      .expect(409);
    expect(move.body.code).toBe('ENTRY_IN_PAST');
    const remove = await api().delete(`${calendarPath(client)}/${entryId}`).set('Authorization', coach.auth).expect(409);
    expect(remove.body.code).toBe('ENTRY_IN_PAST');

    await putPlan(coach, client, 1, planWith(randomUUID(), 'Pull')).expect(200);
  });

  // Regression: the coach's stored replay of the client's plan outlived the client's account deletion.
  it('deletes stored responses that carry the client data with the client account', async () => {
    const coach = await signIn(app, 'coach');
    const client = await signIn(app, 'client');
    await linkBetween(app, coach, client);
    const workoutKey = randomUUID();
    const idempotencyKey = randomUUID();
    // One body for both sends: planWith draws fresh ids, and a replay must repeat the exact request.
    const body = { baseVersion: 0, content: planWith(workoutKey, 'Push') };
    const send = () =>
      api().put(planPath(client)).set('Authorization', coach.auth).set('Idempotency-Key', idempotencyKey).send(body);
    const first = await send().expect(200);
    // The replay still works while the client exists.
    expect((await send().expect(200)).body).toEqual(first.body);
    await api()
      .post(calendarPath(client))
      .set('Authorization', coach.auth)
      .set('Idempotency-Key', randomUUID())
      .send({ id: randomUUID(), date: today(), workoutKey })
      .expect(201);

    const prisma = app.get(PrismaService);
    expect(await prisma.idempotencyRecord.count({ where: { dataSubjectId: client.id } })).toBe(2);

    await api().delete('/v1/me').set('Authorization', client.auth).expect(204);

    expect(await prisma.idempotencyRecord.count({ where: { dataSubjectId: client.id } })).toBe(0);
  });
});
