import { hasValidConsent, type ConsentRecord } from '@noexcuse/domain';
import type { ConsentType, Role } from '@noexcuse/contracts';

// Mandatory onboarding consents per role: terms for everyone, health data for clients (GDPR art. 9).
const REQUIRED_BY_ROLE: Record<Role, readonly ConsentType[]> = {
  coach: ['tos'],
  client: ['tos', 'health_data'],
};

export const requiredConsentTypes = (role: Role): readonly ConsentType[] => REQUIRED_BY_ROLE[role];

// A consent is pending when it is missing or was given to an outdated version (CONSENT_VERSIONS moved on).
export const hasPendingRequiredConsent = (records: readonly ConsentRecord[], role: Role): boolean =>
  requiredConsentTypes(role).some((type) => !hasValidConsent(records, type));
