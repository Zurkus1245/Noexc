import type { Db } from './coaching.repository';

// Port: plans reacts to link end and client deletion without coaching importing plans.
export const LINK_LIFECYCLE_HOOK = Symbol('LINK_LIFECYCLE_HOOK');

export type EndedLink = { linkId: string; clientTimezone: string };

export interface LinkLifecycleHook {
  // Runs in the link-ending transaction, with the link locks held.
  onLinksClosed(tx: Db, links: readonly EndedLink[]): Promise<void>;
  // Runs in the account-deletion transaction: the deleted client's health data goes entirely.
  onClientDeleted(tx: Db, clientId: string): Promise<void>;
}
