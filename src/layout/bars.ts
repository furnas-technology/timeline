import { dayNumber, inclusiveDays } from '../calendar/dates';
import type { TimeCalendar } from '../calendar/types';
import { metricsFor, type ResolvedMetric } from './aggregate';
import type { Bar, NormalizedRow } from './types';

export interface BarBuildOptions {
	mergeOverlapping: boolean;
	mergeAdjacent: boolean;
}

/**
 * Turn the rows of one lane group into bars.
 *
 * - Default: rows with the same merge key and identical dates share one bar.
 * - `mergeOverlapping`: rows with the same merge key whose ranges overlap (or touch, with `mergeAdjacent`) are
 *   unioned into one bar — a proper interval union, so chains of overlaps and full containment both merge.
 */
export function buildBars<T>(
	groupId: string,
	rows: readonly NormalizedRow<T>[],
	options: BarBuildOptions,
	metrics: readonly ResolvedMetric<T>[],
	calendar: TimeCalendar,
): Bar<T>[] {
	const byMergeKey = new Map<string, NormalizedRow<T>[]>();
	for (const row of rows) {
		const list = byMergeKey.get(row.mergeKey);
		if (list) list.push(row);
		else byMergeKey.set(row.mergeKey, [row]);
	}

	const clusters: NormalizedRow<T>[][] = [];
	for (const list of byMergeKey.values()) {
		if (options.mergeOverlapping) {
			clusters.push(...unionClusters(list, options.mergeAdjacent ? 1 : 0));
		} else {
			const byDates = new Map<string, NormalizedRow<T>[]>();
			for (const row of list) {
				const k = `${dayNumber(row.start)}:${dayNumber(row.end)}`;
				const cluster = byDates.get(k);
				if (cluster) cluster.push(row);
				else byDates.set(k, [row]);
			}
			clusters.push(...byDates.values());
		}
	}

	return clusters.map((cluster) => makeBar(groupId, cluster, metrics, calendar));
}

function unionClusters<T>(rows: readonly NormalizedRow<T>[], gap: number): NormalizedRow<T>[][] {
	const sorted = [...rows].sort(
		(a, b) => dayNumber(a.start) - dayNumber(b.start) || dayNumber(a.end) - dayNumber(b.end),
	);
	const clusters: NormalizedRow<T>[][] = [];
	let current: NormalizedRow<T>[] = [];
	let currentEnd = Number.NEGATIVE_INFINITY;
	for (const row of sorted) {
		if (current.length > 0 && dayNumber(row.start) <= currentEnd + gap) {
			current.push(row);
			currentEnd = Math.max(currentEnd, dayNumber(row.end));
		} else {
			if (current.length > 0) clusters.push(current);
			current = [row];
			currentEnd = dayNumber(row.end);
		}
	}
	if (current.length > 0) clusters.push(current);
	return clusters;
}

function makeBar<T>(
	groupId: string,
	cluster: NormalizedRow<T>[],
	metrics: readonly ResolvedMetric<T>[],
	calendar: TimeCalendar,
): Bar<T> {
	const inOrder = [...cluster].sort((a, b) => a.index - b.index);
	const first = inOrder[0];
	if (!first) throw new Error('makeBar called with an empty cluster');
	let { start, end } = first;
	for (const row of inOrder) {
		if (dayNumber(row.start) < dayNumber(start)) start = row.start;
		if (dayNumber(row.end) > dayNumber(end)) end = row.end;
	}
	return {
		id: `${groupId}|${first.mergeKey}|${dayNumber(start)}|${dayNumber(end)}`,
		rows: inOrder.map((r) => r.row),
		start,
		end,
		days: inclusiveDays(start, end),
		groupPath: first.path,
		groupLabels: first.labels,
		mergeKey: first.mergeKey,
		year: calendar.yearOf(start).year,
		metrics: metricsFor(inOrder, metrics),
		normalized: inOrder,
	};
}
