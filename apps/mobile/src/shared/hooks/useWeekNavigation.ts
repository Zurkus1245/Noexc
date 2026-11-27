import { useFocusEffect } from 'expo-router';
import { todayInTimeZone } from '@noexcuse/domain';
import { useCallback, useState } from 'react';
import { shiftWeek, startOfWeek, weekDays } from '../week';

const PREVIOUS_WEEK = -1;
const NEXT_WEEK = 1;

// "Today" is the wall-clock date in `timeZone`. It is recomputed on every focus so a screen kept mounted past midnight is not stale.
export function useWeekNavigation(timeZone: string) {
  const [today, setToday] = useState(() => todayInTimeZone(timeZone, new Date()));
  const [weeksFromCurrent, setWeeksFromCurrent] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setToday(todayInTimeZone(timeZone, new Date()));
    }, [timeZone]),
  );

  const weekStart = shiftWeek(startOfWeek(today), weeksFromCurrent);

  return {
    weekStart,
    days: weekDays(weekStart),
    today,
    prev: () => setWeeksFromCurrent((weeks) => weeks + PREVIOUS_WEEK),
    next: () => setWeeksFromCurrent((weeks) => weeks + NEXT_WEEK),
  };
}
