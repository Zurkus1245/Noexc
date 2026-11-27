import { StyleSheet, View } from 'react-native';
import { Text, spacing } from '@noexcuse/ui';
import type { CalendarEntry, LocalDate } from '@noexcuse/contracts';
import { formatDayHeading } from '../lib/calendar-format';
import { CalendarEntryCard } from './CalendarEntryCard';

interface CalendarDayProps {
  readonly date: LocalDate;
  readonly entries: readonly CalendarEntry[];
  readonly isToday: boolean;
}

export function CalendarDay({ date, entries, isToday }: CalendarDayProps) {
  return (
    <View style={styles.day}>
      <Text variant={isToday ? 'heading' : 'label'}>{formatDayHeading(date)}</Text>
      {entries.map((entry) => (
        <CalendarEntryCard key={entry.id} entry={entry} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  day: { gap: spacing.sm },
});
