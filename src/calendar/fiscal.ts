import { buildMonthLabels } from './broadcast';
import { addDays, type CalendarDate, calendarDate, inclusiveDays, toCalendarDate } from './dates';
import { createGregorianCalendar } from './gregorian';
import type { Period, TimeCalendar } from './types';

export interface FiscalCalendarOptions {
	/** Month the fiscal year starts in, 1–12. E.g. 10 for the US federal year, 7 for Australia. Default 7. */
	startMonth?: number;
	/** First day of the week, Luxon weekday numbering. Default 1 (Monday). */
	weekStartsOn?: number;
	/** Locale for month labels. Default `en-US`. */
	locale?: string;
	/** Prefix of year labels. Default `FY` (`FY2025`). */
	labelPrefix?: string;
}

/**
 * Civil months grouped into a fiscal year that starts in `startMonth`. The fiscal year is named after the calendar
 * year it **ends** in (US federal FY2025 = 1 Oct 2024 – 30 Sep 2025; Australian FY2025 = 1 Jul 2024 – 30 Jun 2025).
 * Months are numbered within the fiscal year, so year-over-year mode runs from the first fiscal month.
 */
export function createFiscalCalendar(options: FiscalCalendarOptions = {}): TimeCalendar {
	const startMonth = options.startMonth ?? 7;
	if (!Number.isInteger(startMonth) || startMonth < 1 || startMonth > 12) {
		throw new RangeError(`startMonth must be an integer 1–12, received ${startMonth}`);
	}
	const locale = options.locale ?? 'en-US';
	const prefix = options.labelPrefix ?? 'FY';
	const base = createGregorianCalendar({ weekStartsOn: options.weekStartsOn ?? 1, locale });
	const monthLabels = buildMonthLabels(locale);

	const fiscalYear = (d: CalendarDate): number => (startMonth === 1 || d.month < startMonth ? d.year : d.year + 1);
	const fiscalMonth = (month: number): number => ((month - startMonth + 12) % 12) + 1;

	const monthOf = (input: CalendarDate): Period => {
		const m = base.monthOf(input);
		return { ...m, year: fiscalYear(m.start), number: fiscalMonth(m.start.month) };
	};

	const yearOf = (input: CalendarDate): Period => {
		const year = fiscalYear(toCalendarDate(input));
		const start = startMonth === 1 ? calendarDate(year, 1, 1) : calendarDate(year - 1, startMonth, 1);
		const end = addDays(startMonth === 1 ? calendarDate(year + 1, 1, 1) : calendarDate(year, startMonth, 1), -1);
		return {
			unit: 'year',
			start,
			end,
			key: `year:${start.toISODate()}`,
			year,
			number: year,
			label: `${prefix}${year}`,
			days: inclusiveDays(start, end),
		};
	};

	return {
		id: `fiscal-${startMonth}`,
		weeksAlignToMonths: false,
		weekOf: base.weekOf,
		monthOf,
		yearOf,
		monthLabel: (n) => monthLabels[(n - 1 + startMonth - 1) % 12] ?? String(n),
	};
}
