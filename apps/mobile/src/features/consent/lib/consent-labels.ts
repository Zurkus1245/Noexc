import type { ConsentType } from '@noexcuse/contracts';
import type { MessageKey } from '../../../shared/i18n';

export const CONSENT_LABEL_KEY = {
  tos: 'client.consent.tos',
  health_data: 'client.consent.health_data',
  coach_access: 'client.consent.coach_access',
  marketing: 'client.consent.marketing',
} as const satisfies Record<ConsentType, MessageKey>;
