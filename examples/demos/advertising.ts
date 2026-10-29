import { type FlightVehicle, generateFlightVehicles } from '../../test/fixtures/flightVehicles';
import { defineDemo, shiftIso } from './types';

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const groupColors: Record<string, string> = { Broadcast: '#4e79a7', Digital: '#59a14f', 'Out of Home': '#f28e2b' };
const byCost = (a: { metrics: Record<string, number | null> }, b: { metrics: Record<string, number | null> }) =>
	(b.metrics.cost ?? 0) - (a.metrics.cost ?? 0);

export const advertisingDemo = defineDemo<FlightVehicle>({
	id: 'advertising',
	title: 'Advertising plan',
	summary:
		'An 18-month media plan: flights of each vehicle grouped by media group and media type. Cost is spread across ' +
		'broadcast months by days, so monthly totals show when the money is spent.',
	tips: [
		'Totals: switch between "+ Media group" and "+ Media type" sub-totals.',
		'Turn on Editable and drag a flight — it snaps to whole days and the totals update.',
		'Merge overlapping joins back-to-back flights of a vehicle into one bar.',
	],
	source: null,
	rows: generateFlightVehicles({ start: '2025-01-01', months: 18 }),
	config: {
		start: (r) => r.startDate,
		end: (r) => r.endDate,
		rowId: (r) => r.id,
		metrics: [
			{
				id: 'cost',
				label: 'Cost',
				value: (r) => r.cost,
				format: (n) => usd.format(n),
				formatPeriod: (n) => `$${compact.format(n)}`,
			},
			{ id: 'impressions', label: 'Impressions', value: (r) => r.impressions, format: (n) => compact.format(n) },
		],
		totals: { grand: true, metrics: ['cost'] },
		bars: {
			label: (bar, m) => [
				m.cost == null ? '' : usd.format(m.cost),
				m.impressions == null ? '' : `${compact.format(m.impressions)} imps`,
				bar.rows.length > 1 ? `${bar.rows.length} flights` : '',
			],
			color: (bar) => groupColors[bar.groupPath[0] ?? ''] ?? '#888',
		},
		calendar: 'broadcast',
		zone: 'UTC',
	},
	presets: [
		{
			label: 'Media group › Media type › Vehicle',
			levels: ['Media group', 'Media type'],
			totalsDepth: 2,
			groupBy: [{ key: (r) => r.mediaGroup }, { key: (r) => r.mediaType }, { key: (r) => r.vehicle, sort: byCost }],
		},
		{
			label: 'Media type › Vehicle (by spend)',
			levels: ['Media type'],
			totalsDepth: 1,
			groupBy: [
				{ key: (r) => r.mediaType, sort: byCost },
				{ key: (r) => r.vehicle, sort: byCost },
			],
		},
		{
			label: 'Vehicle only (by spend)',
			levels: [],
			totalsDepth: 0,
			groupBy: [{ key: (r) => r.vehicle, sort: byCost }],
		},
	],
	shift: (r, days) => ({ ...r, startDate: shiftIso(r.startDate, days), endDate: shiftIso(r.endDate, days) }),
	calendars: [
		{ label: 'Broadcast calendar', value: 'broadcast' },
		{ label: 'Gregorian calendar', value: 'gregorian' },
	],
});
