import { z } from 'zod';
import {
  AccountExportSchema,
  ConsentSchema,
  ClientLinksPageSchema,
  CoachClientDetailSchema,
  CoachClientPageSchema,
  CoachClientSchema,
  CreateInviteResponseSchema,
  CreateProfileRequestSchema,
  GrantConsentRequestSchema,
  LocalTokenRequestSchema,
  LocalTokenResponseSchema,
  PageQuerySchema,
  RedeemInviteRequestSchema,
  UpdateProfileRequestSchema,
  UserSchema,
  UuidSchema,
} from '@noexcuse/contracts';
import { API_PATHS, coachClientPath, invitePath, linkActionPath, type LinkAction } from './paths';
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
  // Refreshes the session before the single retry of a 401. Its own failures propagate to the caller.
  readonly onRefresh: () => Promise<void>;
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
      listClients: async (query: z.input<typeof PageQuerySchema> = {}) => {
        const page = parseRequest(PageQuerySchema, query);
        const params = new URLSearchParams({ limit: String(page.limit) });
        if (page.cursor !== undefined) params.set('cursor', page.cursor);
        return parseResponse(
          CoachClientPageSchema,
          await send({ method: 'GET', path: API_PATHS.coachClients, auth: AUTHENTICATED, query: params }),
        );
      },
      getClient: async (clientId: string) =>
        parseResponse(
          CoachClientDetailSchema,
          await send({ method: 'GET', path: coachClientPath(idOf(clientId)), auth: AUTHENTICATED }),
        ),
    },

    links: {
      listOwn: async (query: z.input<typeof PageQuerySchema> = {}) => {
        const page = parseRequest(PageQuerySchema, query);
        const params = new URLSearchParams({ limit: String(page.limit) });
        if (page.cursor !== undefined) params.set('cursor', page.cursor);
        return parseResponse(
          ClientLinksPageSchema,
          await send({ method: 'GET', path: API_PATHS.clientLinks, auth: AUTHENTICATED, query: params }),
        );
      },
      pause: async (linkId: string, opts?: MutationOptions) => linkAction(linkId, 'pause', opts),
      resume: async (linkId: string, opts?: MutationOptions) => linkAction(linkId, 'resume', opts),
      end: async (linkId: string, opts?: MutationOptions) => linkAction(linkId, 'end', opts),
    },
  };
};

export type ApiClient = ReturnType<typeof createApiClient>;
