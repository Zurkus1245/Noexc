import { z } from 'zod';
import {
  AccountExportSchema,
  CalendarEntriesResponseSchema,
  CalendarEntrySchema,
  CalendarRangeQuerySchema,
  ClientPlansResponseSchema,
  ClientLinksPageSchema,
  CoachClientDetailSchema,
  CoachClientPageSchema,
  CoachClientSchema,
  ConsentSchema,
  CreateCalendarEntryRequestSchema,
  CreateInviteResponseSchema,
  CreateProfileRequestSchema,
  GrantConsentRequestSchema,
  LocalTokenRequestSchema,
  LocalTokenResponseSchema,
  MoveCalendarEntryRequestSchema,
  PageQuerySchema,
  PlanSchema,
  PlanVersionSummarySchema,
  PlanVersionsPageSchema,
  PutPlanRequestSchema,
  RedeemInviteRequestSchema,
  UpdateProfileRequestSchema,
  UserSchema,
  UuidSchema,
} from '@noexcuse/contracts';
import {
  API_PATHS,
  coachCalendarEntryPath,
  coachCalendarPath,
  coachClientPath,
  coachPlanPath,
  coachPlanVersionPath,
  coachPlanVersionsPath,
  invitePath,
  linkActionPath,
  type LinkAction,
} from './paths';
import { createTransport, type FetchLike } from './transport';
import { parseRequest, parseResponse } from './validation';

export interface MutationOptions {
  // Client-generated UUID; reuse it when retrying the same mutation (server keeps it 24h).
  readonly idempotencyKey?: string;
}

export interface ApiClientOptions {
  readonly baseUrl: string;
  // Returns null when signed out; the request is then sent without credentials and the server answers 401.
  readonly getAccessToken: () => Promise<string | null>;
  // Refreshes the session before the single retry of a 401, given the token that was rejected. The caller decides
  // whether that token is still current. Its own failures propagate to the caller.
  readonly onRefresh: (rejectedToken: string | null) => Promise<void>;
  readonly fetch: FetchLike;
  // Per attempt; a stalled request fails with NETWORK_ERROR after this long.
  readonly requestTimeoutMs?: number;
}

const ANONYMOUS = false;
const AUTHENTICATED = true;

