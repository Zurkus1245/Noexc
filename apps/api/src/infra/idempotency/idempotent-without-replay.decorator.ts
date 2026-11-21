import { SetMetadata } from '@nestjs/common';

export const IDEMPOTENT_WITHOUT_REPLAY_KEY = 'idempotency:without-replay';

// WHY: a response that carries a secret (the invite code, shown once) must never be written to the store.
// Without the body a repeated key cannot be replayed, so it answers IDEMPOTENCY_CONFLICT instead.
// Trade-off: a client that lost the first response cannot recover the code. It must create a new invite,
// and the lost invite stays valid until it expires or the coach revokes it.
export const IdempotentWithoutReplay = () => SetMetadata(IDEMPOTENT_WITHOUT_REPLAY_KEY, true);
