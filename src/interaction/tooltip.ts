import type { ResolvedMetric } from '../layout/aggregate';
import type { Bar, Rect } from '../layout/types';
import type { Theme } from '../render/theme';

/** Default tooltip: group path, dates, row count and every metric. Built with DOM nodes — no HTML injection. */
export function defaultTooltip<T>(
	bar: Bar<T>,
	metrics: readonly ResolvedMetric<T>[],
	locale: string,
	doc: Document,
): HTMLElement {
	const root = doc.createElement('div');
	const title = doc.createElement('div');
	title.style.fontWeight = '700';
	title.textContent = bar.groupLabels.join(' › ') || 'Item';
	if (bar.rows.length > 1) {
		const count = doc.createElement('span');
		count.style.cssText = 'font-weight:400;margin-left:6px;opacity:0.7;font-size:smaller';
		count.textContent = `(${bar.rows.length} rows)`;
		title.append(count);
	}
	root.append(title);

	const dates = doc.createElement('div');
	const fmt = (d: Bar<T>['start']) => d.setLocale(locale).toFormat('d LLL yyyy');
	dates.textContent = `${fmt(bar.start)} – ${fmt(bar.end)} (${bar.days} days)`;
	root.append(dates);

	for (const metric of metrics) {
		const value = bar.metrics[metric.id];
		if (value === null || value === undefined) continue;
		const line = doc.createElement('div');
		line.textContent = `${metric.label}: ${metric.format(value)}`;
		root.append(line);
	}
	return root;
}

export function styleFloating(el: HTMLElement, theme: Theme, font: string): void {
	const c = theme.colors;
	Object.assign(el.style, {
		position: 'absolute',
		top: '0px',
		left: '0px',
		zIndex: '20',
		pointerEvents: 'none',
		visibility: 'hidden',
		background: c.tooltipBackground,
		color: c.tooltipText,
		border: `1px solid ${c.tooltipBorder}`,
		borderRadius: '6px',
		boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
		padding: '6px 8px',
		font,
		whiteSpace: 'nowrap',
		maxWidth: '420px',
	} satisfies Partial<CSSStyleDeclaration>);
}

/**
 * Position a floating element next to a bar, inside the visible part of a horizontally scrolling wrapper
 * (the original `getTooltipPosition`): left-aligned to the bar when the bar is in the left half of the viewport,
 * right-aligned otherwise; below the bar when there is room, else above.
 */
export function positionFloating(
	el: HTMLElement,
	bar: Rect,
	viewport: { scrollLeft: number; width: number },
	contentHeight: number,
	gap: number,
): void {
	const w = el.offsetWidth;
	const h = el.offsetHeight;
	const minX = viewport.scrollLeft + gap;
	const maxX = viewport.scrollLeft + viewport.width - w - gap;
	const mid = bar.x + bar.width / 2;
	let x = mid < viewport.scrollLeft + viewport.width / 2 ? bar.x : bar.x + bar.width - w;
	x = Math.max(minX, Math.min(x, maxX));
	let y = bar.y + bar.height + gap;
	if (y + h > contentHeight && bar.y - gap - h >= 0) y = bar.y - gap - h;
	el.style.left = `${Math.round(x)}px`;
	el.style.top = `${Math.round(y)}px`;
}
