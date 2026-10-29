// @vitest-environment jsdom
import { createCanvas } from '@napi-rs/canvas';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { TimelineConfig } from '../src/config';
import type { BarLayout } from '../src/layout/types';
import { Timeline } from '../src/timeline';

interface Row {
	id: string;
	group: string;
	start: string;
	end: string;
	cost: number;
}

const rows: Row[] = [
	{ id: '1', group: 'A', start: '2024-01-08', end: '2024-01-21', cost: 1000 },
	{ id: '2', group: 'B', start: '2024-03-04', end: '2024-03-17', cost: 2000 },
	{ id: '3', group: 'B', start: '2024-06-03', end: '2024-06-16', cost: 3000 },
];

const config: TimelineConfig<Row> = {
	start: (r) => r.start,
	end: (r) => r.end,
	rowId: (r) => r.id,
	groupBy: [{ key: (r) => r.group, subtotal: true }],
	metrics: [{ id: 'cost', label: 'Cost', value: (r) => r.cost }],
	totals: { grand: true },
	zone: 'UTC',
};

beforeAll(() => {
	// jsdom has no canvas implementation; back each element with a node canvas context.
	const contexts = new WeakMap<HTMLCanvasElement, unknown>();
	HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement) {
		let ctx = contexts.get(this);
		if (!ctx) {
			ctx = createCanvas(2000, 2000).getContext('2d');
			contexts.set(this, ctx);
		}
		return ctx;
	} as unknown as HTMLCanvasElement['getContext'];
});

let mounted: Timeline<Row>[] = [];
afterEach(() => {
	for (const t of mounted) t.destroy();
	mounted = [];
	document.body.innerHTML = '';
});

function mount(extra: Partial<TimelineConfig<Row>> = {}): Timeline<Row> {
	const host = document.createElement('div');
	document.body.append(host);
	const t = new Timeline(host, { ...config, ...extra }, rows);
	mounted.push(t);
	return t;
}

function pointer(target: Element, type: string, x: number, y: number): void {
	target.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, pointerId: 1, button: 0, bubbles: true }));
}

const center = (b: BarLayout<Row>) => ({ x: b.rect.x + b.rect.width / 2, y: b.rect.y + b.rect.height / 2 });

describe('Timeline', () => {
	it('mounts a canvas, tooltip and badge into the container and renders synchronously', () => {
		const t = mount();
		expect(t.element.querySelector('canvas')).toBe(t.canvas);
		expect(t.element.querySelectorAll('div')).toHaveLength(2);
		const layout = t.getLayout();
		expect(layout?.bars).toHaveLength(3);
		expect(t.canvas.style.height).toBe(`${layout?.height}px`);
		expect(t.canvas.getAttribute('aria-label')).toContain('3 bars');
	});

	it('navigates by month and reports view changes', () => {
		const t = mount({ view: { months: 2 } });
		const views: number[] = [];
		t.on('viewchange', (v) => views.push(v.offset));
		t.next();
		t.render();
		expect(t.getViewState()?.offset).toBe(1);
		t.last();
		t.render();
		expect(t.getViewState()?.offset).toBe(4);
		expect(t.getViewState()?.canGoForward).toBe(false);
		t.first();
		t.render();
		expect(views).toEqual([1, 4, 0]);
		t.setVisibleMonths('all');
		t.render();
		expect(t.getViewState()?.months).toBe(6);
	});

	it('emits click with the bar rows', () => {
		const t = mount();
		const onClick = vi.fn();
		t.on('click', onClick);
		const bar = t.getLayout()?.bars[0];
		if (!bar) throw new Error('no bar');
		const { x, y } = center(bar);
		pointer(t.canvas, 'pointerdown', x, y);
		pointer(t.canvas, 'pointerup', x, y);
		expect(onClick).toHaveBeenCalledOnce();
		expect(onClick.mock.calls[0]?.[0].rows.map((r: Row) => r.id)).toEqual(['1']);
	});

	it('shows a text-only tooltip on hover', () => {
		const t = mount({ tooltip: (bar) => `<b>${bar.groupLabels[0]}</b>` });
		const bar = t.getLayout()?.bars[0];
		if (!bar) throw new Error('no bar');
		const { x, y } = center(bar);
		pointer(t.canvas, 'pointermove', x, y);
		const tip = t.element.querySelector('.ft-timeline-tooltip') as HTMLElement;
		expect(tip.style.visibility).toBe('visible');
		expect(tip.textContent).toBe('<b>A</b>');
		expect(tip.querySelector('b')).toBeNull();
	});

	it('drags a bar by whole days and keeps it when the move is accepted', async () => {
		const t = mount({ editable: true });
		const moves: number[] = [];
		t.on('move', (e) => {
			moves.push(e.deltaDays);
			expect(e.newStart.toISODate()).toBe('2024-01-15');
			return Promise.resolve(true);
		});
		const layout = t.getLayout();
		const bar = layout?.bars.find((b) => b.bar.rows[0]?.id === '1');
		if (!layout || !bar) throw new Error('no bar');
		const { x, y } = center(bar);
		pointer(t.canvas, 'pointerdown', x, y);
		pointer(t.canvas, 'pointermove', x + layout.dayWidth * 7, y);
		pointer(t.canvas, 'pointerup', x + layout.dayWidth * 7, y);
		await vi.waitFor(() => expect(moves).toEqual([7]));
	});

	it('reverts a rejected move and clamps to the view', async () => {
		const t = mount({ editable: true });
		const moves: number[] = [];
		t.on('move', (e) => {
			moves.push(e.deltaDays);
			return false;
		});
		const layout = t.getLayout();
		const bar = layout?.bars.find((b) => b.bar.rows[0]?.id === '1');
		if (!layout || !bar) throw new Error('no bar');
		const { x, y } = center(bar);
		pointer(t.canvas, 'pointerdown', x, y);
		pointer(t.canvas, 'pointermove', x - layout.dayWidth * 60, y);
		pointer(t.canvas, 'pointerup', x - layout.dayWidth * 60, y);
		// Bar 1 starts on 8 Jan; the view starts on 1 Jan, so it can move back at most 7 days.
		await vi.waitFor(() => expect(moves).toEqual([-7]));
	});

	it('sets totals depth like the original totals toggle', () => {
		const t = mount();
		t.setTotalsDepth('none');
		t.render();
		expect(t.getLayout()?.grandTotal).toBeNull();
		t.setTotalsDepth(0);
		t.render();
		expect(t.getLayout()?.grandTotal).not.toBeNull();
		expect(t.getLayout()?.root.children.every((g) => g.total === null)).toBe(true);
	});

	it('zooms and resets the scale', () => {
		const t = mount();
		const h = t.getLayout()?.height ?? 0;
		t.zoom(1.5);
		t.render();
		expect(t.getLayout()?.height).toBeGreaterThan(h);
		t.zoom('reset');
		t.render();
		expect(t.getLayout()?.height).toBe(h);
	});

	it('expands and fits the width', () => {
		const t = mount();
		const w = t.getLayout()?.width ?? 0;
		t.expandWidth(2);
		t.render();
		expect(t.getLayout()?.width).toBe(w * 2);
		t.fitWidth();
		t.render();
		expect(t.getLayout()?.width).toBe(w);
	});

	it('destroy removes the element and stops events', () => {
		const t = mount();
		const onClick = vi.fn();
		t.on('click', onClick);
		const canvas = t.canvas;
		t.destroy();
		expect(document.querySelector('.ft-timeline')).toBeNull();
		pointer(canvas, 'pointerdown', 1, 1);
		expect(onClick).not.toHaveBeenCalled();
	});
});
