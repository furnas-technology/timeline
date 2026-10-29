import { type CalendarOption, type GroupLevel, Timeline, type TimelineConfig, type ViewState } from '../../src/index';

/** One way of grouping a dataset, selectable from the toolbar. */
export interface DemoPreset<T> {
	label: string;
	/** Heading of each level, used to label the totals-depth options. */
	levels: string[];
	groupBy: GroupLevel<T>[];
	/** Initial sub-total depth for this preset (see `Timeline.setTotalsDepth`). */
	totalsDepth: number;
}

export interface DemoDefinition<T> {
	id: string;
	title: string;
	summary: string;
	/** What to try in this demo. */
	tips: string[];
	source: { label: string; url: string; license: string } | null;
	rows: T[];
	config: Omit<TimelineConfig<T>, 'groupBy'>;
	presets: DemoPreset<T>[];
	/** Returns the row moved by `days`; enables the Editable toggle. */
	shift?: (row: T, days: number) => T;
	/** Calendar choices offered in the toolbar for this dataset. */
	calendars: { label: string; value: CalendarOption }[];
}

/** The part of a mounted demo the shared toolbar drives — no row type involved. */
export interface DemoHandle {
	readonly timeline: Pick<
		Timeline<unknown>,
		| 'first'
		| 'prev'
		| 'next'
		| 'last'
		| 'today'
		| 'setVisibleMonths'
		| 'setMode'
		| 'zoom'
		| 'expandWidth'
		| 'fitWidth'
		| 'setTotalsDepth'
		| 'getViewState'
		| 'toBlob'
	>;
	readonly presets: readonly { label: string; levels: readonly string[]; totalsDepth: number }[];
	readonly canEdit: boolean;
	applyPreset(index: number): void;
	setMerge(on: boolean): void;
	setEditable(on: boolean): void;
	setCalendar(index: number): void;
	setBarLines(lines: number): void;
	onView(listener: (view: ViewState) => void): void;
	onLog(listener: (message: string) => void): void;
	destroy(): void;
}

export interface Demo {
	readonly id: string;
	readonly title: string;
	readonly summary: string;
	readonly tips: readonly string[];
	readonly source: DemoDefinition<unknown>['source'];
	readonly calendars: readonly { label: string }[];
	mount(host: HTMLElement): DemoHandle;
}

/** Wrap a typed demo so the shell can treat every dataset alike. */
export function defineDemo<T>(def: DemoDefinition<T>): Demo {
	return {
		id: def.id,
		title: def.title,
		summary: def.summary,
		tips: def.tips,
		source: def.source,
		calendars: def.calendars,
		mount(host) {
			let rows = def.rows;
			const firstPreset = def.presets[0];
			if (!firstPreset) throw new Error(`demo ${def.id} has no presets`);
			const timeline = new Timeline<T>(host, { ...def.config, groupBy: firstPreset.groupBy }, rows);
			timeline.setTotalsDepth(firstPreset.totalsDepth);
			const logListeners: ((message: string) => void)[] = [];
			const log = (message: string) => {
				for (const l of logListeners) l(message);
			};

			timeline.on('click', ({ bar }) =>
				log(
					`click  ${bar.groupLabels.join(' › ')}  ${bar.start.toISODate()} → ${bar.end.toISODate()}  (${bar.rows.length} row(s))`,
				),
			);

			const shift = def.shift;
			if (shift) {
				timeline.on('move', async ({ rows: moved, deltaDays }) => {
					await new Promise((resolve) => setTimeout(resolve, 120)); // pretend to save
					const ids = new Set(moved);
					rows = rows.map((r) => (ids.has(r) ? shift(r, deltaDays) : r));
					timeline.setData(rows);
					log(`move   ${moved.length} row(s) by ${deltaDays > 0 ? '+' : ''}${deltaDays} day(s)`);
					return true;
				});
			}

			return {
				timeline,
				presets: def.presets,
				canEdit: shift !== undefined,
				applyPreset(index) {
					const preset = def.presets[index];
					if (!preset) return;
					timeline.setConfig({ groupBy: preset.groupBy });
					timeline.setTotalsDepth(preset.totalsDepth);
				},
				setMerge(on) {
					timeline.setConfig({ bars: { ...timeline.getConfig().bars, mergeOverlapping: on } });
				},
				setEditable(on) {
					timeline.setConfig({ editable: on && shift !== undefined });
				},
				setCalendar(index) {
					const option = def.calendars[index];
					if (option) timeline.setConfig({ calendar: option.value });
				},
				setBarLines(lines) {
					timeline.setConfig({ theme: { barLines: lines } });
				},
				onView(listener) {
					timeline.on('viewchange', listener);
					const view = timeline.getViewState();
					if (view) listener(view);
				},
				onLog(listener) {
					logListeners.push(listener);
				},
				destroy() {
					timeline.destroy();
				},
			};
		},
	};
}

/** Shift ISO date-only fields by whole days (demo helper). */
export function shiftIso(value: string, days: number): string {
	const d = new Date(`${value}T00:00:00Z`);
	return new Date(d.getTime() + days * 86_400_000).toISOString().slice(0, 10);
}

/** Earliest ISO date among rows — for "chronological" group sorts. */
export function earliest<T>(rows: readonly T[], start: (row: T) => string): string {
	let min = '9999-12-31';
	for (const r of rows) if (start(r) < min) min = start(r);
	return min;
}
