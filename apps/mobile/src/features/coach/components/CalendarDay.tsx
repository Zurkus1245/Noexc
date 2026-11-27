import { Button, Text, colors, radii, spacing } from '@noexcuse/ui';
import type { CalendarEntry, LocalDate } from '@noexcuse/contracts';
import { StyleSheet, View } from 'react-native';
import { t } from '../../../shared/i18n';
import { dayLabel } from '../lib/calendar-labels';
import { WorkoutPicker } from './WorkoutPicker';

interface CalendarDayProps {
  readonly clientId: string;
  readonly date: LocalDate;
  readonly entries: readonly CalendarEntry[];
  readonly busy: boolean;
  readonly assigning: boolean;
  readonly onAssign: (date: LocalDate) => void;
  readonly onCloseAssign: () => void;
  readonly onMove: (entry: CalendarEntry, days: number) => void;
  readonly onRemove: (entry: CalendarEntry) => void;
}

const MOVE_EARLIER_DAYS = -1;
const MOVE_LATER_DAYS = 1;

export function CalendarDay({
  clientId,
  date,
  entries,
  busy,
  assigning,
  onAssign,
  onCloseAssign,
  onMove,
  onRemove,
}: CalendarDayProps) {
  return (
    <View style={styles.day}>
      <Text variant="heading">{dayLabel(date)}</Text>
      {entries.length === 0 ? <Text tone="muted">{t('coachCalendar.empty')}</Text> : null}
      {entries.map((entry) => (
        <View key={entry.id} style={styles.entry}>
          {entry.blockTitle === null ? null : (
            <Text variant="caption" tone="muted">
              {entry.blockTitle}
            </Text>
          )}
          <Text variant="label">{entry.workout?.title ?? t('coachCalendar.unknownWorkout')}</Text>
          <View style={styles.actions}>
            <Button
              label={t('coachCalendar.moveEarlier')}
              variant="secondary"
              disabled={busy}
              onPress={() => onMove(entry, MOVE_EARLIER_DAYS)}
            />
            <Button
              label={t('coachCalendar.moveLater')}
              variant="secondary"
              disabled={busy}
              onPress={() => onMove(entry, MOVE_LATER_DAYS)}
            />
            <Button label={t('coachCalendar.remove')} variant="danger" disabled={busy} onPress={() => onRemove(entry)} />
          </View>
        </View>
      ))}
      {assigning ? (
        <WorkoutPicker clientId={clientId} date={date} onDone={onCloseAssign} />
      ) : (
        <Button label={t('coachCalendar.assign')} variant="secondary" disabled={busy} onPress={() => onAssign(date)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  day: { gap: spacing.sm, padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.surface },
  entry: { gap: spacing.xs },
  actions: { gap: spacing.sm },
});
