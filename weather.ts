/**
 * Daily weather for Chico from Open-Meteo (free, no key).
 *
 * Two endpoints are combined: the archive for observed days and the
 * forecast for the next 7 days. Results are cached in memory for an hour,
 * so repeated calls are cheap.
 */

export type DayWeather = {
	/** local date, YYYY-MM-DD */
	date: string;
	/** inches of precipitation that day */
	precipitationIn: number;
	/** hours of sunshine that day */
	sunshineHours: number;
	/** max temperature (°F), null when the API has no value */
	maxTempF: number | null;
};

import { formatDateLocal } from './shared/format-date-local.js';
import { logWarn } from './logger.js';

const LAT = 39.7285;
const LON = -121.8375;
const TIMEZONE = 'America/Los_Angeles';
const DAILY = 'precipitation_sum,temperature_2m_max,sunshine_duration';
const UNITS = 'temperature_unit=fahrenheit&precipitation_unit=inch';
const CACHE_TTL_MS = 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 10_000;
// one retry: a cold-cache fetch that times out once (the archive endpoint
// is slow enough to hit the 10 s timeout) usually succeeds on the next
// try, and a retry in here saves the visitor a manual refresh
const FETCH_ATTEMPTS = 2;

type CachedSeries = { days: DayWeather[]; fetchedAt: number };
const cache = new Map<string, CachedSeries>();

/** Today in Chico, YYYY-MM-DD. */
export function localToday(): string {
	return formatDateLocal(new Date());
}

/** Shift a YYYY-MM-DD date by a number of days, returning YYYY-MM-DD. */
export function shiftDate(date: string, days: number): string {
	const d = new Date(`${date}T12:00:00`);
	d.setDate(d.getDate() + days);
	return formatDateLocal(d);
}

// Open-Meteo returns parallel arrays under `daily`; values can be null
// when the station/grid has no observation for that day.
export function parseDailyResponse(body: unknown): DayWeather[] {
	if (!body || typeof body !== 'object') return [];
	const daily = (body as { daily?: unknown }).daily;
	if (!daily || typeof daily !== 'object') return [];
	const { time, precipitation_sum, temperature_2m_max, sunshine_duration } = daily as {
		time?: unknown;
		precipitation_sum?: unknown;
		temperature_2m_max?: unknown;
		sunshine_duration?: unknown;
	};
	if (!Array.isArray(time)) return [];

	return time
		.map((date, i) => {
			if (typeof date !== 'string') return null;
			const precip = Array.isArray(precipitation_sum) ? precipitation_sum[i] : null;
			const temp = Array.isArray(temperature_2m_max) ? temperature_2m_max[i] : null;
			const sun = Array.isArray(sunshine_duration) ? sunshine_duration[i] : null;
			return {
				date,
				precipitationIn: typeof precip === 'number' ? precip : 0,
				// sunshine_duration comes back in seconds
				sunshineHours: typeof sun === 'number' ? sun / 3600 : 0,
				maxTempF: typeof temp === 'number' ? temp : null
			};
		})
		.filter((d): d is DayWeather => d !== null);
}

// Past days win over forecast days for the same date: the archive is
// observed weather, the forecast is a guess.
export function mergeSeries(past: DayWeather[], forecast: DayWeather[]): DayWeather[] {
	const byDate = new Map<string, DayWeather>();
	for (const day of forecast) byDate.set(day.date, day);
	for (const day of past) byDate.set(day.date, day);
	return [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
}

async function fetchDaily(url: string, fetchImpl: typeof fetch): Promise<DayWeather[]> {
	let lastError: unknown;
	for (let attempt = 0; attempt < FETCH_ATTEMPTS; attempt++) {
		try {
			const res = await fetchImpl(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
			if (!res.ok) throw new Error(`Open-Meteo request failed: HTTP ${res.status}`);
			return parseDailyResponse(await res.json());
		} catch (error) {
			lastError = error;
		}
	}
	// name the endpoint in the error, so the server log shows whether the
	// archive or the forecast timed out instead of a bare TimeoutError
	throw new Error(`Open-Meteo request failed (${url}): ${lastError instanceof Error ? lastError.message : lastError}`);
}

/**
 * Daily weather from startDate through the 7-day forecast, oldest first.
 * `fetchImpl` exists so tests can stub the network; callers use the default.
 * If the refresh fails and a previous series is cached, even an expired
 * one, serve that instead of throwing: a stale estimate beats no estimate,
 * and the next call retries the refresh (fetchedAt is left untouched).
 */
export async function getDailyWeather(startDate: string, fetchImpl: typeof fetch = fetch): Promise<DayWeather[]> {
	const today = localToday();
	const cached = cache.get(startDate);
	if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached.days;

	const archiveUrl =
		`https://archive-api.open-meteo.com/v1/archive?latitude=${LAT}&longitude=${LON}` +
		`&start_date=${startDate}&end_date=${today}&daily=${DAILY}&${UNITS}&timezone=${encodeURIComponent(TIMEZONE)}`;
	const forecastUrl =
		`https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
		`&forecast_days=7&daily=${DAILY}&${UNITS}&timezone=${encodeURIComponent(TIMEZONE)}`;

	try {
		const [past, forecast] = await Promise.all([fetchDaily(archiveUrl, fetchImpl), fetchDaily(forecastUrl, fetchImpl)]);
		const days = mergeSeries(past, forecast);
		cache.set(startDate, { days, fetchedAt: Date.now() });
		return days;
	} catch (error) {
		if (cached) {
			logWarn('Weather refresh failed, serving stale cached series', error);
			return cached.days;
		}
		throw error;
	}
}
