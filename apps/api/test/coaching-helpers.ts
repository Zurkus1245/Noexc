import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { CONSENT_VERSIONS, REQUIRED_CONSENT_TYPES, type CreateInviteResponse } from '@noexcuse/contracts';
import request from 'supertest';
import { tokenFor } from './support';

export type Actor = { auth: string; id: string };

export const ALL_REQUIRED_CONSENTS = REQUIRED_CONSENT_TYPES.map((type) => ({
  type,
  version: CONSENT_VERSIONS[type],
  granted: true,
}));

// Creates a fresh account with a profile; the subject is unique per call.
export async function signIn(app: INestApplication, role: 'coach' | 'client', displayName?: string): Promise<Actor> {
  const auth = `Bearer ${await tokenFor(app, `subject-${randomUUID()}`)}`;
  const response = await request(app.getHttpServer())
    .post('/v1/me')
    .set('Authorization', auth)
    .send({ role, displayName: displayName ?? role, timezone: 'Europe/Berlin' })
    .expect(201);
  return { auth, id: response.body.id as string };
}

export async function createInvite(app: INestApplication, coach: Actor): Promise<CreateInviteResponse> {
  const response = await request(app.getHttpServer()).post('/v1/invites').set('Authorization', coach.auth).expect(201);
  return response.body as CreateInviteResponse;
}

export function redeem(
  app: INestApplication,
  client: Actor,
  code: string,
  consents: unknown[] = ALL_REQUIRED_CONSENTS,
) {
  return request(app.getHttpServer())
    .post('/v1/invites/redeem')
    .set('Authorization', client.auth)
    .send({ code, consents });
}

// Coach invites and the client redeems: the usual way a link comes to exist.
export async function linkBetween(app: INestApplication, coach: Actor, client: Actor): Promise<{ id: string }> {
  const invite = await createInvite(app, coach);
  const response = await redeem(app, client, invite.code).expect(201);
  return response.body as { id: string };
}
