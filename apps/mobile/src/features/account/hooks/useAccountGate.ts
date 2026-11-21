import { ApiError } from '@noexcuse/api-client';
import type { Role, User } from '@noexcuse/contracts';
import { useConsents } from '../../consent/hooks/useConsentActions';
import { hasPendingRequiredConsent } from '../../consent/lib/required-consents';
import { useSession } from '../../../shared/session/session-store';
import { useMe } from './useMe';

// Single routing decision for every account-bound screen: profile first, then mandatory consents, then the app.
export type AccountGate =
  | { readonly status: 'loading' }
  | { readonly status: 'signed-out' }
  | { readonly status: 'error'; readonly error: unknown; readonly retry: () => void }
  | { readonly status: 'onboarding' }
  | { readonly status: 'consent'; readonly role: Role }
  | { readonly status: 'ready'; readonly user: User };

export const useAccountGate = (): AccountGate => {
  const signedIn = useSession((state) => state.token !== null);
  const me = useMe(signedIn);
  const user = me.data;
  const consents = useConsents(signedIn && user !== undefined && user.role !== 'unknown');

  if (!signedIn) return { status: 'signed-out' };
  if (me.isError) {
    if (me.error instanceof ApiError && me.error.code === 'PROFILE_REQUIRED') return { status: 'onboarding' };
    return { status: 'error', error: me.error, retry: () => void me.refetch() };
  }
  if (user === undefined) return { status: 'loading' };
  if (user.role === 'unknown') return { status: 'ready', user };
  if (consents.isError) return { status: 'error', error: consents.error, retry: () => void consents.refetch() };
  if (consents.data === undefined) return { status: 'loading' };
  if (hasPendingRequiredConsent(consents.data, user.role)) return { status: 'consent', role: user.role };
  return { status: 'ready', user };
};
