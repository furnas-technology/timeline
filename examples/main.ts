import { addDays, parseDateInput, Timeline, type TimelineConfig, type ViewState } from '../src/index';
import { type FlightVehicle, generateFlightVehicles } from '../test/fixtures/flightVehicles';

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

let rows: FlightVehicle[] = generateFlightVehicles({ start: '2024-01-01', months: 18 });

const config: TimelineConfig<FlightVehicle> = {
	start: (r) => r.startDate,
	end: (r) => r.endDate,
	rowId: (r) => r.id,
	groupBy: [
		{ key: (r) => r.mediaGroup, subtotal: true },
		{ key: (r) => r.mediaType, subtotal: true },
		{ key: (r) => r.vehicle, sort: (a, b) => (b.metrics.cost ?? 0) - (a.metrics.cost ?? 0) },
	],
	metrics: [
		{ id: 'cost', label: 'Cost', value: (r) => r.cost, format: (n) => currency.format(n) },
		{
			id: 'impressions',
			label: 'Impressions',
			value: (r) => r.impressions,
			format: (n) => compact.format(n),
		},
	],
	totals: { grand: true, metrics: ['cost'] },
	bars: {
		label: (bar, m) => [
			m.cost === null || m.cost === undefined ? '' : currency.format(m.cost),
			m.impressions === null || m.impressions === undefined ? '' : `${compact.format(m.impressions)} imps`,
			bar.rows.length > 1 ? `${bar.rows.length} flights` : '',
		],
		color: (bar) =>
			({ Broadcast: '#4e79a7', Digital: '#59a14f', 'Out of Home': '#f28e2b' })[bar.groupPath[0] ?? ''] ?? '#888',
	},
	calendar: 'broadcast',
	zone: 'UTC',
};

const host = document.getElementById('plan') as HTMLElement;
const timeline = new Timeline(host, config, rows);

// ---- event log --------------------------------------------------------------------------------------------------
const logEl = document.getElementById('log') as HTMLElement;
const log = (message: string) => {
	logEl.textContent = `${new Date().toLocaleTimeString()}  ${message}\n${logEl.textContent ?? ''}`.slice(0, 4000);
};

timeline.on('click', ({ bar }) =>
	log(`click  ${bar.groupLabels.join(' › ')}  ${bar.start.toISODate()} → ${bar.end.toISODate()}`),
);

timeline.on('move', async ({ rows: moved, deltaDays }) => {
	// Simulate saving to a server, then hand the updated rows back to the timeline.
	await new Promise((resolve) => setTimeout(resolve, 150));
	const ids = new Set(moved.map((r) => r.id));
	rows = rows.map((r) =>
		ids.has(r.id)
			? {
					...r,
					startDate: shiftIso(r.startDate, deltaDays),
					endDate: shiftIso(r.endDate, deltaDays),
				}
			: r,
	);
	timeline.setData(rows);
	log(`move   ${moved.length} row(s) by ${deltaDays} day(s)`);
	return true;
});

const status = document.getElementById('status') as HTMLElement;
const onView = (view: ViewState) => {
	status.textContent =
		view.mode === 'yoy'
			? 'Year over year'
			: `${view.start.toFormat('d LLL yyyy')} – ${view.end.toFormat('d LLL yyyy')} (${view.months}/${view.totalMonths} months)`;
	setDisabled('first', !view.canGoBack);
	setDisabled('prev', !view.canGoBack);
	setDisabled('next', !view.canGoForward);
	setDisabled('last', !view.canGoForward);
};
timeline.on('viewchange', onView);
const initialView = timeline.getViewState();
if (initialView) onView(initialView);

function shiftIso(iso: string, days: number): string {
	const date = parseDateInput(iso, 'UTC');
	return date ? (addDays(date, days).toISODate() ?? iso) : iso;
}

function setDisabled(action: string, disabled: boolean) {
	const button = document.querySelector<HTMLButtonElement>(`[data-action="${action}"]`);
	if (button) button.disabled = disabled;
}

// ---- toolbar ----------------------------------------------------------------------------------------------------
const actions: Record<string, () => void> = {
	first: () => timeline.first(),
	prev: () => timeline.prev(),
	today: () => timeline.today(),
	next: () => timeline.next(),
	last: () => timeline.last(),
	zoomIn: () => timeline.zoom(1.15),
	zoomOut: () => timeline.zoom(1 / 1.15),
	zoomReset: () => timeline.zoom('reset'),
	expand: () => timeline.expandWidth(1.25),
	fit: () => timeline.fitWidth(),
	png: () => {
		void timeline.toBlob().then((blob) => {
			const a = document.createElement('a');
			a.href = URL.createObjectURL(blob);
			a.download = 'timeline.png';
			a.click();
			URL.revokeObjectURL(a.href);
		});
	},
};

for (const button of document.querySelectorAll<HTMLButtonElement>('[data-action]')) {
	button.addEventListener('click', () => actions[button.dataset.action ?? '']?.());
}

const toggles: Record<string, (on: boolean) => void> = {
	yoy: (on) => timeline.setMode(on ? 'yoy' : 'continuous'),
	merge: (on) => timeline.setConfig({ bars: { ...timeline.getConfig().bars, mergeOverlapping: on } }),
	editable: (on) => timeline.setConfig({ editable: on }),
};

for (const button of document.querySelectorAll<HTMLButtonElement>('[data-toggle]')) {
	button.addEventListener('click', () => {
		const on = button.getAttribute('aria-pressed') !== 'true';
		button.setAttribute('aria-pressed', String(on));
		toggles[button.dataset.toggle ?? '']?.(on);
	});
}

const select = (id: string) => document.getElementById(id) as HTMLSelectElement;
select('months').addEventListener('change', (e) => {
	const value = (e.target as HTMLSelectElement).value;
	timeline.setVisibleMonths(value === 'all' ? 'all' : Number(value));
});
select('totals').addEventListener('change', (e) =>
	timeline.setTotalsDepth(Number((e.target as HTMLSelectElement).value)),
);
select('lines').addEventListener('change', (e) =>
	timeline.setConfig({ theme: { barLines: Number((e.target as HTMLSelectElement).value) } }),
);
select('calendar').addEventListener('change', (e) =>
	timeline.setConfig({ calendar: (e.target as HTMLSelectElement).value as 'broadcast' | 'gregorian' }),
);
