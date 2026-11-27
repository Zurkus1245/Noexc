import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { Button, Screen, Text, spacing } from '@noexcuse/ui';
import { addDays } from '@noexcuse/domain';
import type { CalendarEntry, LocalDate } from '@noexcuse/contracts';
import { ApiErrorBanner } from '../../../shared/components/ApiErrorBanner';
import { LoadingView } from '../../../shared/components/LoadingView';
import { useWeekNavigation } from '../../../shared/hooks/useWeekNavigation';
import { t } from '../../../shared/i18n';
import { weekEnd } from '../../../shared/week';
import { CalendarDay } from '../components/CalendarDay';
import { useCoachClient } from '../hooks/useCoachActions';
import { useCoachCalendar, useDeleteCalendarEntry, useMoveCalendarEntry } from '../hooks/useCoachCalendar';
import { dayLabel } from '../lib/calendar-labels';

export function CalendarScreen() {
  const { clientId } = useLocalSearchParams<{ clientId: string }>();
  const detail = useCoachClient(clientId);

  if (detail.isPending) return <LoadingView />;
  if (detail.isError) {
    return (
      <Screen>
        <ApiErrorBanner error={detail.error} onRetry={() => void detail.refetch()} />
      </Screen>
    );
  }

  return <WeekCalendar clientId={clientId} timezone={detail.data.client.timezone} />;
}

interface WeekCalendarProps {
  readonly clientId: string;
  readonly timezone: string;
}

// Weeks follow the client's wall clock, so "today" and the Monday start are the client's, not the coach's device.
function WeekCalendar({ clientId, timezone }: WeekCalendarProps) {
  const [assigningDate, setAssigningDate] = useState<LocalDate | null>(null);
  const week = useWeekNavigation(timezone);
  const range = { from: week.weekStart, to: weekEnd(week.weekStart) };
  const calendar = useCoachCalendar(clientId, range);
  const move = useMoveCalendarEntry(clientId);
  const remove = useDeleteCalendarEntry(clientId);
  const busy = move.isPending || remove.isPending;
  const mutationError = move.error ?? remove.error;

  const entriesOn = (date: LocalDate): CalendarEntry[] =>
    calendar.data?.items.filter((entry) => entry.date === date) ?? [];

  const confirmRemove = (entry: CalendarEntry) => {
    Alert.alert(t('coachCalendar.removeTitle'), t('coachCalendar.removeBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('coachCalendar.remove'), style: 'destructive', onPress: () => remove.mutate(entry.id) },
    ]);
  };

  return (
    <Screen scroll>
      <Text variant="title">{t('coachCalendar.title')}</Text>
      <View style={styles.weekNav}>
        <Button
          label={t('coachCalendar.prevWeek')}
          variant="secondary"
          onPress={week.prev}
        />
        <Text variant="label">{`${dayLabel(range.from)} – ${dayLabel(range.to)}`}</Text>
        <Button label={t('coachCalendar.nextWeek')} variant="secondary" onPress={week.next} />
      </View>
      {calendar.isError ? <ApiErrorBanner error={calendar.error} onRetry={() => void calendar.refetch()} /> : null}
      {mutationError ? <ApiErrorBanner error={mutationError} /> : null}
      {calendar.isPending ? <ActivityIndicator accessibilityLabel={t('common.loading')} /> : null}
      {week.days.map((date) => (
        <CalendarDay
          key={date}
          clientId={clientId}
          date={date}
          entries={entriesOn(date)}
          busy={busy}
          assigning={assigningDate === date}
          onAssign={setAssigningDate}
          onCloseAssign={() => setAssigningDate(null)}
          onMove={(entry, days) => move.mutate({ entryId: entry.id, date: addDays(entry.date, days) })}
          onRemove={confirmRemove}
        />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  weekNav: { gap: spacing.sm },
});
