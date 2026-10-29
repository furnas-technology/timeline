/** A half-open interval `[lo, hi)` on any numeric axis (days, or fractional months in YoY mode). */
export interface Interval {
	lo: number;
	hi: number;
}

/**
 * Assign each interval to the lowest lane where it does not overlap anything already placed.
 *
 * Processing in start order makes first-fit optimal (it uses the minimum number of lanes). Unlike the original
 * `findOverlappingEvent`, overlap is a true interval test, so an interval that fully contains another is detected.
 *
 * @returns the lane index for each input interval (same order as the input) and the lane count.
 */
export function packLanes(intervals: readonly Interval[]): { lanes: number[]; count: number } {
	const order = intervals.map((_, i) => i);
	order.sort((a, b) => {
		const ia = intervals[a] as Interval;
		const ib = intervals[b] as Interval;
		return ia.lo - ib.lo || ia.hi - ib.hi || a - b;
	});

	const laneEnds: number[] = [];
	const lanes = new Array<number>(intervals.length).fill(0);
	for (const i of order) {
		const interval = intervals[i] as Interval;
		let lane = laneEnds.findIndex((end) => end <= interval.lo);
		if (lane === -1) {
			lane = laneEnds.length;
			laneEnds.push(interval.hi);
		} else {
			laneEnds[lane] = interval.hi;
		}
		lanes[i] = lane;
	}
	return { lanes, count: laneEnds.length };
}
