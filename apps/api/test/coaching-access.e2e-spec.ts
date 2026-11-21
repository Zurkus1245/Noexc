import type { INestApplication } from '@nestjs/common';
import { CONSENT_VERSIONS, CoachClientSchema } from '@noexcuse/contracts';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, resetDatabase } from './support';
import { type Actor, createInvite, linkBetween, redeem, signIn } from './coaching-helpers';

describe('coaching access and link lifecycle', () => {
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
  const post = (path: string, actor: Actor) => api().post(path).set('Authorization', actor.auth);
  const get = (path: string, actor: Actor) => api().get(path).set('Authorization', actor.auth);

  describe('transitions', () => {
    it('lets the coach pause and resume, and the client or anyone else not act on the coach side', async () => {
      const coach = await signIn(app, 'coach');
      const client = await signIn(app, 'client');
      const stranger = await signIn(app, 'client');
      const link = await linkBetween(app, coach, client);

      await post(`/v1/links/${link.id}/pause`, client).expect(409).expect((r) => {
        expect(r.body).toMatchObject({ code: 'INVALID_TRANSITION' });
      });
      await post(`/v1/links/${link.id}/pause`, stranger).expect(404);

      const paused = await post(`/v1/links/${link.id}/pause`, coach).expect(200);
      expect(CoachClientSchema.parse(paused.body)).toMatchObject({ status: 'paused', endedAt: null });
      await post(`/v1/links/${link.id}/pause`, coach).expect(409);
      await get(`/v1/coach/clients/${client.id}`, coach).expect(200);

      const resumed = await post(`/v1/links/${link.id}/resume`, coach).expect(200);
      expect(resumed.body).toMatchObject({ status: 'active' });
      await post(`/v1/links/${link.id}/resume`, coach).expect(409);
    });

    it('ends a link by the client, stops access at once, and keeps the client own history', async () => {
      const coach = await signIn(app, 'coach');
      const client = await signIn(app, 'client');
      const link = await linkBetween(app, coach, client);

      const ended = await post(`/v1/links/${link.id}/end`, client).expect(200);
      expect(CoachClientSchema.parse(ended.body)).toMatchObject({ status: 'ended', endedBy: 'client' });
      expect(ended.body.endedAt).not.toBeNull();

      await get(`/v1/coach/clients/${client.id}`, coach).expect(404);
      expect((await get('/v1/coach/clients', coach).expect(200)).body.items).toEqual([]);
      expect((await get('/v1/client/links', client).expect(200)).body.items).toEqual([
        expect.objectContaining({ id: link.id, status: 'ended' }),
      ]);
      await post(`/v1/links/${link.id}/end`, coach).expect(409);
      await post(`/v1/links/${link.id}/pause`, coach).expect(409);
    });

    it('records the coach as the ender when the coach ends the link', async () => {
      const coach = await signIn(app, 'coach');
      const client = await signIn(app, 'client');
      const link = await linkBetween(app, coach, client);

      const ended = await post(`/v1/links/${link.id}/end`, coach).expect(200);

      expect(ended.body).toMatchObject({ status: 'ended', endedBy: 'coach' });
    });

    it('answers NOT_FOUND to a foreign coach acting on a link', async () => {
      const coach = await signIn(app, 'coach');
      const otherCoach = await signIn(app, 'coach');
      const client = await signIn(app, 'client');
      const link = await linkBetween(app, coach, client);

      await post(`/v1/links/${link.id}/end`, otherCoach).expect(404);
      await get(`/v1/coach/clients/${client.id}`, otherCoach).expect(404);
    });
  });

  describe('re-invite after end', () => {
    it('creates a new link, not a reopened one', async () => {
      const coach = await signIn(app, 'coach');
      const client = await signIn(app, 'client');
      const first = await linkBetween(app, coach, client);
      await post(`/v1/links/${first.id}/end`, coach).expect(200);

      const second = await linkBetween(app, coach, client);

      expect(second.id).not.toBe(first.id);
      const list = await get('/v1/coach/clients', coach).expect(200);
      expect(list.body.items).toEqual([expect.objectContaining({ id: second.id, status: 'active' })]);
    });
  });

  describe('consent gating', () => {
    it('cuts coach access at once when the client withdraws coach_access, and restores it on re-grant', async () => {
      const coach = await signIn(app, 'coach');
      const client = await signIn(app, 'client');
      await linkBetween(app, coach, client);
      const grant = (granted: boolean) =>
        post('/v1/me/consents', client).send({ type: 'coach_access', granted, version: CONSENT_VERSIONS.coach_access });

      await grant(false).expect(201);
      await get(`/v1/coach/clients/${client.id}`, coach).expect(404);

      await grant(true).expect(201);
      await get(`/v1/coach/clients/${client.id}`, coach).expect(200);
    });
  });

  describe('isolation', () => {
    it('answers NOT_FOUND for a client linked to another coach, and for an unknown client', async () => {
      const owner = await signIn(app, 'coach');
      const intruder = await signIn(app, 'coach');
      const client = await signIn(app, 'client');
      await linkBetween(app, owner, client);

      await get(`/v1/coach/clients/${client.id}`, intruder).expect(404);
      await get(`/v1/coach/clients/${(await signIn(app, 'client')).id}`, owner).expect(404);
    });

    it('refuses a client on coach-only reads', async () => {
      const client = await signIn(app, 'client');

      await get('/v1/coach/clients', client).expect(403);
      await get(`/v1/coach/clients/${client.id}`, client).expect(403);
    });
  });

  describe('pagination', () => {
    it('pages the open links with a cursor and never repeats an item', async () => {
      const coach = await signIn(app, 'coach');
      const clients = [await signIn(app, 'client'), await signIn(app, 'client'), await signIn(app, 'client')];
      for (const client of clients) await linkBetween(app, coach, client);

      const first = await get('/v1/coach/clients?limit=2', coach).expect(200);
      expect(first.body.items).toHaveLength(2);
      expect(first.body.nextCursor).not.toBeNull();

      const second = await get(`/v1/coach/clients?limit=2&cursor=${encodeURIComponent(first.body.nextCursor)}`, coach).expect(200);
      expect(second.body.items).toHaveLength(1);
      expect(second.body.nextCursor).toBeNull();

      const ids = [...first.body.items, ...second.body.items].map((item: { clientId: string }) => item.clientId);
      expect([...ids].sort()).toEqual(clients.map((client) => client.id).sort());
    });

    it('rejects a tampered cursor with VALIDATION_FAILED', async () => {
      const coach = await signIn(app, 'coach');

      const response = await get('/v1/coach/clients?cursor=not-a-real-cursor', coach).expect(400);

      expect(response.body).toMatchObject({ code: 'VALIDATION_FAILED' });
    });
  });

  describe('account deletion', () => {
    it('ends the coach access when the client deletes the account', async () => {
      const coach = await signIn(app, 'coach');
      const client = await signIn(app, 'client');
      await linkBetween(app, coach, client);

      await api().delete('/v1/me').set('Authorization', client.auth).expect(204);

      await get(`/v1/coach/clients/${client.id}`, coach).expect(404);
      expect((await get('/v1/coach/clients', coach).expect(200)).body.items).toEqual([]);
    });

    it('ends the coach link for the client and removes the coach invites when the coach deletes the account', async () => {
      const coach = await signIn(app, 'coach');
      const client = await signIn(app, 'client');
      await linkBetween(app, coach, client);
      await createInvite(app, coach);

      await api().delete('/v1/me').set('Authorization', coach.auth).expect(204);

      expect((await get('/v1/client/links', client).expect(200)).body.items).toEqual([
        expect.objectContaining({ coachId: null, coachDisplayName: null, status: 'ended' }),
      ]);
      await get(`/v1/coach/clients/${client.id}`, client).expect(403);
    });

    it('does not let an invite of a deleted coach be redeemed', async () => {
      const coach = await signIn(app, 'coach');
      const invite = await createInvite(app, coach);

      await api().delete('/v1/me').set('Authorization', coach.auth).expect(204);

      await redeem(app, await signIn(app, 'client'), invite.code).expect(400);
    });
  });
});
