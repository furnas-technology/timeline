export interface Rgba {
	r: number;
	g: number;
	b: number;
	a: number;
}

/** Parse `#rgb`, `#rrggbb`, `#rrggbbaa`, `rgb()` and `rgba()`. Returns `null` for anything else. */
export function parseColor(color: string): Rgba | null {
	const c = color.trim().toLowerCase();
	const hex = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(c);
	if (hex?.[1]) {
		let h = hex[1];
		if (h.length === 3) h = h.replace(/./g, (ch) => ch + ch);
		const n = (i: number) => Number.parseInt(h.slice(i, i + 2), 16);
		return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) / 255 : 1 };
	}
	const fn = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/.exec(c);
	if (fn) {
		const alpha =
			fn[4] === undefined ? 1 : fn[4].endsWith('%') ? Number.parseFloat(fn[4]) / 100 : Number.parseFloat(fn[4]);
		return { r: Number(fn[1]), g: Number(fn[2]), b: Number(fn[3]), a: alpha };
	}
	return null;
}

export function toCss({ r, g, b, a }: Rgba): string {
	const c = (v: number) => Math.round(Math.min(255, Math.max(0, v)));
	return a >= 1 ? `rgb(${c(r)}, ${c(g)}, ${c(b)})` : `rgba(${c(r)}, ${c(g)}, ${c(b)}, ${a})`;
}

/** WCAG relative luminance (0–1). */
export function luminance({ r, g, b }: Rgba): number {
	const lin = (v: number) => {
		const s = v / 255;
		return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
	};
	return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Pick whichever of `dark`/`light` text contrasts better with `background`. */
export function contrastText(background: Rgba | null, dark: string, light: string): string {
	if (!background) return dark;
	const l = luminance(background);
	// Contrast against black vs white: (l + 0.05) / 0.05 vs 1.05 / (l + 0.05).
	return (l + 0.05) / 0.05 >= 1.05 / (l + 0.05) ? dark : light;
}

export function darken(color: Rgba, amount = 0.25): Rgba {
	return { r: color.r * (1 - amount), g: color.g * (1 - amount), b: color.b * (1 - amount), a: color.a };
}
