export const API_PATHS = {
  localAuthToken: '/v1/auth/local/token',
  me: '/v1/me',
  meConsents: '/v1/me/consents',
  meExport: '/v1/me/export',
  invites: '/v1/invites',
  invitesRedeem: '/v1/invites/redeem',
  coachClients: '/v1/coach/clients',
  clientLinks: '/v1/client/links',
  links: '/v1/links',
} as const;

export type LinkAction = 'pause' | 'resume' | 'end';

// Ids are validated as UUIDs by the caller before they reach a path.
export const coachClientPath = (clientId: string): string => `${API_PATHS.coachClients}/${clientId}`;

export const invitePath = (inviteId: string): string => `${API_PATHS.invites}/${inviteId}`;

export const linkActionPath = (linkId: string, action: LinkAction): string =>
  `${API_PATHS.links}/${linkId}/${action}`;
