import type { GroupInfo } from '../../src/index';
import storms from '../data/atlantic-hurricanes.json';
import { defineDemo, earliest } from './types';

export interface Storm {
	id: string;
	name: string;
	year: number;
	start: string;
	end: string;
	peak: string;
	maxWind: number;
	minPressure: number | null;
	ace: number;
	landfalls: number;
}

/** Saffir–Simpson colours, strongest first. */
const categories: [string, string][] = [
	['Category 5', '#c0392b'],
	['Category 4', '#e8590c'],
	['Category 3', '#f59f00'],
	['Category 2', '#fcc419'],
	['Category 1', '#ffe066'],
	['Tropical storm', '#66d9e8'],
	['Tropical depression', '#a5d8ff'],
];
const categoryRank = new Map(categories.map(([c], i) => [c, i]));
const categoryColor = new Map(categories);
const int = new Intl.NumberFormat('en-US');

const byIntensity = (a: GroupInfo<Storm>, b: GroupInfo<Storm>) =>
	(categoryRank.get(a.key) ?? 99) - (categoryRank.get(b.key) ?? 99);
const chronological = (a: GroupInfo<Storm>, b: GroupInfo<Storm>) =>
	earliest(a.rows, (r) => r.start).localeCompare(earliest(b.rows, (r) => r.start));

export const hurricaneDemo = defineDemo<Storm>({
	id: 'hurricanes',
	title: 'Atlantic hurricanes',
	summary:
		'Every Atlantic tropical cyclone of the 2015–2025 seasons from NOAA’s HURDAT2 best-track database: the tropical ' +
		'lifespan of each storm, its peak Saffir–Simpson category, maximum wind, minimum pressure and accumulated ' +
		'cyclone energy (ACE).',
	tips: [
		'Choose "Peak category (storms packed)" and turn on Year over year to overlay eleven seasons, coloured by year.',
		'Totals use different aggregates: storms (count), ACE (sum, spread by day), peak wind (max).',
		'Group by "Season › Peak category" and choose "+ Season" totals for a season-by-season summary.',
	],
	source: {
		label: 'NOAA National Hurricane Center — HURDAT2 (Atlantic, 1851–2025)',
		url: 'https://www.nhc.noaa.gov/data/#hurdat',
		license: 'Public domain (U.S. Government work)',
	},
	rows: storms as Storm[],
	config: {
		start: (r) => r.start,
		end: (r) => r.end,
		rowId: (r) => r.id,
		metrics: [
			{ id: 'storms', label: 'Storms', value: () => 1, aggregate: 'count', allocate: 'start' },
			{ id: 'ace', label: 'ACE', value: (r) => r.ace, format: (n) => n.toFixed(1) },
			{ id: 'wind', label: 'Peak wind', value: (r) => r.maxWind, aggregate: 'max', format: (n) => `${n} kt` },
			{
				id: 'pressure',
				label: 'Min pressure',
				value: (r) => r.minPressure,
				aggregate: 'min',
				allocate: 'none',
				format: (n) => `${n} mb`,
			},
			{
				id: 'landfalls',
				label: 'Landfalls',
				value: (r) => r.landfalls,
				allocate: 'start',
				format: (n) => int.format(n),
			},
		],
		totals: { grand: true, metrics: ['storms', 'ace', 'wind'] },
		bars: {
			label: (bar, m) => [
				bar.rows.map((r) => r.name).join(', '),
				`${m.wind ?? '–'} kt · ${m.pressure ?? '–'} mb`,
				`ACE ${m.ace?.toFixed(1) ?? '–'}`,
			],
			color: (bar) => categoryColor.get(bar.rows[0]?.peak ?? '') ?? '#999',
		},
		calendar: 'gregorian',
		zone: 'UTC',
		view: { start: '2025-06-01', months: 6 },
	},
	presets: [
		{
			label: 'Peak category › Storm',
			levels: ['Category'],
			totalsDepth: 1,
			groupBy: [
				{ key: (r) => r.peak, sort: byIntensity },
				{ key: (r) => r.id, label: (r) => `${r.name} (${r.year})`, sort: chronological },
			],
		},
		{
			label: 'Peak category (storms packed into lanes)',
			levels: ['Category'],
			totalsDepth: 1,
			groupBy: [{ key: (r) => r.peak, sort: byIntensity }],
		},
		{
			label: 'Season › Peak category',
			levels: ['Season', 'Category'],
			totalsDepth: 1,
			groupBy: [
				{ key: (r) => r.year, sort: 'desc' },
				{ key: (r) => r.peak, sort: byIntensity },
			],
		},
		{
			label: 'Season › Storm',
			levels: ['Season'],
			totalsDepth: 1,
			groupBy: [
				{ key: (r) => r.year, sort: 'desc' },
				{ key: (r) => r.id, label: (r) => r.name, sort: chronological },
			],
		},
	],
	calendars: [
		{ label: 'Gregorian calendar', value: 'gregorian' },
		{ label: 'Broadcast calendar', value: 'broadcast' },
	],
});
