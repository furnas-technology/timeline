/**
 * Synthetic dance-competition season (fictional competitions, venues and numbers). Each row is one division of one
 * event, so an event's divisions share a bar and can be regrouped by division.
 */
export interface DanceEntry {
	id: string;
	competition: string;
	format: 'Championship' | 'Eisteddfod' | 'Festival';
	region: string;
	city: string;
	event: string;
	division: 'Solo' | 'Duo/Trio' | 'Small group' | 'Large group' | 'Production';
	start: string;
	end: string;
	routines: number;
	dancers: number;
	/** Entry fees in AUD. */
	fees: number;
	/** Average adjudicated score (0–100). */
	avgScore: number;
}

const competitions: { name: string; format: DanceEntry['format']; days: [number, number]; size: number }[] = [
	{ name: 'Starburst Dance Cup', format: 'Championship', days: [3, 3], size: 1.2 },
	{ name: 'Momentum Championships', format: 'Championship', days: [3, 4], size: 1 },
	{ name: 'Encore Dance Challenge', format: 'Festival', days: [2, 3], size: 0.7 },
	{ name: 'Pulse Eisteddfod', format: 'Eisteddfod', days: [7, 14], size: 1.6 },
	{ name: 'Elevate Dance Festival', format: 'Festival', days: [3, 3], size: 0.8 },
];

const regions: Record<string, string[]> = {
	NSW: ['Sydney', 'Newcastle', 'Wollongong'],
	VIC: ['Melbourne', 'Geelong'],
	QLD: ['Brisbane', 'Gold Coast', 'Townsville'],
	WA: ['Perth'],
	SA: ['Adelaide'],
	ACT: ['Canberra'],
};

const divisions: { name: DanceEntry['division']; routines: [number, number]; dancersPer: number; fee: number }[] = [
	{ name: 'Solo', routines: [120, 380], dancersPer: 0.45, fee: 75 },
	{ name: 'Duo/Trio', routines: [40, 140], dancersPer: 1.1, fee: 110 },
	{ name: 'Small group', routines: [25, 90], dancersPer: 2.6, fee: 165 },
	{ name: 'Large group', routines: [8, 36], dancersPer: 6.5, fee: 260 },
	{ name: 'Production', routines: [2, 9], dancersPer: 14, fee: 420 },
];

function mulberry32(seed: number): () => number {
	let a = seed;
	return () => {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);

/** Fridays of the season (dance comps start on a Friday). */
function fridays(year: number): Date[] {
	const out: Date[] = [];
	let d = new Date(Date.UTC(year, 1, 1));
	while (d.getUTCDay() !== 5) d = addDays(d, 1);
	while (d.getUTCMonth() < 11) {
		out.push(d);
		d = addDays(d, 7);
	}
	return out;
}

export function generateDanceSeason(options: { year?: number; seed?: number } = {}): DanceEntry[] {
	const year = options.year ?? 2026;
	const rand = mulberry32(options.seed ?? 7);
	const pick = <T>(list: readonly T[]): T => list[Math.floor(rand() * list.length)] as T;
	const between = (lo: number, hi: number) => Math.round(lo + rand() * (hi - lo));
	const weekends = fridays(year);
	const rows: DanceEntry[] = [];
	let id = 0;

	const addEvent = (
		comp: (typeof competitions)[number],
		region: string,
		city: string,
		start: Date,
		days: number,
		scale: number,
	) => {
		const event = `${comp.name.split(' ')[0]} ${city}`;
		for (const division of divisions) {
			const routines = Math.max(1, Math.round(between(...division.routines) * comp.size * scale));
			rows.push({
				id: `dc-${++id}`,
				competition: comp.name,
				format: comp.format,
				region,
				city,
				event,
				division: division.name,
				start: iso(start),
				end: iso(addDays(start, days - 1)),
				routines,
				dancers: Math.round(routines * division.dancersPer * (0.85 + rand() * 0.3)),
				fees: routines * division.fee,
				avgScore: Math.round((82 + rand() * 12) * 10) / 10,
			});
		}
	};

	for (const comp of competitions) {
		// Each competition tours a subset of regions, one or two cities each.
		for (const [region, cities] of Object.entries(regions)) {
			if (rand() < 0.3) continue;
			const visits = Math.min(cities.length, 1 + Math.floor(rand() * 2));
			for (let v = 0; v < visits; v++) {
				const city = cities[v] as string;
				const start = pick(weekends.slice(0, -4));
				addEvent(comp, region, city, start, between(...comp.days), region === 'NSW' || region === 'VIC' ? 1.2 : 0.8);
			}
		}
		// National finals in early December.
		const finals = new Date(Date.UTC(year, 11, 4 + Math.floor(rand() * 3)));
		addEvent(comp, 'National finals', 'Gold Coast', finals, comp.format === 'Eisteddfod' ? 6 : 5, 1.4);
	}
	return rows;
}
