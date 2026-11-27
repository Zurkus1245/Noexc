# 0009 Short invite codes: 8 characters, forgiving input

Status: accepted (founder delegated the decision, 2026-11-27). Changes the invite code format in `packages/contracts`;
adds no dependency. Keeps CLAUDE.md §9: codes stay random, single-use, expiring and rate-limited.

## Context
Invite codes were 26 Crockford base32 characters (128 bits). A coach shares the code by voice or chat, and the client
types it on a phone; 26 characters cannot be dictated. The prototype showed 6 characters (30 bits), which is too few:
with many open invites a guesser's odds grow with every active code.

## Decision
- A code is 8 Crockford base32 characters: 40 random bits (about 1.1 × 10¹²). Generated from 5 bytes of `randomBytes`.
- It is shown and copied grouped as `ABCD-EFGH`. Input is normalized by the shared contract schema: case, spaces and
  dashes are ignored, and the Crockford look-alikes O → 0, I/L → 1 are decoded. Server and client use the same rule.
- Unchanged safeguards: only the SHA-256 hash is stored, a code redeems once, it expires after `INVITE_TTL_HOURS`
  (168), the answer is the same for unknown, used, expired and revoked codes, and redeem attempts are limited per user
  (`RATE_LIMITS.redeemAttempt`: 5 per 10 minutes).

## Why 40 bits is enough here
One account gets at most 720 guesses a day. With 10 000 open invites, each guess hits with probability ≈ 9 × 10⁻⁹, so an
attacker needs on the order of 10⁵ account-days for one hit — and accounts sit behind OIDC sign-in (Sign in with Apple).
If metrics ever show many accounts guessing, add a global redeem limit; the code length can grow without a data change.

## Consequences
- Invites created before this change (26 characters) no longer pass the schema. There is no production data yet.
- `docs/contracts/api.d.ts` gains `normalizeInviteCode` and `formatInviteCode`.
