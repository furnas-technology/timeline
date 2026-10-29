import { createBroadcastCalendar } from './broadcast';
import { createGregorianCalendar } from './gregorian';
import type { TimeCalendar } from './types';

export * from './broadcast';
export * from './dates';
export * from './fiscal';
export * from './gregorian';
export * from './periods';
export * from './types';

export type CalendarOption = 'broadcast' | 'gregorian' | TimeCalendar;

export function resolveCalendar(option: CalendarOption | undefined, locale: string): TimeCalendar {
	if (option === undefined || option === 'broadcast') return createBroadcastCalendar({ locale });
	if (option === 'gregorian') return createGregorianCalendar({ locale });
	return option;
}
