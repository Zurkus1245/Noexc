import { ErrorBanner } from '@noexcuse/ui';
import { t } from '../i18n';
import { presentError } from '../api/api-error';

export interface ApiErrorBannerProps {
  readonly error: unknown;
  readonly onRetry?: () => void;
}

// Shows the localized message for an error; offers retry only for transient failures.
export function ApiErrorBanner({ error, onRetry }: ApiErrorBannerProps) {
  const { messageKey, retryable } = presentError(error);
  const showRetry = retryable && onRetry !== undefined;
  return (
    <ErrorBanner
      message={t(messageKey)}
      retryLabel={showRetry ? t('common.retry') : undefined}
      onRetry={showRetry ? onRetry : undefined}
    />
  );
}
