import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import { getDailyWeather, mergeSeries, parseDailyResponse, shiftDate } from './weather.js';
import type { DayWeather } from './weather.js';

const day = (date: string, precipitationIn: number, sunshineHours: number, maxTempF: number | null): DayWeather => ({
	date,
	precipitationIn,
	sunshineHours,
	maxTempF
});

describe('weather', () => {
	// silence the logger's console dual-write during tests: the stale-cache
	// test deliberately triggers a refresh failure, and the warning it logs
	// is expected behavior, not test output worth printing
	let originalConsole: { log: typeof console.log; warn: typeof console.warn; error: typeof console.error };

	beforeAll(() => {
		originalConsole = { log: console.log, warn: console.warn, error: console.error };
		console.log = () => {};
		console.warn = () => {};
		console.error = () => {};
	});

	afterAll(() => {
		console.log = originalConsole.log;
		console.warn = originalConsole.warn;
		console.error = originalConsole.error;
	});

	describe('shiftDate', () => {
		test('shifts a local date by days', () => {
			expect(shiftDate('2026-11-16', -7)).toBe('2026-11-09');
			expect(shiftDate('2026-11-16', 3)).toBe('2026-11-19');
		});
	});

	describe('parseDailyResponse', () => {
		test('maps the Open-Meteo daily arrays to days', () => {
			const days = parseDailyResponse({
				daily: {
					time: ['2026-11-18', '2026-11-19'],
					precipitation_sum: [0.49, 0.12],
					temperature_2m_max: [54, 52],
					sunshine_duration: [21600, 0]
				}
			});
			expect(days).toEqual([
				{ date: '2026-11-18', precipitationIn: 0.49, sunshineHours: 6, maxTempF: 54 },
				{ date: '2026-11-19', precipitationIn: 0.12, sunshineHours: 0, maxTempF: 52 }
			]);
		});

		test('treats missing values as no rain, no sun, unknown temperature', () => {
			const days = parseDailyResponse({
				daily: {
					time: ['2026-11-18'],
					precipitation_sum: [null],
					temperature_2m_max: [null],
					sunshine_duration: [null]
				}
			});
			expect(days).toEqual([{ date: '2026-11-18', precipitationIn: 0, sunshineHours: 0, maxTempF: null }]);
		});

		test('returns no days for a malformed body', () => {
			expect(parseDailyResponse(null)).toEqual([]);
			expect(parseDailyResponse({})).toEqual([]);
			expect(parseDailyResponse({ daily: { time: '2026-11-18' } })).toEqual([]);
		});
	});

	describe('mergeSeries', () => {
		test('prefers past days over forecast days for the same date', () => {
			const merged = mergeSeries(
				[day('2026-11-18', 0.5, 0, 50), day('2026-11-19', 0.1, 2, 52)],
				[day('2026-11-19', 0.9, 0, 50), day('2026-11-20', 0, 8, 55)]
			);
			expect(merged.map((d) => d.date)).toEqual(['2026-11-18', '2026-11-19', '2026-11-20']);
			expect(merged[1].precipitationIn).toBe(0.1);
		});
	});

	describe('getDailyWeather', () => {
		test('combines the archive and forecast and caches the result', async () => {
			const fetchImpl = vi.fn(async (url: string) => {
				const isArchive = url.includes('archive-api');
				return {
					ok: true,
					json: async () => ({
						daily: {
							time: isArchive ? ['2026-11-16', '2026-11-17'] : ['2026-11-17', '2026-11-18'],
							precipitation_sum: isArchive ? [0.5, 0] : [0, 0],
							temperature_2m_max: isArchive ? [50, 52] : [52, 54],
							sunshine_duration: isArchive ? [0, 7200] : [7200, 28800]
						}
					})
				};
			}) as unknown as typeof fetch;

			const first = await getDailyWeather('2026-11-09', fetchImpl);
			expect(first.map((d) => d.date)).toEqual(['2026-11-16', '2026-11-17', '2026-11-18']);
			expect(first[1].precipitationIn).toBe(0);

			const second = await getDailyWeather('2026-11-09', fetchImpl);
			expect(second).toEqual(first);
			expect(fetchImpl).toHaveBeenCalledTimes(2);
		});

		test('retries a fetch that times out once, then succeeds', async () => {
			let calls = 0;
			const fetchImpl = vi.fn(async (url: string) => {
				calls++;
				const isArchive = url.includes('archive-api');
				// the archive's first attempt times out, exactly what the
				// Pi logged: [DOMException [TimeoutError]]
				if (isArchive && calls === 1) throw new DOMException('The operation was aborted due to timeout', 'TimeoutError');
				return {
					ok: true,
					json: async () => ({
						daily: {
							time: isArchive ? ['2026-11-16', '2026-11-17'] : ['2026-11-17', '2026-11-18'],
							precipitation_sum: isArchive ? [0.5, 0] : [0, 0],
							temperature_2m_max: isArchive ? [50, 52] : [52, 54],
							sunshine_duration: isArchive ? [0, 7200] : [7200, 28800]
						}
					})
				};
			}) as unknown as typeof fetch;

			const days = await getDailyWeather('2026-11-07', fetchImpl);
			expect(days.map((d) => d.date)).toEqual(['2026-11-16', '2026-11-17', '2026-11-18']);
			expect(fetchImpl).toHaveBeenCalledTimes(3);
		});

		test('serves the stale cached series when the refresh fails after expiry', async () => {
			const okFetch = vi.fn(async (url: string) => {
				const isArchive = url.includes('archive-api');
				return {
					ok: true,
					json: async () => ({
						daily: {
							time: isArchive ? ['2026-11-16'] : ['2026-11-17'],
							precipitation_sum: [0],
							temperature_2m_max: [52],
							sunshine_duration: [7200]
						}
					})
				};
			}) as unknown as typeof fetch;

			const first = await getDailyWeather('2026-11-06', okFetch);
			expect(first.map((d) => d.date)).toEqual(['2026-11-16', '2026-11-17']);

			// two hours later the cache is expired, and Open-Meteo times out
			const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 2 * 60 * 60 * 1000);
			try {
				const failingFetch = vi.fn(async () => {
					throw new DOMException('The operation was aborted due to timeout', 'TimeoutError');
				}) as unknown as typeof fetch;
				const stale = await getDailyWeather('2026-11-06', failingFetch);
				expect(stale).toEqual(first);
			} finally {
				nowSpy.mockRestore();
			}
		});

		test('still throws, naming the endpoint, when there is no cached series', async () => {
			const failingFetch = vi.fn(async () => {
				throw new DOMException('The operation was aborted due to timeout', 'TimeoutError');
			}) as unknown as typeof fetch;
			await expect(getDailyWeather('2026-11-05', failingFetch)).rejects.toThrow(/open-meteo\.com/);
		});
	});
});
