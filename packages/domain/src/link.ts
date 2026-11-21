import { UNKNOWN_ENUM_VALUE, type LinkStatus } from '@noexcuse/contracts';

// A transition always lands on a concrete status; 'unknown' only exists for tolerant reads of responses.
type ConcreteLinkStatus = Exclude<LinkStatus, typeof UNKNOWN_ENUM_VALUE>;

export type LinkAction = 'pause' | 'resume' | 'end';
export type LinkActor = 'coach' | 'client' | 'admin';

export type TransitionResult =
  | { ok: true; status: ConcreteLinkStatus }
  | { ok: false; reason: 'INVALID_TRANSITION' };

type TransitionRule = {
  from: readonly LinkStatus[];
  to: ConcreteLinkStatus;
  actors: readonly LinkActor[];
};

const LINK_TRANSITIONS: Record<LinkAction, TransitionRule> = {
  pause: { from: ['active'], to: 'paused', actors: ['coach'] },
  resume: { from: ['paused'], to: 'active', actors: ['coach'] },
  end: { from: ['active', 'paused'], to: 'ended', actors: ['coach', 'client'] },
};

export function transitionLink(status: LinkStatus, action: LinkAction, actor: LinkActor): TransitionResult {
  const rule = LINK_TRANSITIONS[action];
  if (!rule.from.includes(status) || !rule.actors.includes(actor)) {
    return { ok: false, reason: 'INVALID_TRANSITION' };
  }
  return { ok: true, status: rule.to };
}

// Ended is terminal; a non-ended link is the only kind that can grant access.
export function isLinkOpen(status: LinkStatus): boolean {
  return status !== 'ended';
}
