import { statusHistory } from './history.js';
import { getDailyWeather, localToday, shiftDate, type DayWeather } from './weather.js';
import { logWarn } from './logger.js';

export type ReopeningEstimate = {
	available: true;
	/** first day the trails are expected to be dry enough, YYYY-MM-DD; null when not within the forecast */
	estimatedDate: string | null;
	/** when the current closure began (ISO timestamp from the status history) */
	closedSince: string;
	/** inches of rain since the closure, through today */
	rainInches: number;
	/** days since the closure with at least 6 hours of sunshine */
	sunnyDays: number;
	/** warmest daily high (°F) since the closure, null when unknown */
	highTempF: number | null;
};

export type ReopeningUnavailable = { available: false };

/**
 * Drying model, v1. A running "wetness" score in inches of rain:
 * each day's rain adds to it, each day's sun and warmth dry some of it
 * off. The trails are estimated dry the first day the score reaches zero.
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

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

// inches of wetness one day dries off: full sun and warm is a full drying
// day, cold or overcast days dry much less, unknown temps assume middling
export function dryingInches(day: DayWeather): number {
	const sunFactor = clamp(day.sunshineHours / SUNNY_HOURS, 0, 1);
	const tempFactor = day.maxTempF === null ? 0.5 : clamp((day.maxTempF - 32) / 33, 0.4, 1);
	return DRYING_PER_DAY_IN * sunFactor * tempFactor;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Pure estimate from a daily weather series and a closure start.
 * `today` defaults to the current local date; tests pass it explicitly.
 */
export function estimateReopening(days: DayWeather[], closedSince: string, today = localToday()): ReopeningEstimate {
	const start = shiftDate(closedSince.slice(0, 10), -LOOKBACK_DAYS);
	const sorted = [...days].sort((a, b) => (a.date < b.date ? -1 : 1));

	let wetness = 0;
	let wetAtClosure = 0;
	let estimatedDate: string | null = null;
	for (const day of sorted) {
		if (day.date < start) continue;
		wetness = Math.max(0, wetness + day.precipitationIn - dryingInches(day));
		if (day.date >= closedSince.slice(0, 10)) wetAtClosure = Math.max(wetAtClosure, wetness);
		if (estimatedDate === null && day.date >= today && wetAtClosure > 0 && wetness === 0) {
			estimatedDate = day.date;
		}
	}

	const actuals = sorted.filter((d) => d.date >= closedSince.slice(0, 10) && d.date <= today);
	const rainInches = actuals.reduce((sum, d) => sum + d.precipitationIn, 0);
	const sunnyDays = actuals.filter((d) => d.sunshineHours >= SUNNY_HOURS).length;
	const highs = actuals.map((d) => d.maxTempF).filter((t): t is number => t !== null);
	const highTempF = highs.length ? Math.max(...highs) : null;

	// no rain since the closure means the model already says dry; drying
	// before today is caught by the loop itself, which stamps today the
	// first day the score is zero
	const finalDate = wetAtClosure === 0 ? today : estimatedDate;

	return {
		available: true,
		estimatedDate: finalDate,
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
