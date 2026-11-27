import { createPublicKey, randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { CONSENT_VERSIONS, ProblemDetailsSchema } from '@noexcuse/contracts';
import { addDays, todayInTimeZone } from '@noexcuse/domain';
import { SignJWT, generateKeyPair, importPKCS8, type JWTPayload } from 'jose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ALL_REQUIRED_CONSENTS, type Actor, createInvite, linkBetween, redeem, signIn } from './coaching-helpers';
import { planWith } from './plan-helpers';
import { createTestApp, localPublicJwk, resetDatabase, tokenFor } from './support';

// Authorization matrix: every route the controllers register, every relevant actor and resource id.
// Foreign and nonexistent resources must answer identically (404 NOT_FOUND, same body modulo requestId).

// 'none': coachA and clientX never link; clientX's link id is unknown, like any random id.
const STATES = ['active', 'paused', 'ended', 'consentRevoked', 'none'] as const;
type LinkState = (typeof STATES)[number];

type CallerName = 'anon' | 'noProfile' | 'coachA' | 'coachB' | 'clientX' | 'clientY';

const EXPECTED_ROUTES = [
  'GET /v1/auth/local/jwks',
  'POST /v1/auth/local/token',
  'POST /v1/me',
  'GET /v1/me',
  'PATCH /v1/me',
  'DELETE /v1/me',
  'GET /v1/me/consents',
  'POST /v1/me/consents',
  'GET /v1/me/export',
  'POST /v1/invites',
  'DELETE /v1/invites/:id',
  'POST /v1/invites/redeem',
  'GET /v1/coach/clients',
  'GET /v1/coach/clients/:clientId',
  'GET /v1/client/links',
  'POST /v1/links/:linkId/pause',
  'POST /v1/links/:linkId/resume',
  'POST /v1/links/:linkId/end',
  'GET /v1/coach/clients/:clientId/plan',
  'PUT /v1/coach/clients/:clientId/plan',
  'GET /v1/coach/clients/:clientId/plan/versions',
  'GET /v1/coach/clients/:clientId/plan/versions/:version',
  'GET /v1/coach/clients/:clientId/calendar',
  'POST /v1/coach/clients/:clientId/calendar',
  'PATCH /v1/coach/clients/:clientId/calendar/:entryId',
  'DELETE /v1/coach/clients/:clientId/calendar/:entryId',
  'GET /v1/client/calendar',
  'GET /v1/client/plans',
].sort();

const UNKNOWN_CODE = '0123456789ABCDEFGHJKMNPQRS';
const NEW_PROFILE = { role: 'coach', displayName: 'Newcomer', timezone: 'Europe/Berlin' };
const PRIVATE_KEY_PEM = process.env.LOCAL_AUTH_PRIVATE_KEY_PEM ?? '';
const ISSUER = process.env.AUTH_ISSUER ?? '';
const AUDIENCE = process.env.AUTH_AUDIENCE ?? '';

type Outcome = { readonly status: number; readonly code?: string };
type Expect = Outcome | ((state: LinkState) => Outcome);
type Caller = { auth?: string; id?: string };
type Req = { readonly method: 'get' | 'post' | 'put' | 'patch' | 'delete'; readonly path: string; readonly body?: object };

type World = {
  readonly coachA: Actor;
  readonly coachB: Actor;
  readonly clientX: Actor;
  readonly clientY: Actor;
  readonly clientZ: Actor;
  readonly noProfile: Caller;
  readonly linkX: string;
  readonly linkZ: string;
  readonly inviteA: { id: string; code: string };
  readonly inviteB: { id: string; code: string };
  readonly usedCode: string;
  readonly revokedCode: string;
  // Stage 2: clientX's plan (versions 1 and 2) and entries; clientZ's entry. Under 'none' the X ids are unknown.
  readonly workoutX: string;
  readonly entryPastX: string;
  readonly entryFutureX: string;
  readonly entryZ: string;
};

type Ctx = { readonly w: World; readonly state: LinkState; readonly caller: CallerName };
type Row = {
  readonly label: string;
  readonly caller: CallerName;
  readonly req: (w: World) => Req;
  readonly want: Expect;
  readonly verify?: (res: request.Response, ctx: Ctx) => void;
};

const UNAUTHENTICATED: Outcome = { status: 401, code: 'UNAUTHENTICATED' };
const PROFILE_REQUIRED: Outcome = { status: 403, code: 'PROFILE_REQUIRED' };
const FORBIDDEN_ROLE: Outcome = { status: 403, code: 'FORBIDDEN_ROLE' };
const NOT_FOUND: Outcome = { status: 404, code: 'NOT_FOUND' };
const VALIDATION_FAILED: Outcome = { status: 400, code: 'VALIDATION_FAILED' };
const INVITE_INVALID: Outcome = { status: 400, code: 'INVITE_INVALID' };
const PROFILE_EXISTS: Outcome = { status: 409, code: 'PROFILE_EXISTS' };
const LINK_EXISTS: Outcome = { status: 409, code: 'LINK_EXISTS' };
const INVALID_TRANSITION: Outcome = { status: 409, code: 'INVALID_TRANSITION' };
const RATE_LIMITED: Outcome = { status: 429, code: 'RATE_LIMITED' };
const OK: Outcome = { status: 200 };
const CREATED: Outcome = { status: 201 };
const NO_CONTENT: Outcome = { status: 204 };
const VERSION_CONFLICT: Outcome = { status: 409, code: 'VERSION_CONFLICT' };
const WORKOUT_SCHEDULED: Outcome = { status: 409, code: 'WORKOUT_SCHEDULED' };
const WORKOUT_NOT_IN_PLAN: Outcome = { status: 422, code: 'WORKOUT_NOT_IN_PLAN' };
const ENTRY_ID_CONFLICT: Outcome = { status: 409, code: 'ENTRY_ID_CONFLICT' };

// Gates every protected route answers before any handler logic: no token, then no profile.
const GATES = { anon: UNAUTHENTICATED, noProfile: PROFILE_REQUIRED } as const;
const PROFILE_NAMES = ['coachA', 'coachB', 'clientX', 'clientY', 'clientZ'] as const;
const DISPLAY_NAMES = {
  coachA: 'Coach Alpha',
  coachB: 'Coach Beta',
  clientX: 'Client Xavier',
  clientY: 'Client Yolanda',
  clientZ: 'Client Zed',
} as const;
const profileWant = (outcome: Outcome): Record<CallerName, Expect> => ({
  ...GATES,
  coachA: outcome,
  coachB: outcome,
  clientX: outcome,
  clientY: outcome,
});

const resolve = (want: Expect, state: LinkState): Outcome => (typeof want === 'function' ? want(state) : want);
const callerOf = (w: World, name: CallerName): Caller => (name === 'anon' ? {} : w[name]);
const callerId = (w: World, name: CallerName): string | undefined => callerOf(w, name).id;

const rowsOf = (
  label: string,
  req: (w: World) => Req,
  want: Record<CallerName, Expect>,
  verify?: Row['verify'],
): Row[] =>
  (Object.keys(want) as CallerName[]).map((caller) => ({ label, caller, req, want: want[caller], verify }));

function call(app: INestApplication, caller: Caller, req: Req): request.Test {
  const test = request(app.getHttpServer())[req.method](req.path);
  if (caller.auth !== undefined) test.set('Authorization', caller.auth);
  return req.body === undefined ? test : test.send(req.body);
}

function expectOutcome(res: request.Response, outcome: Outcome): void {
  expect(res.status, JSON.stringify(res.body)).toBe(outcome.status);
  if (outcome.status >= 400) {
    expect(res.headers['content-type']).toContain('application/problem+json');
    expect(ProblemDetailsSchema.parse(res.body).status).toBe(outcome.status);
  }
  if (outcome.code !== undefined) expect(res.body).toMatchObject({ code: outcome.code });
}

// The problem body minus the per-request correlation id: what a caller can compare across resources.
const withoutRequestId = (body: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(body).filter(([key]) => key !== 'requestId'));

async function buildWorld(app: INestApplication, state: LinkState): Promise<World> {
  const coachA = await signIn(app, 'coach', DISPLAY_NAMES.coachA);
  const coachB = await signIn(app, 'coach', DISPLAY_NAMES.coachB);
  const clientX = await signIn(app, 'client', DISPLAY_NAMES.clientX);
  const clientY = await signIn(app, 'client', DISPLAY_NAMES.clientY);
  const clientZ = await signIn(app, 'client', DISPLAY_NAMES.clientZ);
  const noProfile = { auth: `Bearer ${await tokenFor(app, `subject-${randomUUID()}`)}` };

  const usedA = await createInvite(app, coachA);
  const linkX = state === 'none' ? randomUUID() : ((await redeem(app, clientX, usedA.code).expect(201)).body.id as string);
  const linkZ = (await linkBetween(app, coachA, clientZ)).id;
  const inviteA = await createInvite(app, coachA);

  const revokedB = await createInvite(app, coachB);
  await call(app, coachB, { method: 'delete', path: `/v1/invites/${revokedB.id}` }).expect(204);
  const inviteB = await createInvite(app, coachB);

  // Plan and entries are seeded before the state is applied: ending the link removes only the future entries.
  const workoutX = randomUUID();
  const entryPastX = randomUUID();
  const entryFutureX = randomUUID();
  const entryZ = randomUUID();
  if (state !== 'none') {
    await seedPlan(app, coachA, clientX, workoutX, [
      { id: entryPastX, date: dayOffset(-2) },
      { id: entryFutureX, date: dayOffset(3) },
    ]);
  }
  await seedPlan(app, coachA, clientZ, randomUUID(), [{ id: entryZ, date: dayOffset(1) }]);

  const world: World = {
    coachA,
    coachB,
    clientX,
    clientY,
    clientZ,
    noProfile,
    linkX,
    linkZ,
    inviteA: { id: inviteA.id, code: inviteA.code },
    inviteB: { id: inviteB.id, code: inviteB.code },
    usedCode: usedA.code,
    revokedCode: revokedB.code,
    workoutX,
    entryPastX,
    entryFutureX,
    entryZ,
  };
  await applyState(app, world, state);
  return world;
}

// Two plan versions (both containing the workout) and the given entries, written by the coach.
async function seedPlan(app: INestApplication, coach: Actor, client: Actor, workoutKey: string, entries: { id: string; date: string }[]) {
  await call(app, coach, { method: 'put', path: planPath(client), body: { baseVersion: 0, content: planWith(workoutKey, 'Push') } }).expect(200);
  await call(app, coach, { method: 'put', path: planPath(client), body: { baseVersion: 1, content: planWith(workoutKey, 'Pull') } }).expect(200);
  for (const entry of entries) {
    await call(app, coach, {
      method: 'post',
      path: calendarPath(client),
      body: { id: entry.id, date: entry.date, workoutKey },
    }).expect(201);
  }
}

// The link under test (coachA <-> clientX) moves into the requested state through the public API only.
async function applyState(app: INestApplication, w: World, state: LinkState): Promise<void> {
  if (state === 'paused') {
    await call(app, w.coachA, { method: 'post', path: `/v1/links/${w.linkX}/pause` }).expect(200);
  }
  if (state === 'ended') {
    await call(app, w.clientX, { method: 'post', path: `/v1/links/${w.linkX}/end` }).expect(200);
  }
  if (state === 'consentRevoked') {
    await call(app, w.clientX, {
      method: 'post',
      path: '/v1/me/consents',
      body: { type: 'coach_access', version: CONSENT_VERSIONS.coach_access, granted: false },
    }).expect(201);
  }
}

// ---- Expectation tables ---------------------------------------------------------------------------

const identityRows: Row[] = [
  ...rowsOf(
    'create profile',
    () => ({ method: 'post', path: '/v1/me', body: NEW_PROFILE }),
    { anon: UNAUTHENTICATED, noProfile: CREATED, coachA: PROFILE_EXISTS, coachB: PROFILE_EXISTS, clientX: PROFILE_EXISTS, clientY: PROFILE_EXISTS },
  ),
  ...rowsOf('read own profile', () => ({ method: 'get', path: '/v1/me' }), profileWant(OK), verifyOwnId),
  ...rowsOf(
    'rename own profile',
    () => ({ method: 'patch', path: '/v1/me', body: { displayName: 'Renamed' } }),
    profileWant(OK),
    verifyOwnId,
  ),
  ...rowsOf(
    'patch role (mass assignment)',
    () => ({ method: 'patch', path: '/v1/me', body: { role: 'coach' } }),
    { anon: UNAUTHENTICATED, noProfile: VALIDATION_FAILED, coachA: VALIDATION_FAILED, coachB: VALIDATION_FAILED, clientX: VALIDATION_FAILED, clientY: VALIDATION_FAILED },
  ),
  ...rowsOf('list own consents', () => ({ method: 'get', path: '/v1/me/consents' }), profileWant(OK), verifyOwnConsents),
  ...rowsOf(
    'grant own consent',
    () => ({ method: 'post', path: '/v1/me/consents', body: { type: 'marketing', version: CONSENT_VERSIONS.marketing, granted: true } }),
    profileWant(CREATED),
    verifyOwnConsents,
  ),
  ...rowsOf('export own account', () => ({ method: 'get', path: '/v1/me/export' }), profileWant(OK), verifyExport),
];

const inviteRows: Row[] = [
  ...rowsOf(
    'create invite',
    () => ({ method: 'post', path: '/v1/invites' }),
    { ...GATES, coachA: CREATED, coachB: CREATED, clientX: FORBIDDEN_ROLE, clientY: FORBIDDEN_ROLE },
  ),
  ...rowsOf(
    'revoke own invite (A owns)',
    (w) => ({ method: 'delete', path: `/v1/invites/${w.inviteA.id}` }),
    { ...GATES, coachA: NO_CONTENT, coachB: NOT_FOUND, clientX: FORBIDDEN_ROLE, clientY: FORBIDDEN_ROLE },
  ),
  ...rowsOf(
    'revoke foreign invite (B owns)',
    (w) => ({ method: 'delete', path: `/v1/invites/${w.inviteB.id}` }),
    { ...GATES, coachA: NOT_FOUND, coachB: NO_CONTENT, clientX: FORBIDDEN_ROLE, clientY: FORBIDDEN_ROLE },
  ),
  ...rowsOf(
    'revoke random invite id',
    () => ({ method: 'delete', path: `/v1/invites/${randomUUID()}` }),
    { ...GATES, coachA: NOT_FOUND, coachB: NOT_FOUND, clientX: FORBIDDEN_ROLE, clientY: FORBIDDEN_ROLE },
  ),
  ...rowsOf(
    'revoke malformed invite id',
    () => ({ method: 'delete', path: '/v1/invites/not-a-uuid' }),
    { anon: UNAUTHENTICATED, noProfile: VALIDATION_FAILED, coachA: VALIDATION_FAILED, coachB: VALIDATION_FAILED, clientX: VALIDATION_FAILED, clientY: VALIDATION_FAILED },
  ),
  ...rowsOf(
    'redeem fresh invite of B',
    (w) => redeemReq(w.inviteB.code),
    { ...GATES, coachA: FORBIDDEN_ROLE, coachB: FORBIDDEN_ROLE, clientX: CREATED, clientY: CREATED },
    verifyFreshLink,
  ),
  ...rowsOf(
    'redeem already-used invite',
    (w) => redeemReq(w.usedCode),
    { ...GATES, coachA: FORBIDDEN_ROLE, coachB: FORBIDDEN_ROLE, clientX: INVITE_INVALID, clientY: INVITE_INVALID },
  ),
  ...rowsOf(
    'redeem revoked invite',
    (w) => redeemReq(w.revokedCode),
    { ...GATES, coachA: FORBIDDEN_ROLE, coachB: FORBIDDEN_ROLE, clientX: INVITE_INVALID, clientY: INVITE_INVALID },
  ),
  ...rowsOf(
    'redeem unknown code',
    () => redeemReq(UNKNOWN_CODE),
    { ...GATES, coachA: FORBIDDEN_ROLE, coachB: FORBIDDEN_ROLE, clientX: INVITE_INVALID, clientY: INVITE_INVALID },
  ),
];

const clientLinkRows: Row[] = rowsOf(
  'list own links',
  () => ({ method: 'get', path: '/v1/client/links' }),
  { ...GATES, coachA: FORBIDDEN_ROLE, coachB: FORBIDDEN_ROLE, clientX: OK, clientY: OK },
  (res, { w, caller }) => {
    const expected = caller === 'clientX' ? [w.linkX] : [];
    expect(res.body.items.map((link: { id: string }) => link.id)).toEqual(expected);
  },
);

const authRows: Row[] = [
  ...rowsOf('issue local token', () => ({ method: 'post', path: '/v1/auth/local/token', body: { subject: 'matrix' } }), { anon: CREATED, noProfile: CREATED, coachA: CREATED, coachB: CREATED, clientX: CREATED, clientY: CREATED }),
  ...rowsOf('issue local token without subject', () => ({ method: 'post', path: '/v1/auth/local/token', body: {} }), { anon: VALIDATION_FAILED, noProfile: VALIDATION_FAILED, coachA: VALIDATION_FAILED, coachB: VALIDATION_FAILED, clientX: VALIDATION_FAILED, clientY: VALIDATION_FAILED }),
  ...rowsOf('read local jwks', () => ({ method: 'get', path: '/v1/auth/local/jwks' }), { anon: OK, noProfile: OK, coachA: OK, coachB: OK, clientX: OK, clientY: OK }),
];

// Coach-side reads and link actions depend on the link state of coachA <-> clientX.
const coachListRows = rowsOf(
  'list coach clients',
  () => ({ method: 'get', path: '/v1/coach/clients' }),
  { ...GATES, coachA: OK, coachB: OK, clientX: FORBIDDEN_ROLE, clientY: FORBIDDEN_ROLE },
  verifyCoachList,
);

const coachDetailRows = (targetLabel: string, target: (w: World) => string, want: Record<CallerName, Expect>): Row[] =>
  rowsOf(`read client detail ${targetLabel}`, (w) => ({ method: 'get', path: `/v1/coach/clients/${target(w)}` }), want);

const linkActionRows = (action: 'pause' | 'resume' | 'end', target: (w: World) => string, label: string): Row[] => {
  const req = (w: World): Req => ({ method: 'post', path: `/v1/links/${target(w)}/${action}` });
  return rowsOf(`${action} ${label}`, req, linkActionWants(action, label));
};

// Participants of an open link may act on it; a participant of an ended link gets INVALID_TRANSITION, anyone else 404.
function linkActionWants(action: 'pause' | 'resume' | 'end', label: string): Record<CallerName, Expect> {
  const gate = { ...GATES, coachB: NOT_FOUND, clientY: NOT_FOUND };
  if (label === 'malformed id') {
    return { anon: UNAUTHENTICATED, noProfile: VALIDATION_FAILED, coachA: VALIDATION_FAILED, coachB: VALIDATION_FAILED, clientX: VALIDATION_FAILED, clientY: VALIDATION_FAILED };
  }
  if (label === 'random id') {
    return { anon: UNAUTHENTICATED, noProfile: PROFILE_REQUIRED, coachA: NOT_FOUND, coachB: NOT_FOUND, clientX: NOT_FOUND, clientY: NOT_FOUND };
  }
  const coachA: Expect = (state) => {
    if (state === 'none') return NOT_FOUND;
    if (action === 'pause') return state === 'active' || state === 'consentRevoked' ? OK : INVALID_TRANSITION;
    if (action === 'resume') return state === 'paused' ? OK : INVALID_TRANSITION;
    return state === 'ended' ? INVALID_TRANSITION : OK;
  };
  const clientX: Expect = (state) => {
    if (state === 'none') return NOT_FOUND;
    if (action !== 'end') return INVALID_TRANSITION;
    return state === 'ended' ? INVALID_TRANSITION : OK;
  };
  return { ...gate, coachA, clientX };
}

// ---- Helpers for verify functions -----------------------------------------------------------------

function verifyOwnId(res: request.Response, { w, caller }: Ctx): void {
  expect(res.body).toMatchObject({ id: callerId(w, caller) });
}

function verifyOwnConsents(res: request.Response, { w, caller }: Ctx): void {
  const items = Array.isArray(res.body) ? res.body : [res.body];
  for (const consent of items) expect(consent.userId).toBe(callerId(w, caller));
}

function verifyFreshLink(res: request.Response, { w, caller }: Ctx): void {
  expect(res.body).toMatchObject({ coachId: w.coachB.id, clientId: callerId(w, caller), status: 'active' });
}

// Export holds only the caller's rows: no other user's ids, names, invite ids or secrets. A linked counterparty
// id is allowed only inside the caller's own link rows.
function verifyExport(res: request.Response, { w, caller }: Ctx): void {
  const id = callerId(w, caller);
  const body = res.body;
  const serialized = JSON.stringify(body);
  const counterparties = (body.links as { coachId: string | null; clientId: string | null }[]).flatMap((link) =>
    [link.coachId, link.clientId].filter((party): party is string => party !== null && party !== id),
  );

  expect(body.user.id).toBe(id);
  expect(body.consents.every((consent: { userId: string }) => consent.userId === id)).toBe(true);
  expect(body.invites.every((invite: { coachId: string }) => invite.coachId === id)).toBe(true);
  expect(body.links.every((link: { coachId: string | null; clientId: string | null }) => link.coachId === id || link.clientId === id)).toBe(true);
  expect(serialized).not.toMatch(/authSubject|codeHash/);

  for (const name of PROFILE_NAMES) {
    if (w[name].id === id) continue;
    expect(serialized).not.toContain(DISPLAY_NAMES[name]);
    if (!counterparties.includes(w[name].id)) expect(serialized).not.toContain(w[name].id);
  }
  if (caller !== 'coachA') expect(serialized).not.toContain(w.inviteA.id);
  if (caller !== 'coachB') expect(serialized).not.toContain(w.inviteB.id);
}

function redeemReq(code: string): Req {
  return { method: 'post', path: '/v1/invites/redeem', body: { code, consents: ALL_REQUIRED_CONSENTS } };
}

const subjectOf = (auth: string): string => {
  const payload = (auth.replace('Bearer ', '').split('.')[1] ?? '');
  return (JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { sub: string }).sub;
};

// ---- Suites ---------------------------------------------------------------------------------------

// ---- Stage 2: plan and calendar rows --------------------------------------------------------------

const TIMEZONE = 'Europe/Berlin';
const todayIn = (): string => todayInTimeZone(TIMEZONE, new Date());
const dayOffset = (days: number): string => addDays(todayIn(), days);
const dateRangeOf = (): string => `from=${dayOffset(-7)}&to=${dayOffset(7)}`;
const planPath = (client: { id: string }): string => `/v1/coach/clients/${client.id}/plan`;
const calendarPath = (client: { id: string }): string => `/v1/coach/clients/${client.id}/calendar`;
const OPEN_STATES: readonly LinkState[] = ['active', 'paused'];
const onOpenLink = (outcome: Outcome): Expect => (state) => (OPEN_STATES.includes(state) ? outcome : NOT_FOUND);

// Coach routes: the own client answers by link state. A client without a link answers 404 to every coach
// (pass NOT_FOUND as the outcome), and a client calling a coach route is refused by role first.
const coachWant = (open: Outcome): Record<CallerName, Expect> => ({
  ...GATES,
  coachA: onOpenLink(open),
  coachB: NOT_FOUND,
  clientX: FORBIDDEN_ROLE,
  clientY: FORBIDDEN_ROLE,
});

// The client keeps the past of an ended link; a withdrawn coach_access does not hide the client's own entries.
function clientXEntryIds(w: World, state: LinkState): string[] {
  if (state === 'none') return [];
  if (state === 'ended') return [w.entryPastX];
  return [w.entryPastX, w.entryFutureX].sort();
}

function verifyPlanOfX(version: number) {
  return (res: request.Response, { w }: Ctx): void => {
    expect(res.body).toMatchObject({ linkId: w.linkX, clientId: w.clientX.id, version });
  };
}

function verifyCalendarOfX(res: request.Response, { w }: Ctx): void {
  expect(res.body.items.map((item: { id: string }) => item.id).sort()).toEqual([w.entryPastX, w.entryFutureX].sort());
}

function ownStage2Rows(): Row[] {
  const plan = (w: World) => planPath(w.clientX);
  const calendar = (w: World) => calendarPath(w.clientX);
  return [
    ...rowsOf('read plan', (w) => ({ method: 'get', path: plan(w) }), coachWant(OK), verifyPlanOfX(2)),
    ...rowsOf(
      'save plan',
      (w) => ({ method: 'put', path: plan(w), body: { baseVersion: 2, content: planWith(w.workoutX, 'Renamed') } }),
      coachWant(OK),
      verifyPlanOfX(3),
    ),
    ...rowsOf(
      'save plan with stale base version',
      (w) => ({ method: 'put', path: plan(w), body: { baseVersion: 1, content: planWith(w.workoutX, 'Stale') } }),
      coachWant(VERSION_CONFLICT),
    ),
    ...rowsOf(
      'save plan dropping a scheduled workout',
      (w) => ({ method: 'put', path: plan(w), body: { baseVersion: 2, content: planWith(randomUUID(), 'Dropped') } }),
      coachWant(WORKOUT_SCHEDULED),
    ),
    ...rowsOf(
      'list plan versions',
      (w) => ({ method: 'get', path: `${plan(w)}/versions` }),
      coachWant(OK),
      (res) => {
        expect(res.body.items.map((item: { version: number }) => item.version)).toEqual([2, 1]);
        expect(res.body.nextCursor).toBeNull();
      },
    ),
    ...rowsOf(
      'read version 1',
      (w) => ({ method: 'get', path: `${plan(w)}/versions/1` }),
      coachWant(OK),
      (res, { w }) => expect(res.body).toMatchObject({ version: 1, clientId: w.clientX.id }),
    ),
    ...rowsOf('read unknown version', (w) => ({ method: 'get', path: `${plan(w)}/versions/3` }), coachWant(NOT_FOUND)),
    ...rowsOf(
      'list calendar',
      (w) => ({ method: 'get', path: `${calendar(w)}?${dateRangeOf()}` }),
      coachWant(OK),
      verifyCalendarOfX,
    ),
    ...rowsOf(
      'create entry',
      (w) => ({ method: 'post', path: calendar(w), body: { id: randomUUID(), date: dayOffset(6), workoutKey: w.workoutX } }),
      coachWant(CREATED),
      (res, { w }) => expect(res.body).toMatchObject({ linkId: w.linkX, clientId: w.clientX.id, coachId: w.coachA.id, workoutKey: w.workoutX }),
    ),
    ...rowsOf(
      'create entry with a workout not in the plan',
      (w) => ({ method: 'post', path: calendar(w), body: { id: randomUUID(), date: dayOffset(6), workoutKey: randomUUID() } }),
      coachWant(WORKOUT_NOT_IN_PLAN),
    ),
    ...rowsOf(
      'create entry outside the date window',
      (w) => ({ method: 'post', path: calendar(w), body: { id: randomUUID(), date: dayOffset(400), workoutKey: w.workoutX } }),
      coachWant(VALIDATION_FAILED),
    ),
    ...rowsOf(
      'create entry with an id already used for another date',
      (w) => ({ method: 'post', path: calendar(w), body: { id: w.entryFutureX, date: dayOffset(6), workoutKey: w.workoutX } }),
      coachWant(ENTRY_ID_CONFLICT),
    ),
    ...rowsOf(
      'move own entry',
      (w) => ({ method: 'patch', path: `${calendar(w)}/${w.entryFutureX}`, body: { date: dayOffset(5) } }),
      coachWant(OK),
      (res) => expect(res.body).toMatchObject({ date: dayOffset(5) }),
    ),
    ...rowsOf(
      'move entry of another client',
      (w) => ({ method: 'patch', path: `${calendar(w)}/${w.entryZ}`, body: { date: dayOffset(5) } }),
      coachWant(NOT_FOUND),
    ),
    ...rowsOf(
      'move random entry',
      (w) => ({ method: 'patch', path: `${calendar(w)}/${randomUUID()}`, body: { date: dayOffset(5) } }),
      coachWant(NOT_FOUND),
    ),
    ...rowsOf('delete own entry', (w) => ({ method: 'delete', path: `${calendar(w)}/${w.entryFutureX}` }), coachWant(NO_CONTENT)),
    ...rowsOf(
      'delete entry of another client',
      (w) => ({ method: 'delete', path: `${calendar(w)}/${w.entryZ}` }),
      coachWant(NOT_FOUND),
    ),
    ...rowsOf('delete random entry', (w) => ({ method: 'delete', path: `${calendar(w)}/${randomUUID()}` }), coachWant(NOT_FOUND)),
  ];
}

// Another client's id (no link to this coach) under a coach route: every coach gets 404, and X's entry ids do not resolve.
function unlinkedStage2Rows(): Row[] {
  const plan = (w: World) => planPath(w.clientY);
  const calendar = (w: World) => calendarPath(w.clientY);
  const want = coachWant(NOT_FOUND);
  return [
    ...rowsOf('read plan of unlinked client', (w) => ({ method: 'get', path: plan(w) }), want),
    ...rowsOf('list calendar of unlinked client', (w) => ({ method: 'get', path: `${calendar(w)}?${dateRangeOf()}` }), want),
    ...rowsOf(
      'move entry of linked client through unlinked client',
      (w) => ({ method: 'patch', path: `${calendar(w)}/${w.entryFutureX}`, body: { date: dayOffset(5) } }),
      want,
    ),
    ...rowsOf('delete entry of linked client through unlinked client', (w) => ({ method: 'delete', path: `${calendar(w)}/${w.entryFutureX}` }), want),
  ];
}

// Client routes return only the caller's own plans and entries, across all the caller's links.
function clientStage2Rows(): Row[] {
  const want = { ...GATES, coachA: FORBIDDEN_ROLE, coachB: FORBIDDEN_ROLE, clientX: OK, clientY: OK };
  return [
    ...rowsOf('list own calendar', () => ({ method: 'get', path: `/v1/client/calendar?${dateRangeOf()}` }), want, verifyClientCalendar),
    ...rowsOf('list own plans', () => ({ method: 'get', path: '/v1/client/plans' }), want, verifyClientPlans),
  ];
}

function verifyClientCalendar(res: request.Response, { w, state, caller }: Ctx): void {
  const expected = caller === 'clientX' ? clientXEntryIds(w, state) : [];
  expect(res.body.items.map((item: { id: string }) => item.id).sort()).toEqual(expected);
  for (const item of res.body.items) expect(item.clientId).toBe(callerId(w, caller));
}

function verifyClientPlans(res: request.Response, { w, state, caller }: Ctx): void {
  const hasOpenPlan = caller === 'clientX' && state !== 'none' && state !== 'ended';
  expect(res.body.items.map((plan: { linkId: string }) => plan.linkId)).toEqual(hasOpenPlan ? [w.linkX] : []);
  for (const plan of res.body.items) expect(plan).toMatchObject({ clientId: callerId(w, caller), version: 2 });
}

describe('IDOR and authorization matrix', () => {
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

  describe('endpoints independent of link state', () => {
    let w: World;

    beforeEach(async () => {
      w = await buildWorld(app, 'active');
    }, 30_000);

    it.each([...identityRows, ...inviteRows, ...clientLinkRows, ...authRows])('$caller: $label', async (row) => {
      const res = await call(app, callerOf(w, row.caller), row.req(w));
      expectOutcome(res, resolve(row.want, 'active'));
      if (res.status < 300) row.verify?.(res, { w, state: 'active', caller: row.caller });
    });
  });

  describe.each(STATES)('link coachA <-> clientX in state %s', (state) => {
    let w: World;

    beforeEach(async () => {
      w = await buildWorld(app, state);
    }, 30_000);

    const rows: Row[] = [
      ...coachListRows,
      ...coachDetailRows('own linked client X', (world) => world.clientX.id, {
        ...GATES,
        coachA: (s) => (s === 'active' || s === 'paused' ? OK : NOT_FOUND),
        coachB: NOT_FOUND,
        clientX: FORBIDDEN_ROLE,
        clientY: FORBIDDEN_ROLE,
      }),
      ...coachDetailRows('other linked client Z', (world) => world.clientZ.id, {
        ...GATES,
        coachA: OK,
        coachB: NOT_FOUND,
        clientX: FORBIDDEN_ROLE,
        clientY: FORBIDDEN_ROLE,
      }),
      ...coachDetailRows('unlinked client Y', (world) => world.clientY.id, {
        ...GATES,
        coachA: NOT_FOUND,
        coachB: NOT_FOUND,
        clientX: FORBIDDEN_ROLE,
        clientY: FORBIDDEN_ROLE,
      }),
      ...coachDetailRows('random id', () => randomUUID(), {
        ...GATES,
        coachA: NOT_FOUND,
        coachB: NOT_FOUND,
        clientX: FORBIDDEN_ROLE,
        clientY: FORBIDDEN_ROLE,
      }),
      ...coachDetailRows('own coach id', (world) => world.coachA.id, {
        ...GATES,
        coachA: NOT_FOUND,
        coachB: NOT_FOUND,
        clientX: FORBIDDEN_ROLE,
        clientY: FORBIDDEN_ROLE,
      }),
      ...coachDetailRows('malformed id', () => 'not-a-uuid', {
        anon: UNAUTHENTICATED,
        noProfile: VALIDATION_FAILED,
        coachA: VALIDATION_FAILED,
        coachB: VALIDATION_FAILED,
        clientX: VALIDATION_FAILED,
        clientY: VALIDATION_FAILED,
      }),
      ...(['pause', 'resume', 'end'] as const).flatMap((action) => [
        ...linkActionRows(action, (world) => world.linkX, 'own link'),
        ...linkActionRows(action, () => randomUUID(), 'random id'),
        ...linkActionRows(action, () => 'not-a-uuid', 'malformed id'),
      ]),
      ...ownStage2Rows(),
      ...unlinkedStage2Rows(),
      ...clientStage2Rows(),
    ];

    it.each(rows)('$caller: $label', async (row) => {
      const res = await call(app, callerOf(w, row.caller), row.req(w));
      expectOutcome(res, resolve(row.want, state));
      if (res.status < 300) row.verify?.(res, { w, state, caller: row.caller });
    });

    it('answers a foreign or unknown id with the same body as the other 404', async () => {
      const unknown = await call(app, w.coachB, coachDetailReq(randomUUID()));
      const foreign = await call(app, w.coachB, coachDetailReq(w.clientX.id));
      const unlinked = await call(app, w.coachA, coachDetailReq(w.clientY.id));
      const unknownForA = await call(app, w.coachA, coachDetailReq(randomUUID()));

      expect(withoutRequestId(foreign.body)).toEqual(withoutRequestId(unknown.body));
      expect(withoutRequestId(unlinked.body)).toEqual(withoutRequestId(unknownForA.body));
    });

    it('answers a foreign link action with the same body as an unknown link', async () => {
      const foreign = await call(app, w.clientY, linkReq('pause', w.linkX));
      const unknown = await call(app, w.clientY, linkReq('pause', randomUUID()));
      const foreignCoach = await call(app, w.coachB, linkReq('end', w.linkX));
      const unknownCoach = await call(app, w.coachB, linkReq('end', randomUUID()));

      expect(foreign.status).toBe(404);
      expect(withoutRequestId(foreign.body)).toEqual(withoutRequestId(unknown.body));
      expect(withoutRequestId(foreignCoach.body)).toEqual(withoutRequestId(unknownCoach.body));
    });

    it('re-invites clientX only after the old link has ended, and then creates a new link', async () => {
      const invite = await createInvite(app, w.coachA);
      const res = await redeem(app, w.clientX, invite.code);

      if (state === 'ended' || state === 'none') {
        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({ coachId: w.coachA.id, status: 'active' });
        expect(res.body.id).not.toBe(w.linkX);
      } else {
        expectOutcome(res, LINK_EXISTS);
      }
    });
  });

  describe('token verification', () => {
    let w: World;

    beforeEach(async () => {
      w = await buildWorld(app, 'active');
    }, 30_000);

    it('accepts the valid token of coachA (control for the forgeries below)', async () => {
      await request(app.getHttpServer()).get('/v1/me').set('Authorization', w.coachA.auth).expect(200);
    });

    it.each(forgeries())('rejects a token that is %s with 401 on every protected route', async (_label, forge) => {
      const auth = `Bearer ${await forge(subjectOf(w.coachA.auth))}`;

      for (const req of [
        { method: 'get', path: '/v1/me' },
        { method: 'get', path: `/v1/coach/clients/${w.clientX.id}` },
        { method: 'get', path: '/v1/coach/clients' },
      ] as const) {
        const res = await call(app, { auth }, req);
        expectOutcome(res, UNAUTHENTICATED);
      }
    });
  });

  describe('isolation between coaches and clients', () => {
    let w: World;

    beforeEach(async () => {
      w = await buildWorld(app, 'active');
    }, 30_000);

    it('pages a coach list with a cursor that another coach cannot use to read the first coach clients', async () => {
      const first = await call(app, w.coachA, { method: 'get', path: '/v1/coach/clients?limit=1' }).expect(200);
      const cursor = encodeURIComponent(first.body.nextCursor as string);

      const foreign = await call(app, w.coachB, { method: 'get', path: `/v1/coach/clients?limit=1&cursor=${cursor}` }).expect(200);
      expect(foreign.body).toEqual({ items: [], nextCursor: null });

      const own = await call(app, w.coachA, { method: 'get', path: `/v1/coach/clients?limit=1&cursor=${cursor}` }).expect(200);
      expect(own.body.items).toHaveLength(1);
      expect([...first.body.items, ...own.body.items].map((item: { clientId: string }) => item.clientId).sort()).toEqual(
        [w.clientX.id, w.clientZ.id].sort(),
      );
    });

    it('pages past a client who withdrew coach_access without listing or skipping anyone else', async () => {
      await call(app, w.clientX, {
        method: 'post',
        path: '/v1/me/consents',
        body: { type: 'coach_access', version: CONSENT_VERSIONS.coach_access, granted: false },
      }).expect(201);
      const withdrawn = await call(app, w.coachA, { method: 'get', path: '/v1/coach/clients?limit=1' }).expect(200);
      expect(withdrawn.body.items.map((item: { clientId: string }) => item.clientId)).toEqual([w.clientZ.id]);
      expect(withdrawn.body.nextCursor).toBeNull();

      await call(app, w.clientZ, {
        method: 'post',
        path: '/v1/me/consents',
        body: { type: 'coach_access', version: CONSENT_VERSIONS.coach_access, granted: false },
      }).expect(201);
      const empty = await call(app, w.coachA, { method: 'get', path: '/v1/coach/clients?limit=1' }).expect(200);
      expect(empty.body).toEqual({ items: [], nextCursor: null });
    });

    it('never lists the clients of another coach to coachB', async () => {
      const res = await call(app, w.coachB, { method: 'get', path: '/v1/coach/clients' }).expect(200);
      expect(res.body.items).toEqual([]);
    });

    it('does not let a redeemed-by-others code create a link for a stranger', async () => {
      await call(app, w.clientY, redeemReq(w.usedCode)).expect(400);

      const links = await call(app, w.clientY, { method: 'get', path: '/v1/client/links' }).expect(200);
      expect(links.body.items).toEqual([]);
    });

    it('does not revoke a foreign invite and lets its code still be redeemed', async () => {
      await call(app, w.coachB, { method: 'delete', path: `/v1/invites/${w.inviteA.id}` }).expect(404);

      await call(app, w.clientY, redeemReq(w.inviteA.code)).expect(201);
    });

    it('revokes an own invite so that its code can no longer be redeemed', async () => {
      await call(app, w.coachA, { method: 'delete', path: `/v1/invites/${w.inviteA.id}` }).expect(204);

      const res = await call(app, w.clientY, redeemReq(w.inviteA.code)).expect(400);
      expect(res.body).toMatchObject({ code: 'INVITE_INVALID' });
    });

    it('answers the same to a used, revoked and unknown code', async () => {
      const used = await call(app, w.clientY, redeemReq(w.usedCode));
      const revoked = await call(app, w.clientY, redeemReq(w.revokedCode));
      const unknown = await call(app, w.clientY, redeemReq(UNKNOWN_CODE));

      expect(withoutRequestId(used.body)).toEqual(withoutRequestId(unknown.body));
      expect(withoutRequestId(revoked.body)).toEqual(withoutRequestId(unknown.body));
    });

    it('rejects a redeem without coach_access and keeps the code usable for a correct retry', async () => {
      const withoutCoachAccess = ALL_REQUIRED_CONSENTS.filter((consent) => consent.type !== 'coach_access');
      await call(app, w.clientY, {
        method: 'post',
        path: '/v1/invites/redeem',
        body: { code: w.inviteB.code, consents: withoutCoachAccess },
      }).expect(400);

      await call(app, w.clientY, redeemReq(w.inviteB.code)).expect(201);
    });

    it('rate limits redeem attempts per user', async () => {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        await call(app, w.clientY, redeemReq(UNKNOWN_CODE)).expect(400);
      }

      expectOutcome(await call(app, w.clientY, redeemReq(UNKNOWN_CODE)), RATE_LIMITED);
    });

    it('deleting clientY does not change coachA access to clientX or clientZ', async () => {
      await call(app, w.clientY, redeemReq(w.inviteB.code)).expect(201);
      await call(app, w.clientY, { method: 'delete', path: '/v1/me' }).expect(204);

      await call(app, w.coachA, { method: 'get', path: `/v1/coach/clients/${w.clientX.id}` }).expect(200);
      await call(app, w.coachA, { method: 'get', path: `/v1/coach/clients/${w.clientZ.id}` }).expect(200);
      const list = await call(app, w.coachA, { method: 'get', path: '/v1/coach/clients' }).expect(200);
      expect(list.body.items.map((item: { clientId: string }) => item.clientId).sort()).toEqual(
        [w.clientX.id, w.clientZ.id].sort(),
      );
      await call(app, w.clientX, { method: 'get', path: '/v1/me' }).expect(200);
    });

    it('deleting clientX ends its link for coachA and makes its token profile-less', async () => {
      await call(app, w.clientX, { method: 'delete', path: '/v1/me' }).expect(204);

      await call(app, w.coachA, { method: 'get', path: `/v1/coach/clients/${w.clientX.id}` }).expect(404);
      const res = await call(app, w.clientX, { method: 'get', path: '/v1/me' }).expect(403);
      expect(res.body).toMatchObject({ code: 'PROFILE_REQUIRED' });
      const otherCoachLinks = await call(app, w.coachA, { method: 'get', path: '/v1/coach/clients' }).expect(200);
      expect(otherCoachLinks.body.items.map((item: { clientId: string }) => item.clientId)).toEqual([w.clientZ.id]);
    });

    it('exports of two different clients never contain the other client data', async () => {
      const x = await call(app, w.clientX, { method: 'get', path: '/v1/me/export' }).expect(200);
      const y = await call(app, w.clientY, { method: 'get', path: '/v1/me/export' }).expect(200);

      expect(JSON.stringify(x.body)).not.toContain(w.clientY.id);
      expect(JSON.stringify(y.body)).not.toContain(w.clientX.id);
      expect(JSON.stringify(y.body)).not.toContain(w.linkX);
    });
  });

  describe('calendar entries across clients of one coach', () => {
    let w: World;

    beforeEach(async () => {
      w = await buildWorld(app, 'active');
    }, 30_000);

    it('refuses an entry of client Y addressed through client X, and the reverse, and leaves both entries intact', async () => {
      await linkBetween(app, w.coachA, w.clientY);
      const workoutY = randomUUID();
      const entryY = randomUUID();
      const yPath = (id: string) => `/v1/coach/clients/${w.clientY.id}/calendar/${id}`;
      const xPath = (id: string) => `/v1/coach/clients/${w.clientX.id}/calendar/${id}`;
      await call(app, w.coachA, { method: 'put', path: planPath(w.clientY), body: { baseVersion: 0, content: planWith(workoutY, 'Foreign') } }).expect(200);
      await call(app, w.coachA, { method: 'post', path: calendarPath(w.clientY), body: { id: entryY, date: dayOffset(4), workoutKey: workoutY } }).expect(201);

      const moveY = await call(app, w.coachA, { method: 'patch', path: xPath(entryY), body: { date: dayOffset(5) } });
      const deleteY = await call(app, w.coachA, { method: 'delete', path: xPath(entryY) });
      const createOnY = await call(app, w.coachA, {
        method: 'post',
        path: calendarPath(w.clientX),
        body: { id: entryY, date: dayOffset(5), workoutKey: w.workoutX },
      });
      const unknown = await call(app, w.coachA, { method: 'delete', path: xPath(randomUUID()) });
      for (const res of [moveY, deleteY, createOnY]) expectOutcome(res, NOT_FOUND);
      expect(withoutRequestId(deleteY.body)).toEqual(withoutRequestId(unknown.body));

      const moveX = await call(app, w.coachA, { method: 'patch', path: yPath(w.entryFutureX), body: { date: dayOffset(5) } });
      const deleteX = await call(app, w.coachA, { method: 'delete', path: yPath(w.entryFutureX) });
      expectOutcome(moveX, NOT_FOUND);
      expectOutcome(deleteX, NOT_FOUND);

      const ofY = await call(app, w.coachA, { method: 'get', path: `${calendarPath(w.clientY)}?from=${dayOffset(4)}&to=${dayOffset(4)}` }).expect(200);
      expect(ofY.body.items).toEqual([expect.objectContaining({ id: entryY, date: dayOffset(4), workoutKey: workoutY })]);
      const ofX = await call(app, w.coachA, { method: 'get', path: `${calendarPath(w.clientX)}?${dateRangeOf()}` }).expect(200);
      expect(ofX.body.items.map((item: { id: string }) => item.id).sort()).toEqual([w.entryPastX, w.entryFutureX].sort());
    });

    it('shows each client only its own entries and plans', async () => {
      const x = await call(app, w.clientX, { method: 'get', path: `/v1/client/calendar?${dateRangeOf()}` }).expect(200);
      const z = await call(app, w.clientZ, { method: 'get', path: `/v1/client/calendar?${dateRangeOf()}` }).expect(200);
      expect(x.body.items.map((item: { id: string }) => item.id).sort()).toEqual([w.entryPastX, w.entryFutureX].sort());
      expect(z.body.items.map((item: { id: string }) => item.id)).toEqual([w.entryZ]);

      const xPlans = await call(app, w.clientX, { method: 'get', path: '/v1/client/plans' }).expect(200);
      const zPlans = await call(app, w.clientZ, { method: 'get', path: '/v1/client/plans' }).expect(200);
      expect(xPlans.body.items.map((plan: { linkId: string }) => plan.linkId)).toEqual([w.linkX]);
      expect(zPlans.body.items.map((plan: { linkId: string }) => plan.linkId)).toEqual([w.linkZ]);
    });
  });

  describe('endpoint coverage', () => {
    it('matrix covers every route the API registers', () => {
      expect(registeredRoutes(app)).toEqual(EXPECTED_ROUTES);
    });
  });
});

