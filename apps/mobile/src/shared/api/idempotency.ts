import { randomUUID } from 'expo-crypto';
import { useRef } from 'react';
import { isNetworkError } from './api-error';

interface PendingKey {
  readonly intent: string;
  readonly key: string;
}

export interface IdempotencyKey {
  // One key per user intent: retries of the same intent reuse it (the server replays), a new intent gets a new key.
  readonly keyFor: (intent: unknown) => string;
  // Called when the mutation settles. A network failure keeps the key: the server may already have acted on it.
  readonly settle: (error: unknown) => void;
}

export const useIdempotencyKey = (): IdempotencyKey => {
  const pending = useRef<PendingKey | null>(null);
  return {
    keyFor: (intent) => {
      const serialized = JSON.stringify(intent);
      const current = pending.current;
      if (current !== null && current.intent === serialized) return current.key;
      const next = { intent: serialized, key: randomUUID() };
      pending.current = next;
      return next.key;
    },
    settle: (error) => {
      if (!isNetworkError(error)) pending.current = null;
    },
  };
};
