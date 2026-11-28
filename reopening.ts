import { statusHistory } from './history.js';
import { getDailyWeather, localToday, shiftDate, type DayWeather } from './weather.js';
import { logWarn } from './logger.js';
import type { ReopeningEstimate, ReopeningUnavailable } from './shared-types.js';

/**
 * Drying model, v1. A running "wetness" score in inches of rain:
 * each day's rain adds to it, each day's sun and warmth dry some of it
 * off. The trails are estimated to reopen the first City business day
 * the score reaches zero — rangers don't open them on a weekend or a
 * City holiday, so a dry Saturday still waits for Monday, and rain in
 * between still counts. The score must also have been zero the day
 * before, so the trails were dry a full extra day first: we err on
 * staying closed rather than giving false hope.
 *
 * The constants are rough first guesses, not calibrated — the real
 * calibration is the site's own closure history, which is a follow-up
 * once a few closures have ETAs to compare against. They live here in
 * one place so tuning them is a one-line change each.
 */
// rain that fell before the closure counts too: the flip usually comes a
// day or two after the rain that caused it
const LOOKBACK_DAYS = 7;
// inches of wetness a perfect drying day (full sun, 65°F+) removes
const DRYING_PER_DAY_IN = 0.7;
// a day counts as sunny at 6+ hours of sunshine
const SUNNY_HOURS = 6;
// wetness saturates: beyond this, extra rain runs off instead of adding drying time
const MAX_WETNESS_IN = 3;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

// inches of wetness one day dries off: full sun and warm is a full drying
// day, cold or overcast days dry much less, unknown temps assume middling
export function dryingInches(day: DayWeather): number {
	const sunFactor = clamp(day.sunshineHours / SUNNY_HOURS, 0, 1);
	const tempFactor = day.maxTempF === null ? 0.5 : clamp((day.maxTempF - 32) / 33, 0.4, 1);
	return DRYING_PER_DAY_IN * sunFactor * tempFactor;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

// City of Chico holidays (Municipal Code 10.10.030): New Year's Day,
// MLK Day, Presidents Day, Memorial Day, Juneteenth, Independence Day,
// Labor Day, Veterans Day, Thanksgiving and the day after, Christmas Eve
// and Christmas Day. Fixed-date holidays falling on a weekend are
// observed on the nearest weekday.
const pad2 = (n: number) => String(n).padStart(2, '0');
const dateStr = (year: number, month: number, day: number) => `${year}-${pad2(month)}-${pad2(day)}`;
const weekdayOf = (year: number, month: number, day: number) => new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay();
const nthWeekdayOfMonth = (year: number, month: number, weekday: number, n: number) => {
	const first = weekdayOf(year, month, 1);
	return 1 + ((weekday - first + 7) % 7) + (n - 1) * 7;
};
const lastWeekdayOfMonth = (year: number, month: number, weekday: number) => {
	const lastDay = new Date(Date.UTC(year, month, 0, 12)).getUTCDate();
	const last = weekdayOf(year, month, lastDay);
	return lastDay - ((last - weekday + 7) % 7);
};

export function isCityBusinessDay(date: string): boolean {
	const [year, month, day] = date.split('-').map(Number);
	if (!year || !month || !day) return false;
	const weekday = weekdayOf(year, month, day);
	if (weekday === 0 || weekday === 6) return false;

	// holidays are computed for the surrounding years too, so a fixed
	// holiday observed on Dec 31 (New Year's Day on a Saturday) is caught
	const holidays = new Set<string>();
	for (const y of [year - 1, year, year + 1]) {
		const fixed = (m: number, d: number) => {
			const base = new Date(Date.UTC(y, m - 1, d, 12));
			const w = base.getUTCDay();
			if (w === 6) base.setUTCDate(base.getUTCDate() - 1);
			else if (w === 0) base.setUTCDate(base.getUTCDate() + 1);
			holidays.add(dateStr(base.getUTCFullYear(), base.getUTCMonth() + 1, base.getUTCDate()));
		};
		fixed(1, 1);
		fixed(6, 19);
		fixed(7, 4);
		fixed(11, 11);
		fixed(12, 24);
		fixed(12, 25);
		holidays.add(dateStr(y, 1, nthWeekdayOfMonth(y, 1, 1, 3)));
		holidays.add(dateStr(y, 2, nthWeekdayOfMonth(y, 2, 1, 3)));
		holidays.add(dateStr(y, 5, lastWeekdayOfMonth(y, 5, 1)));
		holidays.add(dateStr(y, 9, nthWeekdayOfMonth(y, 9, 1, 1)));
		const thanksgiving = nthWeekdayOfMonth(y, 11, 4, 4);
		holidays.add(dateStr(y, 11, thanksgiving));
		holidays.add(dateStr(y, 11, thanksgiving + 1));
	}
	return !holidays.has(date);
}

/**
 * Pure estimate from a daily weather series and a closure start.
 * `today` defaults to the current local date; tests pass it explicitly.
 */
export function estimateReopening(days: DayWeather[], closedSince: string, today = localToday()): ReopeningEstimate {
	const start = shiftDate(closedSince.slice(0, 10), -LOOKBACK_DAYS);
	const sorted = [...days].sort((a, b) => (a.date < b.date ? -1 : 1));

	let wetness = 0;
	let dryDays = 0;
	let estimatedDate: string | null = null;
	for (const day of sorted) {
		if (day.date < start) continue;
		wetness = Math.max(0, wetness + day.precipitationIn - dryingInches(day));
		wetness = Math.min(wetness, MAX_WETNESS_IN);
		dryDays = wetness === 0 ? dryDays + 1 : 0;
		// the estimate is a reopening, not just a dry day: it has to land
		// on a day the City can actually open the trails, and the loop
		// keeps going past a dry weekend/holiday so rain in between counts.
		// It also has to be the second dry day in a row, so the trails
		// were dry a full extra day before we call the reopening.
		if (estimatedDate === null && day.date >= today && wetness === 0 && dryDays > 1 && isCityBusinessDay(day.date)) {
			estimatedDate = day.date;
		}
	}

	const actuals = sorted.filter((d) => d.date >= closedSince.slice(0, 10) && d.date <= today);
	const rainInches = actuals.reduce((sum, d) => sum + d.precipitationIn, 0);
	const sunnyDays = actuals.filter((d) => d.sunshineHours >= SUNNY_HOURS).length;
	const highs = actuals.map((d) => d.maxTempF).filter((t): t is number => t !== null);
	const highTempF = highs.length ? Math.max(...highs) : null;

	return {
		available: true,
		estimatedDate,
		closedSince,
		rainInches: round1(rainInches),
		sunnyDays,
		highTempF
	};
}

/** Full estimate for the current closure, or unavailable when the trails are open / data is missing. */
export async function getReopeningEstimate(fetchImpl: typeof fetch = fetch): Promise<ReopeningEstimate | ReopeningUnavailable> {
	const history = await statusHistory();
	const current = history.current;
	if (!current || current.status !== 'Closed') return { available: false };

	const closedSince = current.at;
	if (isNaN(Date.parse(closedSince))) return { available: false };

	try {
		const days = await getDailyWeather(shiftDate(closedSince.slice(0, 10), -LOOKBACK_DAYS), fetchImpl);
		if (!days.length) return { available: false };
		return estimateReopening(days, closedSince);
	} catch (error) {
		logWarn('Failed to estimate trail reopening', error);
		return { available: false };
	}
}
