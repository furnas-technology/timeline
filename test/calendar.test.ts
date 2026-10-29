import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';
import {
	createBroadcastCalendar,
	createFiscalCalendar,
	createGregorianCalendar,
	monthsBetweenInclusive,
	parseDateInput,
	periodsBetween,
	shiftPeriod,
} from '../src/calendar';

const d = (iso: string) => DateTime.fromISO(iso, { zone: 'utc' });
const iso = (dt: DateTime) => dt.toISODate();

describe('broadcast calendar', () => {
	const cal = createBroadcastCalendar();

	it('weeks run Monday to Sunday', () => {
		const w = cal.weekOf(d('2024-03-13')); // Wednesday
		expect(iso(w.start)).toBe('2024-03-11');
		expect(iso(w.end)).toBe('2024-03-17');
		expect(w.start.weekday).toBe(1);
	});

	it('January 2024 starts on Mon 1 Jan and ends on the last Sunday', () => {
		const m = cal.monthOf(d('2024-01-15'));
		expect(iso(m.start)).toBe('2024-01-01');
		expect(iso(m.end)).toBe('2024-01-28');
		expect(m.days).toBe(28);
		expect(m.number).toBe(1);
		expect(m.label).toBe('Jan');
	});

	it('March 2024 is a five week month that starts in February', () => {
		const m = cal.monthOf(d('2024-02-27'));
		expect(m.number).toBe(3);
		expect(iso(m.start)).toBe('2024-02-26');
		expect(iso(m.end)).toBe('2024-03-31');
		expect(m.days).toBe(35);
	});

	it('a late-December Monday belongs to January and the next year', () => {
		const date = d('2024-12-30');
		expect(cal.monthOf(date).number).toBe(1);
		expect(cal.monthOf(date).year).toBe(2025);
		expect(cal.yearOf(date).year).toBe(2025);
		expect(iso(cal.yearOf(d('2024-06-01')).end)).toBe('2024-12-29');
	});

	it('handles a year whose 1 January is a Sunday (2023)', () => {
		const y = cal.yearOf(d('2023-01-01'));
		expect(y.year).toBe(2023);
		expect(iso(y.start)).toBe('2022-12-26');
		expect(iso(cal.monthOf(d('2022-12-26')).start)).toBe('2022-12-26');
		expect(iso(cal.monthOf(d('2022-12-25')).end)).toBe('2022-12-25');
		expect(cal.monthOf(d('2022-12-25')).number).toBe(12);
	});

	it('numbers weeks within their broadcast month', () => {
		expect(cal.weekOf(d('2024-02-26')).number).toBe(1);
		expect(cal.weekOf(d('2024-03-25')).number).toBe(5);
	});

	it('months tile time with no gaps', () => {
		const months = periodsBetween(cal, 'month', d('2022-11-01'), d('2026-02-28'));
		for (let i = 1; i < months.length; i++) {
			const prev = months[i - 1];
			const cur = months[i];
			if (!prev || !cur) throw new Error('unreachable');
			expect(cur.start.diff(prev.end, 'days').days).toBe(1);
			expect(cur.start.weekday).toBe(1);
			expect(cur.end.weekday).toBe(7);
			expect([28, 35]).toContain(cur.days);
		}
	});

	it('shifts and counts months across year boundaries', () => {
		const nov = cal.monthOf(d('2024-11-10'));
		expect(shiftPeriod(cal, nov, 3).number).toBe(2);
		expect(shiftPeriod(cal, nov, 3).year).toBe(2025);
		expect(shiftPeriod(cal, nov, -11).number).toBe(12);
		expect(monthsBetweenInclusive(cal, d('2024-11-10'), d('2025-02-10'))).toBe(4);
	});

	it('supports a Sunday week start', () => {
		const sun = createBroadcastCalendar({ weekStartsOn: 7 });
		const w = sun.weekOf(d('2024-03-13'));
		expect(iso(w.start)).toBe('2024-03-10');
		expect(iso(w.end)).toBe('2024-03-16');
		expect(sun.monthOf(d('2024-03-13')).end.weekday).toBe(6);
	});

	it('rejects invalid week starts', () => {
		expect(() => createBroadcastCalendar({ weekStartsOn: 0 })).toThrow(RangeError);
	});
});

