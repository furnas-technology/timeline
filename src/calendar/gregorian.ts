import { buildMonthLabels, normaliseWeekday } from './broadcast';
import { addDays, type CalendarDate, calendarDate, inclusiveDays, toCalendarDate } from './dates';
import type { Period, TimeCalendar } from './types';

export interface GregorianCalendarOptions {
	/** First day of the week, Luxon weekday numbering (1 = Monday … 7 = Sunday). Default 1 (ISO). */
	weekStartsOn?: number;
	/** Locale for month labels. Default `en-US`. */
	locale?: string;
}

/**
 * The standard calendar: months and years follow the civil calendar; weeks start on `weekStartsOn` and may straddle
 * month boundaries. A week is assigned to the month/year of its start date. Week labels are the day of month the
 * week starts on (e.g. `3`, `10`, `17`).
 */
export function createGregorianCalendar(options: GregorianCalendarOptions = {}): TimeCalendar {
	const weekStartsOn = normaliseWeekday(options.weekStartsOn ?? 1);
	const locale = options.locale ?? 'en-US';
	const monthLabels = buildMonthLabels(locale);

	const weekOf = (input: CalendarDate): Period => {
		const date = toCalendarDate(input);
		const start = addDays(date, -((date.weekday - weekStartsOn + 7) % 7));
		return {
			unit: 'week',
			start,
			end: addDays(start, 6),
			key: `week:${start.toISODate()}`,
			year: start.year,
			number: start.weekNumber,
			label: String(start.day),
			days: 7,
		};
	};

	const monthOf = (input: CalendarDate): Period => {
		const date = toCalendarDate(input);
		const start = calendarDate(date.year, date.month, 1);
		const end = calendarDate(date.year, date.month, start.daysInMonth ?? 31);
		return {
			unit: 'month',
			start,
			end,
			key: `month:${start.toISODate()}`,
			year: date.year,
			number: date.month,
			label: monthLabels[date.month - 1] ?? String(date.month),
			days: inclusiveDays(start, end),
		};
	};

	const yearOf = (input: CalendarDate): Period => {
		const date = toCalendarDate(input);
		const start = calendarDate(date.year, 1, 1);
		const end = calendarDate(date.year, 12, 31);
		return {
			unit: 'year',
			start,
			end,
			key: `year:${start.toISODate()}`,
			year: date.year,
			number: date.year,
			label: String(date.year),
			days: inclusiveDays(start, end),
		};
	};

	return {
		id: 'gregorian',
		weeksAlignToMonths: false,
		weekOf,
		monthOf,
		yearOf,
		monthLabel: (n) => monthLabels[n - 1] ?? String(n),
	};
}