export const createApiClient = (options: ApiClientOptions) => {
  const { send } = createTransport(options);

  const idempotencyKeyOf = (opts?: MutationOptions): string | undefined =>
    opts?.idempotencyKey === undefined ? undefined : parseRequest(UuidSchema, opts.idempotencyKey);
  const idOf = (id: string): string => parseRequest(UuidSchema, id);
  const versionOf = (version: number): number => parseRequest(PlanVersionSummarySchema.shape.version, version);

  const pageParams = (query: z.input<typeof PageQuerySchema>): URLSearchParams => {
    const page = parseRequest(PageQuerySchema, query);
    const params = new URLSearchParams({ limit: String(page.limit) });
    if (page.cursor !== undefined) params.set('cursor', page.cursor);
    return params;
  };

  const rangeParams = (range: z.input<typeof CalendarRangeQuerySchema>): URLSearchParams => {
    const parsed = parseRequest(CalendarRangeQuerySchema, range);
    return new URLSearchParams({ from: parsed.from, to: parsed.to });
  };

  const linkAction = async (linkId: string, action: LinkAction, opts?: MutationOptions) =>
    parseResponse(
      CoachClientSchema,
      await send({
        method: 'POST',
        path: linkActionPath(idOf(linkId), action),
        auth: AUTHENTICATED,
        idempotencyKey: idempotencyKeyOf(opts),
      }),
    );

  return {
    localAuth: {
      token: async (body: z.input<typeof LocalTokenRequestSchema>, opts?: MutationOptions) =>
        parseResponse(
          LocalTokenResponseSchema,
          await send({
            method: 'POST',
            path: API_PATHS.localAuthToken,
            auth: ANONYMOUS,
            body: parseRequest(LocalTokenRequestSchema, body),
            idempotencyKey: idempotencyKeyOf(opts),
          }),
        ),
    },

    me: {
      get: async () =>
        parseResponse(UserSchema, await send({ method: 'GET', path: API_PATHS.me, auth: AUTHENTICATED })),
      create: async (body: z.input<typeof CreateProfileRequestSchema>, opts?: MutationOptions) =>
        parseResponse(
          UserSchema,
          await send({
            method: 'POST',
            path: API_PATHS.me,
            auth: AUTHENTICATED,
            body: parseRequest(CreateProfileRequestSchema, body),
            idempotencyKey: idempotencyKeyOf(opts),
          }),
        ),
      update: async (body: z.input<typeof UpdateProfileRequestSchema>) =>
        parseResponse(
          UserSchema,
          await send({
            method: 'PATCH',
            path: API_PATHS.me,
            auth: AUTHENTICATED,
            body: parseRequest(UpdateProfileRequestSchema, body),
          }),
        ),
      delete: async (): Promise<void> => {
        await send({ method: 'DELETE', path: API_PATHS.me, auth: AUTHENTICATED });
      },
      export: async () =>
        parseResponse(
          AccountExportSchema,
          await send({ method: 'GET', path: API_PATHS.meExport, auth: AUTHENTICATED }),
        ),
    },

    consents: {
      list: async () =>
        parseResponse(
          z.array(ConsentSchema),
          await send({ method: 'GET', path: API_PATHS.meConsents, auth: AUTHENTICATED }),
        ),
      grant: async (body: z.input<typeof GrantConsentRequestSchema>, opts?: MutationOptions) =>
        parseResponse(
          ConsentSchema,
          await send({
            method: 'POST',
            path: API_PATHS.meConsents,
            auth: AUTHENTICATED,
            body: parseRequest(GrantConsentRequestSchema, body),
            idempotencyKey: idempotencyKeyOf(opts),
          }),
        ),
    },

    invites: {
      create: async (opts?: MutationOptions) =>
        parseResponse(
          CreateInviteResponseSchema,
          await send({
            method: 'POST',
            path: API_PATHS.invites,
            auth: AUTHENTICATED,
            idempotencyKey: idempotencyKeyOf(opts),
          }),
        ),
      revoke: async (inviteId: string): Promise<void> => {
        await send({ method: 'DELETE', path: invitePath(idOf(inviteId)), auth: AUTHENTICATED });
      },
      redeem: async (body: z.input<typeof RedeemInviteRequestSchema>, opts?: MutationOptions) =>
        parseResponse(
          CoachClientSchema,
          await send({
            method: 'POST',
            path: API_PATHS.invitesRedeem,
            auth: AUTHENTICATED,
            body: parseRequest(RedeemInviteRequestSchema, body),
            idempotencyKey: idempotencyKeyOf(opts),
          }),
        ),
    },

    coach: {
      listClients: async (query: z.input<typeof PageQuerySchema> = {}) =>
        parseResponse(
          CoachClientPageSchema,
          await send({
            method: 'GET',
            path: API_PATHS.coachClients,
            auth: AUTHENTICATED,
            query: pageParams(query),
          }),
        ),
      getClient: async (clientId: string) =>
        parseResponse(
          CoachClientDetailSchema,
          await send({ method: 'GET', path: coachClientPath(idOf(clientId)), auth: AUTHENTICATED }),
        ),
      getPlan: async (clientId: string) =>
        parseResponse(
          PlanSchema,
          await send({ method: 'GET', path: coachPlanPath(idOf(clientId)), auth: AUTHENTICATED }),
        ),
      putPlan: async (clientId: string, body: z.input<typeof PutPlanRequestSchema>, opts?: MutationOptions) =>
        parseResponse(
          PlanSchema,
          await send({
            method: 'PUT',
            path: coachPlanPath(idOf(clientId)),
            auth: AUTHENTICATED,
            body: parseRequest(PutPlanRequestSchema, body),
            idempotencyKey: idempotencyKeyOf(opts),
          }),
        ),
      listPlanVersions: async (clientId: string, query: z.input<typeof PageQuerySchema> = {}) =>
        parseResponse(
          PlanVersionsPageSchema,
          await send({
            method: 'GET',
            path: coachPlanVersionsPath(idOf(clientId)),
            auth: AUTHENTICATED,
            query: pageParams(query),
          }),
        ),
      getPlanVersion: async (clientId: string, version: number) =>
        parseResponse(
          PlanSchema,
          await send({
            method: 'GET',
            path: coachPlanVersionPath(idOf(clientId), versionOf(version)),
            auth: AUTHENTICATED,
          }),
        ),
      getCalendar: async (clientId: string, range: z.input<typeof CalendarRangeQuerySchema>) =>
        parseResponse(
          CalendarEntriesResponseSchema,
          await send({
            method: 'GET',
            path: coachCalendarPath(idOf(clientId)),
            auth: AUTHENTICATED,
            query: rangeParams(range),
          }),
        ),
      createCalendarEntry: async (
        clientId: string,
        body: z.input<typeof CreateCalendarEntryRequestSchema>,
        opts?: MutationOptions,
      ) =>
        parseResponse(
          CalendarEntrySchema,
          await send({
            method: 'POST',
            path: coachCalendarPath(idOf(clientId)),
            auth: AUTHENTICATED,
            body: parseRequest(CreateCalendarEntryRequestSchema, body),
            idempotencyKey: idempotencyKeyOf(opts),
          }),
        ),
      moveCalendarEntry: async (clientId: string, entryId: string, body: z.input<typeof MoveCalendarEntryRequestSchema>) =>
        parseResponse(
          CalendarEntrySchema,
          await send({
            method: 'PATCH',
            path: coachCalendarEntryPath(idOf(clientId), idOf(entryId)),
            auth: AUTHENTICATED,
            body: parseRequest(MoveCalendarEntryRequestSchema, body),
          }),
        ),
      deleteCalendarEntry: async (clientId: string, entryId: string): Promise<void> => {
        await send({
          method: 'DELETE',
          path: coachCalendarEntryPath(idOf(clientId), idOf(entryId)),
          auth: AUTHENTICATED,
        });
      },
    },

    client: {
      getCalendar: async (range: z.input<typeof CalendarRangeQuerySchema>) =>
        parseResponse(
          CalendarEntriesResponseSchema,
          await send({
            method: 'GET',
            path: API_PATHS.clientCalendar,
            auth: AUTHENTICATED,
            query: rangeParams(range),
          }),
        ),
      listPlans: async () =>
        parseResponse(
          ClientPlansResponseSchema,
          await send({ method: 'GET', path: API_PATHS.clientPlans, auth: AUTHENTICATED }),
        ),
    },

    links: {
      listOwn: async (query: z.input<typeof PageQuerySchema> = {}) =>
        parseResponse(
          ClientLinksPageSchema,
          await send({
            method: 'GET',
            path: API_PATHS.clientLinks,
            auth: AUTHENTICATED,
            query: pageParams(query),
          }),
        ),
      pause: async (linkId: string, opts?: MutationOptions) => linkAction(linkId, 'pause', opts),
      resume: async (linkId: string, opts?: MutationOptions) => linkAction(linkId, 'resume', opts),
      end: async (linkId: string, opts?: MutationOptions) => linkAction(linkId, 'end', opts),
    },
  };
};

export type ApiClient = ReturnType<typeof createApiClient>;
