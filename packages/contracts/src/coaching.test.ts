import { describe, expect, it } from 'vitest';
import { CoachClientDetailSchema, ClientLinksPageSchema, CoachClientSchema } from './coaching';

const ID = '123e4567-e89b-42d3-a456-426614174000';
const OTHER_ID = '223e4567-e89b-42d3-a456-426614174000';
const CREATED_AT = '2026-11-01T10:00:00.000Z';

const link = {
  id: ID,
  coachId: OTHER_ID,
  clientId: ID,
  status: 'active',
  createdAt: CREATED_AT,
  endedAt: null,
  endedBy: null,
};

const clientLink = {
  id: ID,
  coachId: OTHER_ID,
  coachDisplayName: 'Coach',
  status: 'paused',
  createdAt: CREATED_AT,
};

describe('CoachClientDetailSchema', () => {
  it('accepts the link with the client profile', () => {
    const parsed = CoachClientDetailSchema.parse({
      link,
      client: { id: ID, displayName: 'Ada', timezone: 'Europe/Berlin' },
    });

    expect(parsed.client.timezone).toBe('Europe/Berlin');
    expect(CoachClientSchema.parse(parsed.link)).toEqual(link);
  });

  it('rejects a client profile with an invalid timezone', () => {
    expect(
      CoachClientDetailSchema.safeParse({
        link,
        client: { id: ID, displayName: 'Ada', timezone: 'Mars/Olympus' },
      }).success,
    ).toBe(false);
  });
});

describe('ClientLinksPageSchema', () => {
  it('accepts a page of links with the coach display name and a next cursor', () => {
    expect(ClientLinksPageSchema.parse({ items: [clientLink], nextCursor: 'abc' })).toEqual({
      items: [clientLink],
      nextCursor: 'abc',
    });
  });

  it('accepts an empty last page', () => {
    expect(ClientLinksPageSchema.parse({ items: [], nextCursor: null })).toEqual({ items: [], nextCursor: null });
  });

  it('rejects the bare array shape', () => {
    expect(ClientLinksPageSchema.safeParse([clientLink]).success).toBe(false);
  });

  it('rejects the bare link shape without a coach display name', () => {
    expect(ClientLinksPageSchema.safeParse({ items: [link], nextCursor: null }).success).toBe(false);
  });

  it('maps an unknown status to unknown instead of failing', () => {
    const { items } = ClientLinksPageSchema.parse({
      items: [{ ...clientLink, status: 'archived' }],
      nextCursor: null,
    });

    expect(items[0]?.status).toBe('unknown');
  });
});
