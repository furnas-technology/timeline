/** Returns the rendered width of `text` in `font` (a CSS font shorthand), in CSS pixels. */
export type MeasureText = (text: string, font: string) => number;

/**
 * Width of a row-header column, from the original `RowHeaderDetail.calcWidths`: the larger of the `percentile`-th
 * widest label and `maxShare` × the widest label. One very long label is truncated rather than widening the column.
 */
export function columnWidth(textWidths: readonly number[], percentile: number, maxShare: number): number {
	if (textWidths.length === 0) return 0;
	if (textWidths.length === 1) return Math.ceil(textWidths[0] ?? 0);
	const sorted = [...textWidths].sort((a, b) => b - a);
	const index = Math.min(sorted.length - 1, sorted.length - Math.round(sorted.length * (percentile / 100)));
	const atPercentile = sorted[Math.max(0, index)] ?? 0;
	const widest = (sorted[0] ?? 0) * maxShare;
	return Math.ceil(Math.max(atPercentile, widest));
}

/** Shrink `text` with an ellipsis until it fits `maxWidth`. Returns '' if not even one character fits. */
export function fitText(text: string, maxWidth: number, font: string, measure: MeasureText): string {
	if (maxWidth <= 0 || text === '') return '';
	if (measure(text, font) <= maxWidth) return text;
	const ellipsis = '…';
	let lo = 0;
	let hi = text.length;
	while (lo < hi) {
		const mid = Math.ceil((lo + hi) / 2);
		if (measure(text.slice(0, mid) + ellipsis, font) <= maxWidth) lo = mid;
		else hi = mid - 1;
	}
	return lo === 0 ? '' : text.slice(0, lo).trimEnd() + ellipsis;
}

/** Memoise a measurer; canvas `measureText` is comparatively slow and labels repeat a lot. */
export function cachedMeasure(measure: MeasureText): MeasureText {
	const cache = new Map<string, number>();
	return (text, font) => {
		const key = `${font}\u0000${text}`;
		let width = cache.get(key);
		if (width === undefined) {
			width = measure(text, font);
			if (cache.size > 5000) cache.clear();
			cache.set(key, width);
		}
		return width;
	};
}
