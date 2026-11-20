import { describe, expect, test, vi } from 'vitest';
import { getDailyWeather, mergeSeries, parseDailyResponse, shiftDate } from './weather.js';
import type { DayWeather } from './weather.js';

const day = (date: string, precipitationIn: number, sunshineHours: number, maxTempF: number | null): DayWeather => ({
	date,
	precipitationIn,
	sunshineHours,
	maxTempF
});

describe('weather', () => {
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
	});
});
