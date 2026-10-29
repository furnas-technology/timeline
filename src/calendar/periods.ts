import { addDays, type CalendarDate, dayNumber } from './dates';
import type { Period, PeriodUnit, TimeCalendar } from './types';

export function periodOf(calendar: TimeCalendar, unit: PeriodUnit, date: CalendarDate): Period {
	switch (unit) {
		case 'week':
			return calendar.weekOf(date);
		case 'month':
			return calendar.monthOf(date);
		case 'year':
			return calendar.yearOf(date);
	}
}

/** The period immediately after (`step` = 1) or before (`step` = -1) the given one. */
export function adjacentPeriod(calendar: TimeCalendar, period: Period, step: 1 | -1): Period {
	const date = step === 1 ? addDays(period.end, 1) : addDays(period.start, -1);
	return periodOf(calendar, period.unit, date);
}

/** Move `count` periods forward (positive) or back (negative). */
export function shiftPeriod(calendar: TimeCalendar, period: Period, count: number): Period {
	let current = period;
	const step = count >= 0 ? 1 : -1;
	for (let i = 0; i < Math.abs(count); i++) {
		current = adjacentPeriod(calendar, current, step);
	}
	return current;
}

/** All periods of `unit` that intersect `[start, end]`, in order. */
export function periodsBetween(
	calendar: TimeCalendar,
	unit: PeriodUnit,
	start: CalendarDate,
	end: CalendarDate,
): Period[] {
	const result: Period[] = [];
	const endDay = dayNumber(end);
	let current = periodOf(calendar, unit, start);
	while (dayNumber(current.start) <= endDay) {
		result.push(current);
		current = adjacentPeriod(calendar, current, 1);
	}
	return result;
}

/** Number of months from the month containing `a` to the month containing `b`, inclusive of both. */
export function monthsBetweenInclusive(calendar: TimeCalendar, a: CalendarDate, b: CalendarDate): number {
	const ma = calendar.monthOf(a);
	const mb = calendar.monthOf(b);
	return (mb.year - ma.year) * 12 + (mb.number - ma.number) + 1;
}
