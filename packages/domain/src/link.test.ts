import type { LinkStatus } from '@noexcuse/contracts';
import { describe, expect, it } from 'vitest';
import { isLinkOpen, transitionLink, type LinkAction, type LinkActor } from './link';

type Expected = LinkStatus | null;

// Every (status, action, actor) combination; null means INVALID_TRANSITION.
const MATRIX: ReadonlyArray<readonly [LinkStatus, LinkAction, LinkActor, Expected]> = [
  ['active', 'pause', 'coach', 'paused'],
  ['active', 'pause', 'client', null],
  ['active', 'pause', 'admin', null],
  ['paused', 'pause', 'coach', null],
  ['paused', 'pause', 'client', null],
  ['paused', 'pause', 'admin', null],
  ['ended', 'pause', 'coach', null],
  ['ended', 'pause', 'client', null],
  ['ended', 'pause', 'admin', null],

  ['active', 'resume', 'coach', null],
  ['active', 'resume', 'client', null],
  ['active', 'resume', 'admin', null],
  ['paused', 'resume', 'coach', 'active'],
  ['paused', 'resume', 'client', null],
  ['paused', 'resume', 'admin', null],
  ['ended', 'resume', 'coach', null],
  ['ended', 'resume', 'client', null],
  ['ended', 'resume', 'admin', null],

  ['active', 'end', 'coach', 'ended'],
  ['active', 'end', 'client', 'ended'],
  ['active', 'end', 'admin', null],
  ['paused', 'end', 'coach', 'ended'],
  ['paused', 'end', 'client', 'ended'],
  ['paused', 'end', 'admin', null],
  ['ended', 'end', 'coach', null],
  ['ended', 'end', 'client', null],
  ['ended', 'end', 'admin', null],
];

describe('transitionLink', () => {
  it.each(MATRIX)('%s + %s by %s -> %s', (status, action, actor, expected) => {
    const result = transitionLink(status, action, actor);

    if (expected === null) {
      expect(result).toEqual({ ok: false, reason: 'INVALID_TRANSITION' });
    } else {
      expect(result).toEqual({ ok: true, status: expected });
    }
  });

  it('lists all 27 status x action x actor combinations', () => {
    expect(MATRIX).toHaveLength(3 * 3 * 3);
  });
});

describe('isLinkOpen', () => {
  it.each<[LinkStatus, boolean]>([
    ['active', true],
    ['paused', true],
    ['ended', false],
  ])('%s -> %s', (status, expected) => {
    expect(isLinkOpen(status)).toBe(expected);
  });
});