describe('invite expiry', () => {
  it('answers an expired invite exactly like an unknown code', async () => {
    let now = new Date('2026-11-01T10:00:00.000Z');
    const app = await createTestApp({ clock: { now: () => now } });
    try {
      await resetDatabase(app);
      const coach = await signIn(app, 'coach', DISPLAY_NAMES.coachA);
      const client = await signIn(app, 'client', DISPLAY_NAMES.clientY);
      const invite = await createInvite(app, coach);

      now = new Date(now.getTime() + 169 * 60 * 60 * 1000);

      const expired = await redeem(app, client, invite.code).expect(400);
      const unknown = await redeem(app, client, UNKNOWN_CODE).expect(400);
      expect(expired.body).toMatchObject({ code: 'INVITE_INVALID' });
      expect(withoutRequestId(expired.body)).toEqual(withoutRequestId(unknown.body));
    } finally {
      await app.close();
    }
  });
});

// ---- Local helpers used by the suites (kept below the suites for reading order) -------------------

function coachDetailReq(clientId: string): Req {
  return { method: 'get', path: `/v1/coach/clients/${clientId}` };
}

function linkReq(action: 'pause' | 'resume' | 'end', linkId: string): Req {
  return { method: 'post', path: `/v1/links/${linkId}/${action}` };
}

