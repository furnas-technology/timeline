/**
 * Synthetic media-plan rows shaped like the original InPlan "flight vehicles". Deterministic (seeded) so tests and
 * the demo are reproducible. No real client data.
 */
export interface FlightVehicle {
	id: string;
	mediaGroup: string;
	mediaType: string;
	vehicle: string;
	startDate: string;
	endDate: string;
	cost: number;
	impressions: number;
}

const groups: Record<string, Record<string, string[]>> = {
	Broadcast: {
		'Metro TV': ['Channel 7', 'Channel 9', 'Channel 10'],
		Radio: ['Triple M', 'Nova', 'KIIS'],
	},
	Digital: {
		Search: ['Google Ads', 'Bing Ads'],
		Social: ['Meta', 'TikTok', 'LinkedIn'],
		'Online Video': ['YouTube', 'BVOD'],
	},
	'Out of Home': {
		Billboards: ['Large Format', 'Street Furniture'],
		Transit: ['Airport', 'Rail'],
	},
};

function mulberry32(seed: number): () => number {
	let a = seed;
	return () => {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function isoDate(base: Date, offsetDays: number): string {
	const d = new Date(base.getTime() + offsetDays * 86_400_000);
	return d.toISOString().slice(0, 10);
}

export function generateFlightVehicles(
	options: { seed?: number; start?: string; months?: number } = {},
): FlightVehicle[] {
	const rand = mulberry32(options.seed ?? 42);
	const base = new Date(`${options.start ?? '2024-01-01'}T00:00:00Z`);
	const spanDays = Math.round((options.months ?? 12) * 30.4);
	const rows: FlightVehicle[] = [];
	let n = 0;
	for (const [mediaGroup, types] of Object.entries(groups)) {
		for (const [mediaType, vehicles] of Object.entries(types)) {
			for (const vehicle of vehicles) {
				const flights = 2 + Math.floor(rand() * 4);
				for (let f = 0; f < flights; f++) {
					const startOffset = Math.floor(rand() * (spanDays - 28));
					const length = 7 * (1 + Math.floor(rand() * 8)) - 1;
					rows.push({
						id: `fv-${++n}`,
						mediaGroup,
						mediaType,
						vehicle,
						startDate: isoDate(base, startOffset),
						endDate: isoDate(base, Math.min(spanDays, startOffset + length)),
						cost: Math.round((5_000 + rand() * 95_000) / 100) * 100,
						impressions: Math.round(50_000 + rand() * 2_000_000),
					});
				}
			}
		}
	}
	return rows;
}
