import { type CalendarDate, dayNumber, maxDate, minDate } from '../calendar/dates';
import { periodsBetween } from '../calendar/periods';
import type { Period, TimeCalendar } from '../calendar/types';
import type { AggregateFn, AllocateOption, MetricDef, MetricValues } from '../config';
import type { NormalizedRow } from './types';

export interface ResolvedMetric<T> {
	readonly id: string;
	readonly label: string;
	readonly value: (row: T) => number | null | undefined;
	readonly aggregate: AggregateFn;
	readonly allocate: AllocateOption;
	readonly format: (value: number) => string;
}

const aggregates: Record<'sum' | 'avg' | 'min' | 'max' | 'count', AggregateFn> = {
	sum: (v) => v.reduce((a, b) => a + b, 0),
	avg: (v) => v.reduce((a, b) => a + b, 0) / v.length,
	min: (v) => Math.min(...v),
	max: (v) => Math.max(...v),
	count: (v) => v.length,
};

export function resolveMetrics<T>(defs: readonly MetricDef<T>[] | undefined, locale: string): ResolvedMetric<T>[] {
	const seen = new Set<string>();
	return (defs ?? []).map((def) => {
		if (seen.has(def.id)) throw new Error(`Duplicate metric id "${def.id}"`);
		seen.add(def.id);
		const kind = def.aggregate ?? 'sum';
		const aggregate = typeof kind === 'function' ? kind : aggregates[kind];
		const formatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
		return {
			id: def.id,
			label: def.label,
			value: def.value,
			aggregate,
			allocate: def.allocate ?? (kind === 'sum' ? 'prorata' : 'active'),
			format: def.format ?? ((n: number) => formatter.format(n)),
		};
	});
}

/** Read a metric from a row, treating non-finite values as missing. */
export function readValue<T>(metric: ResolvedMetric<T>, row: T): number | null {
	const v = metric.value(row);
	return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

export function aggregate<T>(metric: ResolvedMetric<T>, values: readonly number[]): number | null {
	if (values.length === 0) return null;
	const result = metric.aggregate(values);
	return Number.isFinite(result) ? result : null;
}

/** Aggregate every metric over raw row values (never over sub-aggregates, so avg/min/max stay correct). */
export function metricsFor<T>(rows: readonly NormalizedRow<T>[], metrics: readonly ResolvedMetric<T>[]): MetricValues {
	const out: Record<string, number | null> = {};
	for (const metric of metrics) {
		const values: number[] = [];
		for (const row of rows) {
			const v = row.values[metric.id];
			if (v !== null && v !== undefined) values.push(v);
		}
		out[metric.id] = aggregate(metric, values);
	}
	return out;
}

export interface AllocationTarget {
	/** Columns to fill; `columnOf` maps a calendar month to a column index or -1. */
	readonly columns: number;
	readonly columnOf: (month: Period) => number;
	/** Clip rows to this window first (continuous mode). `null` = no clipping (year-over-year). */
	readonly window: { start: CalendarDate; end: CalendarDate } | null;
}

/**
 * Spread each row's value into period columns and aggregate per column.
 *
 * For `prorata` this is the original timeline's formula (`getPeriodValues`, commit 7d5b7f1a):
 * daily rate = value ÷ row days; for each month, overlap = [max(row start, month start, view start),
 * min(row end, month end, view end)]; contribution = daily rate × overlap days.
 */
export function allocate<T>(
	metric: ResolvedMetric<T>,
	rows: readonly NormalizedRow<T>[],
	calendar: TimeCalendar,
	target: AllocationTarget,
): (number | null)[] {
	const buckets: number[][] = Array.from({ length: target.columns }, () => []);
	if (metric.allocate === 'none') return buckets.map(() => null);

	for (const row of rows) {
		const value = row.values[metric.id];
		if (value === null || value === undefined) continue;

		const lo = target.window ? maxDate(row.start, target.window.start) : row.start;
		const hi = target.window ? minDate(row.end, target.window.end) : row.end;
		if (dayNumber(lo) > dayNumber(hi)) continue;

		if (metric.allocate === 'start' || metric.allocate === 'end') {
			const date = metric.allocate === 'start' ? row.start : row.end;
			if (dayNumber(date) < dayNumber(lo) || dayNumber(date) > dayNumber(hi)) continue;
			const column = target.columnOf(calendar.monthOf(date));
			if (column >= 0) buckets[column]?.push(value);
			continue;
		}

		const daily = value / row.days;
		for (const month of periodsBetween(calendar, 'month', lo, hi)) {
			const column = target.columnOf(month);
			if (column < 0) continue;
			const overlap =
				Math.min(dayNumber(hi), dayNumber(month.end)) - Math.max(dayNumber(lo), dayNumber(month.start)) + 1;
			if (overlap <= 0) continue;
			buckets[column]?.push(metric.allocate === 'prorata' ? daily * overlap : value);
		}
	}

	// Several rows may land in one column; each contributes its share, then the column is aggregated.
	return buckets.map((values) => aggregate(metric, values));
}