function verifyCoachList(res: request.Response, { w, state, caller }: Ctx): void {
  if (caller === 'coachB') {
    expect(res.body.items).toEqual([]);
    return;
  }
  const expected = [w.clientZ.id, ...(state === 'active' || state === 'paused' ? [w.clientX.id] : [])].sort();
  expect(res.body.items.map((item: { clientId: string }) => item.clientId).sort()).toEqual(expected);
}

function forgeries(): [string, (subject: string) => Promise<string>][] {
  return [
  ['signed with a wrong issuer', (subject) => signRs256({ iss: 'attacker-issuer', sub: subject })],
  ['signed for another audience', (subject) => signRs256({ aud: 'some-other-api', sub: subject })],
  ['expired', (subject) => signRs256({ sub: subject, exp: Math.floor(Date.now() / 1000) - 60 })],
  ['missing the subject claim', () => signRs256({ sub: undefined })],
  ['unsigned (alg none)', (subject) => Promise.resolve(unsignedToken({ sub: subject }))],
  ['signed by another key with the trusted kid', (subject) => signWithOtherKey(subject)],
  ['HS256 keyed with the public key', (subject) => signHs256(subject)],
  ];
}

async function signRs256(overrides: JWTPayload): Promise<string> {
  const { kid } = await localPublicJwk(PRIVATE_KEY_PEM);
  const payload: JWTPayload = { iss: ISSUER, aud: AUDIENCE, sub: 'unused', exp: Math.floor(Date.now() / 1000) + 300, ...overrides };
  return new SignJWT(payload).setProtectedHeader({ alg: 'RS256', kid }).sign(await importPKCS8(PRIVATE_KEY_PEM, 'RS256'));
}

