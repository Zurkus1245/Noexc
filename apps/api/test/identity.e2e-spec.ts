import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { AccountExportSchema, CONSENT_VERSIONS, UserSchema } from '@noexcuse/contracts';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { createTestApp, resetDatabase, tokenFor } from './support';

const PROFILE = { role: 'client', displayName: 'Alex', timezone: 'Europe/Berlin' } as const;

describe('identity', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(app);
  });

  const api = () => request(app.getHttpServer());
  const authed = async (subject = `subject-${randomUUID()}`) => ({
    subject,
    auth: `Bearer ${await tokenFor(app, subject)}`,
  });
  const createProfile = async (body: Record<string, unknown> = PROFILE) => {
    const { auth } = await authed();
    const response = await api().post('/v1/me').set('Authorization', auth).send(body).expect(201);
    return { auth, user: response.body as Record<string, unknown> };
  };

  describe('profile', () => {
    it('creates a profile and returns it without the auth subject', async () => {
      const { auth, user } = await createProfile();

      expect(UserSchema.parse(user)).toMatchObject(PROFILE);
      expect(user).not.toHaveProperty('authSubject');

      const current = await api().get('/v1/me').set('Authorization', auth).expect(200);
      expect(current.body).toEqual(user);
    });

    it('answers PROFILE_EXISTS for a second profile on the same account', async () => {
      const { auth } = await createProfile();

      const response = await api().post('/v1/me').set('Authorization', auth).send(PROFILE).expect(409);

      expect(response.body).toMatchObject({ code: 'PROFILE_EXISTS' });
    });

    it('rejects an invalid profile body with per-field errors', async () => {
      const { auth } = await authed();

      const response = await api()
        .post('/v1/me')
        .set('Authorization', auth)
        .send({ ...PROFILE, role: 'admin', timezone: 'Mars/Olympus' })
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_FAILED');
      expect(response.body.errors.map((issue: { path: string }) => issue.path)).toEqual(
        expect.arrayContaining(['role', 'timezone']),
      );
    });

    it('answers PROFILE_REQUIRED on profile routes before the profile exists', async () => {
      const { auth } = await authed();

      const current = await api().get('/v1/me').set('Authorization', auth).expect(403);
      expect(current.body).toMatchObject({ code: 'PROFILE_REQUIRED' });
      await api().get('/v1/me/export').set('Authorization', auth).expect(403);
    });

    it('patches displayName and timezone and rejects an empty patch', async () => {
      const { auth } = await createProfile();

      const updated = await api()
        .patch('/v1/me')
        .set('Authorization', auth)
        .send({ displayName: 'Alexandra', timezone: 'Europe/Paris' })
        .expect(200);
      expect(updated.body).toMatchObject({ displayName: 'Alexandra', timezone: 'Europe/Paris', role: 'client' });

      const empty = await api().patch('/v1/me').set('Authorization', auth).send({}).expect(400);
      expect(empty.body.code).toBe('VALIDATION_FAILED');
    });
  });

  describe('consents', () => {
    const grant = (type: string, granted = true) => ({
      type,
      granted,
      version: CONSENT_VERSIONS[type as keyof typeof CONSENT_VERSIONS],
    });

    it('appends consents and keeps every decision in the log', async () => {
      const { auth } = await createProfile();

      await api().post('/v1/me/consents').set('Authorization', auth).send(grant('tos')).expect(201);
      await api().post('/v1/me/consents').set('Authorization', auth).send(grant('tos', false)).expect(201);

      const list = await api().get('/v1/me/consents').set('Authorization', auth).expect(200);
      expect(list.body.map((consent: { granted: boolean }) => consent.granted)).toEqual([true, false]);
    });

    it('rejects a consent for a version that is not current', async () => {
      const { auth } = await createProfile();

      const response = await api()
        .post('/v1/me/consents')
        .set('Authorization', auth)
        .send({ type: 'tos', granted: true, version: '2000-01-01' })
        .expect(400);

      expect(response.body).toMatchObject({ code: 'VALIDATION_FAILED', errors: [{ path: 'version' }] });
    });
  });

  describe('export', () => {
    it('returns the own account data without secrets', async () => {
      const { auth, user } = await createProfile();
      await api()
        .post('/v1/me/consents')
        .set('Authorization', auth)
        .send({ type: 'health_data', granted: true, version: CONSENT_VERSIONS.health_data })
        .expect(201);

      const response = await api().get('/v1/me/export').set('Authorization', auth).expect(200);

      const exported = AccountExportSchema.parse(response.body);
      expect(exported.user).toEqual(user);
      expect(exported.consents).toHaveLength(1);
      expect(exported.links).toEqual([]);
      expect(exported.invites).toEqual([]);
      expect(JSON.stringify(response.body)).not.toContain('authSubject');
    });

    it('includes the links and invites the account is part of', async () => {
      const coach = await createProfile({ ...PROFILE, role: 'coach', displayName: 'Coach' });
      const client = await createProfile();
      const coachId = coach.user.id as string;
      const clientId = client.user.id as string;
      await prisma.coachClient.create({ data: { coachId, clientId, status: 'active' } });
      await prisma.invite.create({
        data: { coachId, codeHash: 'a'.repeat(64), expiresAt: new Date(Date.now() + 60_000) },
      });

      const coachExport = await api().get('/v1/me/export').set('Authorization', coach.auth).expect(200);
      const clientExport = await api().get('/v1/me/export').set('Authorization', client.auth).expect(200);

      expect(coachExport.body.links).toEqual([expect.objectContaining({ coachId, clientId, status: 'active' })]);
      expect(coachExport.body.invites).toHaveLength(1);
      expect(JSON.stringify(coachExport.body)).not.toContain('codeHash');
      expect(clientExport.body.links).toHaveLength(1);
      expect(clientExport.body.invites).toEqual([]);
    });
  });

  describe('account deletion', () => {
    it('removes the account, its consents and its profile, and only its own', async () => {
      const doomed = await createProfile();
      const kept = await createProfile({ ...PROFILE, displayName: 'Kept' });
      await api()
        .post('/v1/me/consents')
        .set('Authorization', doomed.auth)
        .send({ type: 'tos', granted: true, version: CONSENT_VERSIONS.tos })
        .expect(201);

      await api().delete('/v1/me').set('Authorization', doomed.auth).expect(204);

      await api().get('/v1/me').set('Authorization', doomed.auth).expect(403);
      await api().get('/v1/me').set('Authorization', kept.auth).expect(200);
      expect(await prisma.consent.count({ where: { userId: doomed.user.id as string } })).toBe(0);
      expect(await prisma.user.count()).toBe(1);
    });

    it('ends the link of a deleted coach, keeps it for the client, and removes the coach invites', async () => {
      const coach = await createProfile({ ...PROFILE, role: 'coach', displayName: 'Coach' });
      const client = await createProfile();
      const coachId = coach.user.id as string;
      const clientId = client.user.id as string;
      await prisma.coachClient.create({ data: { coachId, clientId, status: 'active' } });
      await prisma.invite.create({
        data: { coachId, codeHash: 'b'.repeat(64), expiresAt: new Date(Date.now() + 60_000) },
      });

      await api().delete('/v1/me').set('Authorization', coach.auth).expect(204);

      expect(await prisma.invite.count()).toBe(0);
      expect(await prisma.coachClient.findMany()).toEqual([
        expect.objectContaining({ coachId: null, clientId, status: 'ended', endedBy: 'coach' }),
      ]);
      const links = await api().get('/v1/client/links').set('Authorization', client.auth).expect(200);
      expect(links.body.items).toEqual([
        expect.objectContaining({ coachId: null, coachDisplayName: null, status: 'ended' }),
      ]);
    });

    it('ends the link of a deleted client and keeps it for the coach', async () => {
      const coach = await createProfile({ ...PROFILE, role: 'coach', displayName: 'Coach' });
      const client = await createProfile();
      const coachId = coach.user.id as string;
      const clientId = client.user.id as string;
      await prisma.coachClient.create({ data: { coachId, clientId, status: 'paused' } });

      await api().delete('/v1/me').set('Authorization', client.auth).expect(204);

      expect(await prisma.coachClient.findMany()).toEqual([
        expect.objectContaining({ coachId, clientId: null, status: 'ended', endedBy: 'client' }),
      ]);
      await api().get('/v1/coach/clients').set('Authorization', coach.auth).expect(200).expect((res) => {
        expect(res.body.items).toEqual([]);
      });
    });
  });
});
