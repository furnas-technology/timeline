import { createFiscalCalendar, type GroupInfo } from '../../src/index';
import { type DanceEntry, generateDanceSeason } from '../data/danceCompetitions';
import { defineDemo, earliest, shiftIso } from './types';

const aud = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 });
const audCompact = new Intl.NumberFormat('en-AU', {
	style: 'currency',
	currency: 'AUD',
	notation: 'compact',
	maximumFractionDigits: 1,
});
const int = new Intl.NumberFormat('en-AU');
const compColors: Record<string, string> = {
	'Starburst Dance Cup': '#e15759',
	'Momentum Championships': '#4e79a7',
	'Encore Dance Challenge': '#59a14f',
	'Pulse Eisteddfod': '#b07aa1',
	'Elevate Dance Festival': '#f28e2b',
};
const divisionOrder = ['Solo', 'Duo/Trio', 'Small group', 'Large group', 'Production'];

const byRoutines = (a: GroupInfo<DanceEntry>, b: GroupInfo<DanceEntry>) =>
	(b.metrics.routines ?? 0) - (a.metrics.routines ?? 0);
/** States by size, national finals last. */
const regionSort = (a: GroupInfo<DanceEntry>, b: GroupInfo<DanceEntry>) =>
	Number(a.key === 'National finals') - Number(b.key === 'National finals') || byRoutines(a, b);
const chronological = (a: GroupInfo<DanceEntry>, b: GroupInfo<DanceEntry>) =>
	earliest(a.rows, (r) => r.start).localeCompare(earliest(b.rows, (r) => r.start));

export const danceDemo = defineDemo<DanceEntry>({
	id: 'dance',
	title: 'Dance competitions',
	summary:
		'A fictional Australian competition season: five competitions touring the states, then national finals in ' +
		'December. Each event has five divisions (solo to production), so one bar holds every division of an event ' +
		'and regrouping by division gives season totals per division.',
	tips: [
		'Group by "Competition › Division" to compare solo vs group entries across the season.',
		'Turn on Editable and drag an event to another weekend.',
		'Totals show routines (sum), dancers, entry fees and the average score — avg is computed from raw rows.',
	],
	source: null,
	rows: generateDanceSeason({ year: 2026 }),
	config: {
		start: (r) => r.start,
		end: (r) => r.end,
		rowId: (r) => r.id,
		metrics: [
			{ id: 'routines', label: 'Routines', value: (r) => r.routines, format: (n) => int.format(Math.round(n)) },
			{ id: 'dancers', label: 'Dancers', value: (r) => r.dancers, format: (n) => int.format(Math.round(n)) },
			{
				id: 'fees',
				label: 'Entry fees',
				value: (r) => r.fees,
				format: (n) => aud.format(n),
				formatPeriod: (n) => audCompact.format(n),
			},
			{
				id: 'score',
				label: 'Avg score',
				value: (r) => r.avgScore,
				aggregate: 'avg',
				allocate: 'none',
				format: (n) => n.toFixed(1),
			},
		],
		totals: { grand: true, metrics: ['routines', 'fees'] },
		bars: {
			label: (_bar, m) => [
				`${int.format(m.routines ?? 0)} routines`,
				m.fees == null ? '' : aud.format(m.fees),
				`${int.format(m.dancers ?? 0)} dancers · ${m.score?.toFixed(1) ?? '–'} avg`,
			],
			color: (bar) => compColors[bar.rows[0]?.competition ?? ''] ?? '#888',
		},
		calendar: 'gregorian',
		zone: 'Australia/Sydney',
		locale: 'en-AU',
		view: { start: '2026-02-01', months: 4 },
	},
	presets: [
		{
			label: 'Region › Competition › Event',
			levels: ['Region', 'Competition'],
			totalsDepth: 1,
			groupBy: [
				{ key: (r) => r.region, sort: regionSort },
				{ key: (r) => r.competition },
				{ key: (r) => r.event, sort: chronological },
			],
		},
		{
			label: 'Competition › Region › Event',
			levels: ['Competition', 'Region'],
			totalsDepth: 1,
			groupBy: [
				{ key: (r) => r.competition, sort: byRoutines },
				{ key: (r) => r.region, sort: regionSort },
				{ key: (r) => r.event, sort: chronological },
			],
		},
		{
			label: 'Competition › Division',
			levels: ['Competition', 'Division'],
			totalsDepth: 1,
			groupBy: [
				{ key: (r) => r.competition, sort: byRoutines },
				{ key: (r) => r.division, sort: (a, b) => divisionOrder.indexOf(a.key) - divisionOrder.indexOf(b.key) },
			],
		},
		{
			label: 'Format › Competition',
			levels: ['Format', 'Competition'],
			totalsDepth: 1,
			groupBy: [{ key: (r) => r.format }, { key: (r) => r.competition, sort: byRoutines }],
		},
	],
	shift: (r, days) => ({ ...r, start: shiftIso(r.start, days), end: shiftIso(r.end, days) }),
	calendars: [
		{ label: 'Gregorian calendar', value: 'gregorian' },
		{ label: 'Australian FY (Jul–Jun)', value: createFiscalCalendar({ startMonth: 7, locale: 'en-AU' }) },
		{ label: 'Broadcast calendar', value: 'broadcast' },
	],
});