async function signWithOtherKey(subject: string): Promise<string> {
  const { kid } = await localPublicJwk(PRIVATE_KEY_PEM);
  const { privateKey } = await generateKeyPair('RS256');
  return new SignJWT({ iss: ISSUER, aud: AUDIENCE, sub: subject })
    .setProtectedHeader({ alg: 'RS256', kid })
    .setExpirationTime('5m')
    .sign(privateKey);
}

async function signHs256(subject: string): Promise<string> {
  const { kid } = await localPublicJwk(PRIVATE_KEY_PEM);
  const publicPem = createPublicKey(PRIVATE_KEY_PEM).export({ type: 'spki', format: 'pem' }).toString();
  return new SignJWT({ iss: ISSUER, aud: AUDIENCE, sub: subject })
    .setProtectedHeader({ alg: 'HS256', kid })
    .setExpirationTime('5m')
    .sign(new TextEncoder().encode(publicPem));
}

function unsignedToken(payload: JWTPayload): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const claims = { iss: ISSUER, aud: AUDIENCE, exp: Math.floor(Date.now() / 1000) + 300, ...payload };
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(claims)}.`;
}

type ExpressLayer = { route?: { path: string; methods: Record<string, boolean> } };
type ExpressRouter = { stack: ExpressLayer[] };

function registeredRoutes(app: INestApplication): string[] {
  const instance = app.getHttpAdapter().getInstance() as { router?: ExpressRouter; _router?: ExpressRouter };
  const stack = (instance.router ?? instance._router)?.stack ?? [];
  return stack
    .flatMap((layer) =>
      layer.route === undefined
        ? []
        : Object.keys(layer.route.methods).map((method) => `${method.toUpperCase()} ${layer.route?.path ?? ''}`),
    )
    .filter((route) => route.includes(' /v1/'))
    .sort();
}
