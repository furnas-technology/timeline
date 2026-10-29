import { DateTime } from 'luxon';
import { addDays, type CalendarDate, calendarDate, inclusiveDays, toCalendarDate } from './dates';
import type { Period, TimeCalendar } from './types';

export interface BroadcastCalendarOptions {
	/** First day of the broadcast week, Luxon weekday numbering (1 = Monday … 7 = Sunday). Default 1. */
	weekStartsOn?: number;
	/** Locale for month labels. Default `en-US`. */
	locale?: string;
}

/**
 * The broadcast calendar used across US/AU media planning:
 *
 * - weeks run Monday–Sunday (configurable)
 * - a week belongs to the month (and year) in which its **last** day falls
 * - so a broadcast month starts on the Monday of the week containing the 1st, and ends on the last Sunday of the
 *   calendar month; months are therefore always 4 or 5 whole weeks
 */
export function createBroadcastCalendar(options: BroadcastCalendarOptions = {}): TimeCalendar {
	const weekStartsOn = normaliseWeekday(options.weekStartsOn ?? 1);
	const weekEndsOn = ((weekStartsOn + 5) % 7) + 1;
	const locale = options.locale ?? 'en-US';
	const monthLabels = buildMonthLabels(locale);

	const startOfWeek = (d: CalendarDate): CalendarDate => addDays(d, -((d.weekday - weekStartsOn + 7) % 7));
	/** Last week-end day on or before `d`. */
	const lastWeekEndOnOrBefore = (d: CalendarDate): CalendarDate => addDays(d, -((d.weekday - weekEndsOn + 7) % 7));

	const weekOf = (input: CalendarDate): Period => {
		const date = toCalendarDate(input);
		const start = startOfWeek(date);
		const end = addDays(start, 6);
		const month = monthBounds(end);
		const number = Math.floor(inclusiveDays(month.start, start) / 7) + 1;
		return {
			unit: 'week',
			start,
			end,
			key: `week:${start.toISODate()}`,
			year: end.year,
			number,
			label: String(number),
			days: 7,
		};
	};

	/** Broadcast month bounds for the month the given week-end date falls in. */
	const monthBounds = (weekEnd: CalendarDate): { start: CalendarDate; end: CalendarDate } => {
		const first = calendarDate(weekEnd.year, weekEnd.month, 1);
		const last = calendarDate(weekEnd.year, weekEnd.month, first.daysInMonth ?? 31);
		return { start: startOfWeek(first), end: lastWeekEndOnOrBefore(last) };
	};

	const monthOf = (input: CalendarDate): Period => {
		const weekEnd = addDays(startOfWeek(toCalendarDate(input)), 6);
		const { start, end } = monthBounds(weekEnd);
		return {
			unit: 'month',
			start,
			end,
			key: `month:${start.toISODate()}`,
			year: weekEnd.year,
			number: weekEnd.month,
			label: monthLabels[weekEnd.month - 1] ?? String(weekEnd.month),
			days: inclusiveDays(start, end),
		};
	};

	const yearOf = (input: CalendarDate): Period => {
		const weekEnd = addDays(startOfWeek(toCalendarDate(input)), 6);
		const year = weekEnd.year;
		const start = startOfWeek(calendarDate(year, 1, 1));
		const end = lastWeekEndOnOrBefore(calendarDate(year, 12, 31));
		return {
			unit: 'year',
			start,
			end,
			key: `year:${start.toISODate()}`,
			year,
			number: year,
			label: String(year),
			days: inclusiveDays(start, end),
		};
	};

	return {
		id: 'broadcast',
		weeksAlignToMonths: true,
		weekOf,
		monthOf,
		yearOf,
		monthLabel: (n) => monthLabels[n - 1] ?? String(n),
	};
}

export function normaliseWeekday(day: number): number {
	if (!Number.isInteger(day) || day < 1 || day > 7) {
		throw new RangeError(`weekStartsOn must be an integer 1 (Monday) … 7 (Sunday), received ${day}`);
	}
	return day;
}

export function buildMonthLabels(locale: string): string[] {
	return Array.from({ length: 12 }, (_, i) =>
		DateTime.utc(2001, i + 1, 1)
			.setLocale(locale)
			.toFormat('LLL'),
	);
}
