export type DeepPartial<T> = {
	[K in keyof T]?: T[K] extends readonly (infer _U)[] ? T[K] : T[K] extends object ? DeepPartial<T[K]> : T[K];
};

export interface ThemeColors {
	background: string;
	text: string;
	/** Header tier text (years, months, weeks). */
	axisText: string;
	/** Year and month bracket marks in the header. */
	axisMark: string;
	gridWeek: string;
	gridMonth: string;
	gridBoundary: string;
	/** Row-heading text. */
	rowHeaderText: string;
	/** Alternating row bands. */
	bandEven: string;
	bandOdd: string;
	/** Separator under each group, by level (last entry repeats). */
	rowLines: readonly string[];
	/** Total row fills: index 0 is the grand total, then level 0, level 1, … (last entry repeats). */
	totalsFill: readonly string[];
	totalsLine: string;
	totalsText: string;
	/** Default bar colours, chosen by top-level group. */
	palette: readonly string[];
	/** Year colours for year-over-year mode. */
	yearPalette: readonly string[];
	barTextDark: string;
	barTextLight: string;
	tooltipBackground: string;
	tooltipText: string;
	tooltipBorder: string;
}

export interface Theme {
	/** Overall scale; `zoom()` changes this. */
	scale: number;
	baseFontSize: number;
	fontFamily: string;
	/** Space around texts and between elements, in CSS pixels. */
	padding: number;
	/** Horizontal margin of the whole drawing. */
	marginX: number;
	/** Lines of text per bar (1–3). The lane height grows with it. */
	barLines: number;
	/** Bar corner radius. */
	barRadius: number;
	/** Row-heading columns may use at most this share of the width; longer labels are truncated. */
	maxHeaderRatio: number;
	/** Column width = max(percentile-th label width, maxShare × widest label). Stops one long label dominating. */
	headerWidthPercentile: number;
	headerWidthMaxShare: number;
	minHeaderWidth: number;
	colors: ThemeColors;
}

export const defaultTheme: Theme = {
	scale: 1,
	baseFontSize: 12,
	fontFamily: 'Calibri, "Segoe UI", Helvetica, Arial, sans-serif',
	padding: 4,
	marginX: 10,
	barLines: 1,
	barRadius: 4,
	maxHeaderRatio: 0.4,
	headerWidthPercentile: 80,
	headerWidthMaxShare: 0.85,
	minHeaderWidth: 20,
	colors: {
		background: '#ffffff',
		text: '#111111',
		axisText: '#222222',
		axisMark: 'rgba(60, 90, 140, 0.8)',
		gridWeek: 'rgba(40, 70, 200, 0.18)',
		gridMonth: 'rgba(90, 160, 90, 0.45)',
		gridBoundary: 'rgba(0, 0, 0, 0.7)',
		rowHeaderText: '#1f3a93',
		bandEven: 'rgba(229, 231, 233, 0.5)',
		bandOdd: 'rgba(243, 246, 250, 0.5)',
		rowLines: ['rgba(120, 120, 120, 1)', 'rgba(150, 160, 170, 0.9)', 'rgba(190, 200, 210, 0.6)'],
		totalsFill: [
			'rgba(240, 200, 200, 0.25)',
			'rgba(215, 210, 230, 0.3)',
			'rgba(225, 220, 235, 0.3)',
			'rgba(235, 230, 240, 0.3)',
			'rgba(245, 240, 245, 0.3)',
		],
		totalsLine: 'rgba(176, 128, 222, 0.45)',
		totalsText: 'rgba(5, 5, 5, 1)',
		palette: [
			'#4e79a7',
			'#f28e2b',
			'#59a14f',
			'#e15759',
			'#76b7b2',
			'#edc948',
			'#b07aa1',
			'#ff9da7',
			'#9c755f',
			'#bab0ac',
		],
		yearPalette: [
			'#4e79a7',
			'#e15759',
			'#59a14f',
			'#f28e2b',
			'#b07aa1',
			'#76b7b2',
			'#edc948',
			'#9c755f',
			'#ff9da7',
			'#1b9e77',
			'#7570b3',
			'#bab0ac',
		],
		barTextDark: '#111111',
		barTextLight: '#ffffff',
		tooltipBackground: '#ffffff',
		tooltipText: '#111111',
		tooltipBorder: 'rgba(0, 0, 0, 0.15)',
	},
};

export function mergeTheme(base: Theme, patch: DeepPartial<Theme> | undefined): Theme {
	if (!patch) return base;
	return {
		...base,
		...stripUndefined(patch),
		colors: { ...base.colors, ...stripUndefined(patch.colors ?? {}) },
	} as Theme;
}

function stripUndefined<T extends object>(obj: T): Partial<T> {
	return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}

/** Fonts and sizes derived from a theme. Everything the layout and renderer measure against. */
export interface ThemeMetrics {
	fontSize: number;
	padding: number;
	axisFont: string;
	axisFontSize: number;
	axisLineHeight: number;
	rowFont: string;
	rowFontSize: number;
	barFont: string;
	barFontSize: number;
	barLineHeight: number;
	/** Height of one lane (bar plus spacing). */
	laneHeight: number;
	/** Height of the bar inside a lane. */
	barHeight: number;
	totalsFont: string;
	totalsFontSize: number;
	/** Height of one metric line of a total row. */
	totalsLineHeight: number;
	legendFont: string;
}

export function themeMetrics(theme: Theme): ThemeMetrics {
	const scale = clamp(theme.scale, 0.25, 8);
	const fontSize = Math.ceil(theme.baseFontSize * scale);
	const padding = Math.max(2, Math.round(theme.padding * Math.sqrt(scale)));
	const family = theme.fontFamily;
	const axisFontSize = fontSize - 1;
	const rowFontSize = fontSize + 3;
	const barFontSize = fontSize + 2;
	const barLines = clamp(Math.round(theme.barLines), 1, 3);
	const barLineHeight = barFontSize + Math.round(padding / 2) * 2;
	const barHeight = barLineHeight * barLines;
	const totalsFontSize = fontSize + 1;
	return {
		fontSize,
		padding,
		axisFont: `${axisFontSize}px ${family}`,
		axisFontSize,
		axisLineHeight: axisFontSize + padding + 2,
		rowFont: `700 ${rowFontSize}px ${family}`,
		rowFontSize,
		barFont: `${barFontSize}px ${family}`,
		barFontSize,
		barLineHeight,
		barHeight,
		laneHeight: barHeight + Math.round(padding * 1.75),
		totalsFont: `600 ${totalsFontSize}px ${family}`,
		totalsFontSize,
		totalsLineHeight: totalsFontSize + padding * 2,
		legendFont: `${axisFontSize}px ${family}`,
	};
}

export function pick<T>(list: readonly T[], index: number, fallback: T): T {
	if (list.length === 0) return fallback;
	return list[Math.min(Math.max(index, 0), list.length - 1)] ?? fallback;
}

export function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}
