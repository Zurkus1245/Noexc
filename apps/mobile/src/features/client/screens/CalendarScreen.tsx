import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { Button, Screen, Text, spacing } from '@noexcuse/ui';
import type { CalendarEntry, LocalDate } from '@noexcuse/contracts';
import { ApiErrorBanner } from '../../../shared/components/ApiErrorBanner';
import { LoadingView } from '../../../shared/components/LoadingView';
import { useWeekNavigation } from '../../../shared/hooks/useWeekNavigation';
import { t } from '../../../shared/i18n';
import { weekEnd } from '../../../shared/week';
import { useMe } from '../../account/hooks/useMe';
import { CalendarDay } from '../components/CalendarDay';
import { formatWeekRange } from '../lib/calendar-format';
import { useMyCalendar } from '../hooks/useClientActions';

export function CalendarScreen() {
  const me = useMe(true);

  if (me.isError) {
    return (
      <Screen>
        <ApiErrorBanner error={me.error} onRetry={() => void me.refetch()} />
      </Screen>
    );
  }
  if (me.data === undefined) return <LoadingView />;

  return <WeekCalendar timeZone={me.data.timezone} />;
}

interface WeekCalendarProps {
  readonly timeZone: string;
}

function WeekCalendar({ timeZone }: WeekCalendarProps) {
  const { weekStart, days, today, prev, next } = useWeekNavigation(timeZone);
  const calendar = useMyCalendar({ from: weekStart, to: weekEnd(weekStart) });

  // Entries can change while the app is in the background or on another screen, so each focus refetches the week.
  useFocusEffect(
    useCallback(() => {
      void calendar.refetch();
    }, [calendar.refetch]),
  );

  const entries = calendar.data?.items ?? [];
  const entriesByDate = groupByDate(entries);
  const isEmptyWeek = calendar.isSuccess && entries.length === 0;

  return (
    <Screen>
      <FlatList
        data={days}
        keyExtractor={(date) => date}
        renderItem={({ item: date }) => (
          <CalendarDay date={date} entries={entriesByDate.get(date) ?? []} isToday={date === today} />
        )}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={calendar.isRefetching} onRefresh={() => void calendar.refetch()} />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.navigation}>
              <Button
                label={t('clientCalendar.prevWeek')}
                variant="secondary"
                onPress={prev}
              />
              <Button
                label={t('clientCalendar.nextWeek')}
                variant="secondary"
                onPress={next}
              />
            </View>
            <Text variant="heading">{formatWeekRange(weekStart, weekEnd(weekStart))}</Text>
            {calendar.isError ? <ApiErrorBanner error={calendar.error} onRetry={() => void calendar.refetch()} /> : null}
            {calendar.isPending ? <ActivityIndicator accessibilityLabel={t('common.loading')} /> : null}
            {isEmptyWeek ? <Text tone="muted">{t('clientCalendar.empty')}</Text> : null}
          </View>
        }
      />
    </Screen>
  );
}

function groupByDate(entries: readonly CalendarEntry[]): Map<LocalDate, CalendarEntry[]> {
  const grouped = new Map<LocalDate, CalendarEntry[]>();
  for (const entry of entries) {
    grouped.set(entry.date, [...(grouped.get(entry.date) ?? []), entry]);
  }
  return grouped;
}

const styles = StyleSheet.create({
  list: { gap: spacing.lg, paddingBottom: spacing.xl },
  header: { gap: spacing.md, paddingBottom: spacing.md },
  navigation: { flexDirection: 'row', gap: spacing.sm },
});
