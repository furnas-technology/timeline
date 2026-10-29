import { createFiscalCalendar, type GroupInfo } from '../../src/index';
import contracts from '../data/commerce-contracts.json';
import { defineDemo } from './types';

export interface Contract {
	id: string;
	agency: string;
	recipient: string;
	start: string;
	end: string;
	amount: number;
	type: string;
	description: string;
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const compactUsd = new Intl.NumberFormat('en-US', {
	style: 'currency',
	currency: 'USD',
	notation: 'compact',
	maximumFractionDigits: 1,
});
const periodUsd = new Intl.NumberFormat('en-US', {
	style: 'currency',
	currency: 'USD',
	notation: 'compact',
	maximumFractionDigits: 0,
});
const agencyColors: Record<string, string> = {
	NOAA: '#1971c2',
	USPTO: '#2f9e44',
	'Census Bureau': '#e8590c',
	NIST: '#9c36b5',
	'Office of the Secretary': '#868e96',
};
const byAmount = (a: GroupInfo<Contract>, b: GroupInfo<Contract>) => (b.metrics.amount ?? 0) - (a.metrics.amount ?? 0);

const usFederal = createFiscalCalendar({ startMonth: 10 });

export const contractsDemo = defineDemo<Contract>({
	id: 'contracts',
	title: 'Federal contracts',
	summary:
		'The largest U.S. Department of Commerce contracts active in fiscal year 2025, from USAspending.gov, drawn over ' +
		'their period of performance. Each award is spread across months by day, so monthly totals approximate the ' +
		'spending profile per agency. Shown on the federal fiscal year (October–September) via a custom calendar.',
	tips: [
		'The year row reads FY2024, FY2025… — a pluggable TimeCalendar (createFiscalCalendar({ startMonth: 10 })).',
		'Year over year on the fiscal calendar runs October → September.',
		'Hover a bar for the award description (rendered as text, never HTML).',
	],
	source: {
		label: 'USAspending.gov — Award search API (Department of Commerce contracts, FY2025)',
		url: 'https://www.usaspending.gov/search',
		license: 'Public domain (U.S. Government work)',
	},
	rows: contracts as Contract[],
	config: {
		start: (r) => r.start,
		end: (r) => r.end,
		rowId: (r) => r.id,
		metrics: [
			{
				id: 'amount',
				label: 'Obligated',
				value: (r) => r.amount,
				format: (n) => compactUsd.format(n),
				formatPeriod: (n) => periodUsd.format(n),
			},
			{ id: 'count', label: 'Contracts', value: () => 1, aggregate: 'count', allocate: 'start' },
		],
		totals: { grand: true, metrics: ['amount'] },
		bars: {
			label: (bar, m) => [m.amount == null ? '' : compactUsd.format(m.amount), bar.rows[0]?.type ?? ''],
			color: (bar) => agencyColors[bar.rows[0]?.agency ?? ''] ?? '#888',
		},
		tooltip: (bar, m) => {
			const r = bar.rows[0];
			if (!r) return null;
			const el = document.createElement('div');
			el.style.whiteSpace = 'normal';
			el.style.maxWidth = '360px';
			const title = document.createElement('div');
			title.style.fontWeight = '700';
			title.textContent = r.recipient;
			const meta = document.createElement('div');
			meta.textContent = `${r.agency} · ${r.id} · ${r.start} → ${r.end}`;
			const amount = document.createElement('div');
			amount.textContent = `${usd.format(m.amount ?? 0)} obligated`;
			const desc = document.createElement('div');
			desc.style.cssText = 'margin-top:4px;opacity:0.8;font-size:smaller';
			desc.textContent = r.description;
			el.append(title, meta, amount, desc);
			return el;
		},
		calendar: usFederal,
		zone: 'UTC',
		view: { start: '2024-10-01', months: 12 },
	},
	presets: [
		{
			label: 'Agency › Recipient (by amount)',
			levels: ['Agency', 'Recipient'],
			totalsDepth: 1,
			groupBy: [
				{ key: (r) => r.agency, sort: byAmount },
				{ key: (r) => r.recipient, sort: byAmount },
			],
		},
		{
			label: 'Recipient (by amount)',
			levels: ['Recipient'],
			totalsDepth: 0,
			groupBy: [{ key: (r) => r.recipient, sort: byAmount }],
		},
		{
			label: 'Agency › Contract type',
			levels: ['Agency', 'Type'],
			totalsDepth: 1,
			groupBy: [{ key: (r) => r.agency, sort: byAmount }, { key: (r) => r.type || 'Other' }],
		},
	],
	calendars: [
		{ label: 'US federal FY (Oct–Sep)', value: usFederal },
		{ label: 'Gregorian calendar', value: 'gregorian' },
	],
});
