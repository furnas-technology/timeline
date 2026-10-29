import { advertisingDemo } from './demos/advertising';
import { contractsDemo } from './demos/contracts';
import { danceDemo } from './demos/dance';
import { hurricaneDemo } from './demos/hurricanes';
import type { Demo, DemoHandle } from './demos/types';

const demos: Demo[] = [danceDemo, advertisingDemo, hurricaneDemo, contractsDemo];

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const host = $<HTMLDivElement>('plan');
const logEl = $<HTMLDivElement>('log');
const status = $<HTMLSpanElement>('status');
const presetSelect = $<HTMLSelectElement>('preset');
const totalsSelect = $<HTMLSelectElement>('totals');
const calendarSelect = $<HTMLSelectElement>('calendar');
const monthsSelect = $<HTMLSelectElement>('months');
const linesSelect = $<HTMLSelectElement>('lines');

let current: DemoHandle | null = null;

// ---- tabs -------------------------------------------------------------------------------------------------------
const tabs = $<HTMLElement>('tabs');
for (const demo of demos) {
	const button = document.createElement('button');
	button.textContent = demo.title;
	button.dataset.demo = demo.id;
	button.addEventListener('click', () => {
		location.hash = demo.id;
	});
	tabs.append(button);
}
window.addEventListener('hashchange', () => show(location.hash.slice(1)));

function show(id: string): void {
	const demo = demos.find((d) => d.id === id) ?? (demos[0] as Demo);
	current?.destroy();
	logEl.textContent = '';
	for (const b of tabs.querySelectorAll<HTMLButtonElement>('button')) {
		b.setAttribute('aria-pressed', String(b.dataset.demo === demo.id));
	}

	// About panel
	$('summary').textContent = demo.summary;
	$('tips').replaceChildren(
		...demo.tips.map((tip) => {
			const li = document.createElement('li');
			li.textContent = tip;
			return li;
		}),
	);
	const source = $('source');
	source.replaceChildren();
	if (demo.source) {
		const a = document.createElement('a');
		a.href = demo.source.url;
		a.target = '_blank';
		a.rel = 'noopener';
		a.textContent = demo.source.label;
		source.append('Data: ', a, ` — ${demo.source.license}.`);
	} else {
		source.textContent = 'Data: synthetic, generated in the browser (fictional names and figures).';
	}

	// Reset toolbar state
	for (const b of document.querySelectorAll<HTMLButtonElement>('[data-toggle]'))
		b.setAttribute('aria-pressed', 'false');
	linesSelect.value = '1';
	setOptions(
		calendarSelect,
		demo.calendars.map((c) => c.label),
	);

	const handle = demo.mount(host);
	current = handle;
	setOptions(
		presetSelect,
		handle.presets.map((p) => p.label),
	);
	fillTotals(0);
	const editable = document.querySelector<HTMLButtonElement>('[data-toggle="editable"]');
	if (editable) {
		editable.disabled = !handle.canEdit;
		editable.title = handle.canEdit ? 'Drag bars to move them' : 'Moving is not meaningful for this dataset';
	}

	handle.onLog((message) => {
		logEl.textContent = `${new Date().toLocaleTimeString()}  ${message}\n${logEl.textContent ?? ''}`.slice(0, 4000);
	});
	handle.onView((view) => {
		const yoy = view.mode === 'yoy';
		status.textContent = yoy
			? 'Year over year'
			: `${view.start.toFormat('d LLL yyyy')} – ${view.end.toFormat('d LLL yyyy')} · ${view.months} of ${view.totalMonths} months`;
		setDisabled('first', yoy || !view.canGoBack);
		setDisabled('prev', yoy || !view.canGoBack);
		setDisabled('next', yoy || !view.canGoForward);
		setDisabled('last', yoy || !view.canGoForward);
		setDisabled('today', yoy);
		monthsSelect.disabled = yoy;
		const visible = String(view.months);
		if (view.months === view.totalMonths) monthsSelect.value = 'all';
		else if ([...monthsSelect.options].some((o) => o.value === visible)) monthsSelect.value = visible;
	});
}

function fillTotals(presetIndex: number): void {
	const preset = current?.presets[presetIndex];
	if (!preset) return;
	const labels = ['No totals', 'Grand total only', ...preset.levels.map((l) => `+ ${l} sub-totals`)];
	setOptions(totalsSelect, labels, preset.totalsDepth + 1);
}

function setOptions(select: HTMLSelectElement, labels: readonly string[], selected = 0): void {
	select.replaceChildren(
		...labels.map((label, i) => {
			const option = document.createElement('option');
			option.value = String(i);
			option.textContent = label;
			return option;
		}),
	);
	select.value = String(selected);
}

function setDisabled(action: string, disabled: boolean): void {
	const button = document.querySelector<HTMLButtonElement>(`[data-action="${action}"]`);
	if (button) button.disabled = disabled;
}

// ---- toolbar ----------------------------------------------------------------------------------------------------
const actions: Record<string, (h: DemoHandle) => void> = {
	first: (h) => h.timeline.first(),
	prev: (h) => h.timeline.prev(),
	today: (h) => h.timeline.today(),
	next: (h) => h.timeline.next(),
	last: (h) => h.timeline.last(),
	zoomIn: (h) => h.timeline.zoom(1.15),
	zoomOut: (h) => h.timeline.zoom(1 / 1.15),
	zoomReset: (h) => h.timeline.zoom('reset'),
	expand: (h) => h.timeline.expandWidth(1.25),
	fit: (h) => h.timeline.fitWidth(),
	png: (h) => {
		void h.timeline.toBlob().then((blob) => {
			const a = document.createElement('a');
			a.href = URL.createObjectURL(blob);
			a.download = 'timeline.png';
			a.click();
			URL.revokeObjectURL(a.href);
		});
	},
};
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-action]')) {
	button.addEventListener('click', () => {
		if (current) actions[button.dataset.action ?? '']?.(current);
	});
}

const toggles: Record<string, (h: DemoHandle, on: boolean) => void> = {
	yoy: (h, on) => h.timeline.setMode(on ? 'yoy' : 'continuous'),
	merge: (h, on) => h.setMerge(on),
	editable: (h, on) => h.setEditable(on),
};
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-toggle]')) {
	button.addEventListener('click', () => {
		if (!current) return;
		const on = button.getAttribute('aria-pressed') !== 'true';
		button.setAttribute('aria-pressed', String(on));
		toggles[button.dataset.toggle ?? '']?.(current, on);
	});
}

presetSelect.addEventListener('change', () => {
	const index = Number(presetSelect.value);
	current?.applyPreset(index);
	fillTotals(index);
});
totalsSelect.addEventListener('change', () => current?.timeline.setTotalsDepth(Number(totalsSelect.value) - 1));
monthsSelect.addEventListener('change', () =>
	current?.timeline.setVisibleMonths(monthsSelect.value === 'all' ? 'all' : Number(monthsSelect.value)),
);
linesSelect.addEventListener('change', () => current?.setBarLines(Number(linesSelect.value)));
calendarSelect.addEventListener('change', () => current?.setCalendar(Number(calendarSelect.value)));

show(location.hash.slice(1));
