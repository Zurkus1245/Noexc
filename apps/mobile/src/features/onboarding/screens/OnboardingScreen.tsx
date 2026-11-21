import { Redirect, useRouter } from 'expo-router';
import { Screen, Text } from '@noexcuse/ui';
import { t } from '../../../shared/i18n';
import { useSession } from '../../../shared/session/session-store';
import { ProfileForm } from '../components/ProfileForm';
import { useCreateProfile } from '../hooks/useCreateProfile';

export function OnboardingScreen() {
  const token = useSession((state) => state.token);
  const createProfile = useCreateProfile();
  const router = useRouter();
  if (token === null) return <Redirect href="/sign-in" />;

  return (
    <Screen scroll>
      <Text variant="title">{t('onboarding.title')}</Text>
      <ProfileForm
        pending={createProfile.isPending}
        error={createProfile.error}
        onSubmit={(body) => createProfile.mutate(body, { onSuccess: () => router.replace('/') })}
      />
    </Screen>
  );
}
