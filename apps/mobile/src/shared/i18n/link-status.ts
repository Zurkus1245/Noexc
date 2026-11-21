import type { CoachClientSummary } from '@noexcuse/contracts';
import type { MessageKey } from './en';

type LinkStatus = CoachClientSummary['status'];

// Exhaustive over the tolerant enum, so a status added by the server renders as 'unknown' until the app is updated.
const STATUS_KEY: Record<LinkStatus, MessageKey> = {
  active: 'status.active',
  paused: 'status.paused',
  ended: 'status.ended',
  unknown: 'status.unknown',
};

export const statusLabelKey = (status: LinkStatus): MessageKey => STATUS_KEY[status];

// Route params are untyped strings; anything outside the known set is shown as unknown.
export const parseLinkStatus = (value: string | undefined): LinkStatus =>
  value !== undefined && value in STATUS_KEY ? (value as LinkStatus) : 'unknown';