describe('gregorian calendar', () => {
	const cal = createGregorianCalendar();

	it('uses civil months and years', () => {
		const m = cal.monthOf(d('2024-02-15'));
		expect(iso(m.start)).toBe('2024-02-01');
		expect(iso(m.end)).toBe('2024-02-29');
		expect(cal.yearOf(d('2024-12-31')).year).toBe(2024);
	});

	it('labels weeks with the day of month they start on', () => {
		const w = cal.weekOf(d('2024-03-13'));
		expect(iso(w.start)).toBe('2024-03-11');
		expect(w.label).toBe('11');
		expect(cal.weeksAlignToMonths).toBe(false);
	});
});

describe('parseDateInput', () => {
	it('keeps date-only strings literal regardless of zone', () => {
		expect(iso(parseDateInput('2024-03-01', 'America/Los_Angeles') as DateTime)).toBe('2024-03-01');
		expect(iso(parseDateInput('2024-03-01', 'Australia/Sydney') as DateTime)).toBe('2024-03-01');
	});

	it('reads timestamps in the configured zone', () => {
		expect(iso(parseDateInput('2024-03-01T20:00:00Z', 'Australia/Sydney') as DateTime)).toBe('2024-03-02');
		expect(iso(parseDateInput(Date.UTC(2024, 2, 1, 20), 'UTC') as DateTime)).toBe('2024-03-01');
	});

	it('uses a DateTime’s own calendar date', () => {
		const local = DateTime.fromObject({ year: 2024, month: 3, day: 1 }, { zone: 'Australia/Sydney' });
		expect(iso(parseDateInput(local, 'UTC') as DateTime)).toBe('2024-03-01');
	});

	it('returns null for invalid input', () => {
		expect(parseDateInput('not a date', 'UTC')).toBeNull();
		expect(parseDateInput(Number.NaN, 'UTC')).toBeNull();
	});
});

describe('fiscal calendar', () => {
	it('names the US federal year after the year it ends in', () => {
		const cal = createFiscalCalendar({ startMonth: 10 });
		const y = cal.yearOf(d('2024-10-01'));
		expect(y.year).toBe(2025);
		expect(y.label).toBe('FY2025');
		expect(iso(y.start)).toBe('2024-10-01');
		expect(iso(y.end)).toBe('2025-09-30');
		expect(cal.yearOf(d('2025-09-30')).year).toBe(2025);
	});

	it('numbers months within the fiscal year so navigation stays monotonic', () => {
		const cal = createFiscalCalendar({ startMonth: 10 });
		expect(cal.monthOf(d('2024-10-15')).number).toBe(1);
		expect(cal.monthOf(d('2025-09-15')).number).toBe(12);
		expect(cal.monthLabel(1)).toBe('Oct');
		expect(cal.monthLabel(12)).toBe('Sep');
		const sep = cal.monthOf(d('2025-09-10'));
		expect(shiftPeriod(cal, sep, 1).number).toBe(1);
		expect(shiftPeriod(cal, sep, 1).year).toBe(2026);
		expect(monthsBetweenInclusive(cal, d('2025-08-10'), d('2025-11-10'))).toBe(4);
	});

	it('defaults to an Australian July–June year and supports January starts', () => {
		const au = createFiscalCalendar();
		expect(au.yearOf(d('2025-07-01')).label).toBe('FY2026');
		expect(au.monthLabel(1)).toBe('Jul');
		const jan = createFiscalCalendar({ startMonth: 1, labelPrefix: 'CY' });
		expect(jan.yearOf(d('2025-06-01')).label).toBe('CY2025');
		expect(iso(jan.yearOf(d('2025-06-01')).end)).toBe('2025-12-31');
		expect(() => createFiscalCalendar({ startMonth: 13 })).toThrow(RangeError);
	});
});
