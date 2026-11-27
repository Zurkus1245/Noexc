export const API_PATHS = {
  localAuthToken: '/v1/auth/local/token',
  me: '/v1/me',
  meConsents: '/v1/me/consents',
  meExport: '/v1/me/export',
  invites: '/v1/invites',
  invitesRedeem: '/v1/invites/redeem',
  coachClients: '/v1/coach/clients',
  clientLinks: '/v1/client/links',
  clientCalendar: '/v1/client/calendar',
  clientPlans: '/v1/client/plans',
  links: '/v1/links',
} as const;

export type LinkAction = 'pause' | 'resume' | 'end';

// Ids are validated as UUIDs by the caller before they reach a path.
export const coachClientPath = (clientId: string): string => `${API_PATHS.coachClients}/${clientId}`;

export const coachPlanPath = (clientId: string): string => `${coachClientPath(clientId)}/plan`;

export const coachPlanVersionsPath = (clientId: string): string => `${coachPlanPath(clientId)}/versions`;

export const coachPlanVersionPath = (clientId: string, version: number): string =>
  `${coachPlanVersionsPath(clientId)}/${version}`;

export const coachCalendarPath = (clientId: string): string => `${coachClientPath(clientId)}/calendar`;

export const coachCalendarEntryPath = (clientId: string, entryId: string): string =>
  `${coachCalendarPath(clientId)}/${entryId}`;

export const invitePath = (inviteId: string): string => `${API_PATHS.invites}/${inviteId}`;

export const linkActionPath = (linkId: string, action: LinkAction): string =>
  `${API_PATHS.links}/${linkId}/${action}`;
