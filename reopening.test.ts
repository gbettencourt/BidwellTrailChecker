import { describe, expect, test } from 'vitest';
import { dryingInches, estimateReopening, isCityBusinessDay } from './reopening.js';
import type { DayWeather } from './weather.js';

const day = (date: string, precipitationIn: number, sunshineHours: number, maxTempF: number | null): DayWeather => ({
	date,
	precipitationIn,
	sunshineHours,
	maxTempF
});

const dry = (date: string): DayWeather => day(date, 0, 8, 60);

describe('reopening', () => {
	describe('dryingInches', () => {
		test('a sunny warm day dries the full daily amount', () => {
			expect(dryingInches(day('2026-11-20', 0, 8, 70))).toBeCloseTo(0.7, 5);
		});

		test('no sun means no drying, however warm', () => {
			expect(dryingInches(day('2026-11-20', 0, 0, 70))).toBe(0);
		});

		test('a cold sunny day dries much less', () => {
			expect(dryingInches(day('2026-11-20', 0, 8, 32))).toBeCloseTo(0.28, 5);
		});

		test('unknown temperature assumes middling drying', () => {
			expect(dryingInches(day('2026-11-20', 0, 8, null))).toBeCloseTo(0.35, 5);
		});
	});

	describe('isCityBusinessDay', () => {
		test('weekdays are business days', () => {
			expect(isCityBusinessDay('2026-11-24')).toBe(true); // Tuesday
			expect(isCityBusinessDay('2026-11-30')).toBe(true); // Monday
		});

		test('weekends are not business days', () => {
			expect(isCityBusinessDay('2026-11-28')).toBe(false); // Saturday
			expect(isCityBusinessDay('2026-11-29')).toBe(false); // Sunday
		});

		test('Thanksgiving and the day after are not business days', () => {
			expect(isCityBusinessDay('2026-11-26')).toBe(false);
			expect(isCityBusinessDay('2026-11-27')).toBe(false);
		});

		test('fixed and floating holidays are not business days', () => {
			expect(isCityBusinessDay('2026-01-01')).toBe(false); // New Year's Day
			expect(isCityBusinessDay('2026-01-19')).toBe(false); // MLK Day, third Monday
			expect(isCityBusinessDay('2026-05-25')).toBe(false); // Memorial Day, last Monday
			expect(isCityBusinessDay('2026-07-03')).toBe(false); // Independence Day observed Friday, July 4 is a Saturday
			expect(isCityBusinessDay('2026-09-07')).toBe(false); // Labor Day, first Monday
			expect(isCityBusinessDay('2026-11-11')).toBe(false); // Veterans Day
			expect(isCityBusinessDay('2026-12-24')).toBe(false); // Christmas Eve
			expect(isCityBusinessDay('2026-12-25')).toBe(false); // Christmas Day
		});

		test("New Year's Day on a Saturday is observed the Friday before, in the prior year", () => {
			expect(isCityBusinessDay('2021-12-31')).toBe(false); // Jan 1, 2022 is a Saturday
			expect(isCityBusinessDay('2021-12-30')).toBe(true);
		});
	});

	describe('estimateReopening', () => {
		test('estimates a few days out after a wet week', () => {
			const days = [
				dry('2026-11-09'),
				dry('2026-11-10'),
				dry('2026-11-11'),
				dry('2026-11-12'),
				dry('2026-11-13'),
				dry('2026-11-14'),
				day('2026-11-15', 1.0, 0, 50),
				day('2026-11-16', 0.5, 0, 50),
				day('2026-11-17', 0, 2, 52),
				day('2026-11-18', 0.7, 0, 49),
				day('2026-11-19', 0, 1, 52),
				day('2026-11-20', 0, 7, 54),
				day('2026-11-21', 0, 8, 56),
				day('2026-11-22', 0, 6, 55),
				day('2026-11-23', 0, 7, 55),
				day('2026-11-24', 0, 7, 55),
				day('2026-11-25', 0, 7, 55)
			];
			const estimate = estimateReopening(days, '2026-11-16T10:00:00Z', '2026-11-19');
			expect(estimate.available).toBe(true);
			// wetness reaches zero Tuesday Nov 24, but the estimate waits
			// for a second dry day, so Wednesday Nov 25
			expect(estimate.estimatedDate).toBe('2026-11-25');
			expect(estimate.rainInches).toBe(1.2);
			expect(estimate.sunnyDays).toBe(0);
			expect(estimate.highTempF).toBe(52);
		});

		test('says today when the trails already dried before today', () => {
			const days = [
				day('2026-11-16', 0.2, 0, 50),
				day('2026-11-17', 0, 8, 65),
				day('2026-11-18', 0, 8, 65),
				day('2026-11-19', 0, 8, 65),
				day('2026-11-20', 0, 8, 65)
			];
			const estimate = estimateReopening(days, '2026-11-16T10:00:00Z', '2026-11-19');
			expect(estimate.estimatedDate).toBe('2026-11-19');
			expect(estimate.rainInches).toBe(0.2);
			expect(estimate.sunnyDays).toBe(3);
			expect(estimate.highTempF).toBe(65);
		});

		test('returns no date when rain keeps coming through the forecast', () => {
			const days = Array.from({ length: 11 }, (_, i) => {
				const d = new Date('2026-11-16T12:00:00');
				d.setDate(d.getDate() + i);
				return day(d.toISOString().slice(0, 10), 0.5, 0, 50);
			});
			const estimate = estimateReopening(days, '2026-11-16T10:00:00Z', '2026-11-19');
			expect(estimate.estimatedDate).toBeNull();
			expect(estimate.rainInches).toBe(2);
		});

		test('caps wetness after a long wet spell, so a dry stretch reopens in days not weeks', () => {
			const days = [
				...Array.from({ length: 10 }, (_, i) => {
					const d = new Date('2025-12-16T12:00:00');
					d.setDate(d.getDate() + i);
					return day(d.toISOString().slice(0, 10), 1.5, 0, 50);
				}),
				day('2025-12-26', 0, 8, 70),
				day('2025-12-27', 0, 8, 70),
				day('2025-12-28', 0, 8, 70),
				day('2025-12-29', 0, 8, 70),
				day('2025-12-30', 0, 8, 70),
				day('2025-12-31', 0, 8, 70)
			];
			// 15 in of rain uncapped would take ~3 weeks to dry at 0.7 in/day;
			// capped at 3 in it takes 5 dry days to reach zero, plus one
			// extra dry day before the reopening is called
			const estimate = estimateReopening(days, '2025-12-16T10:00:00Z', '2025-12-26');
			expect(estimate.estimatedDate).toBe('2025-12-31');
		});

		test('still returns no date when heavy rain keeps coming', () => {
			const days = Array.from({ length: 11 }, (_, i) => {
				const d = new Date('2026-11-16T12:00:00');
				d.setDate(d.getDate() + i);
				return day(d.toISOString().slice(0, 10), 2, 0, 50);
			});
			const estimate = estimateReopening(days, '2026-11-16T10:00:00Z', '2026-11-19');
			expect(estimate.estimatedDate).toBeNull();
		});

		test('says today when there has been no rain since the closure', () => {
			const days = [dry('2026-11-16'), dry('2026-11-17'), dry('2026-11-18'), dry('2026-11-19')];
			const estimate = estimateReopening(days, '2026-11-16T10:00:00Z', '2026-11-19');
			expect(estimate.estimatedDate).toBe('2026-11-19');
			expect(estimate.rainInches).toBe(0);
		});

		test('counts rain that fell just before the closure', () => {
			const days = [
				day('2026-11-14', 1.0, 0, 50),
				day('2026-11-15', 0, 0, 50),
				day('2026-11-16', 0, 0, 50),
				day('2026-11-17', 0, 8, 70),
				day('2026-11-18', 0, 8, 70),
				day('2026-11-19', 0, 8, 70)
			];
			const estimate = estimateReopening(days, '2026-11-16T10:00:00Z', '2026-11-17');
			// wetness reaches zero Wednesday Nov 18, but the estimate waits
			// for a second dry day, so Thursday Nov 19
			expect(estimate.estimatedDate).toBe('2026-11-19');
			// the summary only covers days since the closure, not the lookback
			expect(estimate.rainInches).toBe(0);
		});

		test('pushes a dry Saturday to Monday when no more rain follows', () => {
			const days = [
				day('2026-11-19', 1.4, 0, 50),
				day('2026-11-20', 0, 8, 70),
				day('2026-11-21', 0, 8, 70),
				day('2026-11-22', 0, 8, 70),
				day('2026-11-23', 0, 8, 70)
			];
			// 1.4 in dries at 0.7 in/day, so the trails are dry Saturday Nov 21
			const estimate = estimateReopening(days, '2026-11-19T10:00:00Z', '2026-11-20');
			expect(estimate.estimatedDate).toBe('2026-11-23');
		});

		test('a dry Friday still waits for Monday with the extra dry day', () => {
			const days = [
				day('2026-11-19', 0.7, 0, 50),
				day('2026-11-20', 0, 8, 70),
				day('2026-11-21', 0, 8, 70),
				day('2026-11-22', 0, 8, 70),
				day('2026-11-23', 0, 8, 70)
			];
			// 0.7 in dries in one day, so the trails are dry Friday Nov 20,
			// but that is only the first dry day — the estimate waits for a
			// second, which lands on Monday Nov 23 after the weekend
			const estimate = estimateReopening(days, '2026-11-19T10:00:00Z', '2026-11-20');
			expect(estimate.estimatedDate).toBe('2026-11-23');
		});

		test('says the next business day when the trails are already dry on a Saturday', () => {
			const days = [
				day('2026-11-16', 0.2, 0, 50),
				day('2026-11-17', 0, 8, 65),
				day('2026-11-18', 0, 8, 65),
				day('2026-11-19', 0, 8, 65),
				day('2026-11-20', 0, 8, 65),
				day('2026-11-21', 0, 8, 65),
				day('2026-11-22', 0, 8, 65),
				day('2026-11-23', 0, 8, 65),
				day('2026-11-24', 0, 8, 65),
				day('2026-11-25', 0, 8, 65),
				day('2026-11-26', 0, 8, 65),
				day('2026-11-27', 0, 8, 65),
				day('2026-11-28', 0, 8, 65),
				day('2026-11-29', 0, 8, 65),
				day('2026-11-30', 0, 8, 65)
			];
			const estimate = estimateReopening(days, '2026-11-16T10:00:00Z', '2026-11-28');
			expect(estimate.estimatedDate).toBe('2026-11-30');
		});

		test('Thanksgiving 2026: dry Saturday, Sunday rain, so Wednesday Dec 2', () => {
			// real Open-Meteo archive + forecast for Chico, Nov 9 – Dec 1;
			// the model dries out Saturday Nov 28, but the City is closed
			// Thu/Fri for Thanksgiving and 0.6 in falls Sunday Nov 29.
			// Wetness reaches zero again Tuesday Dec 1, the first dry day;
			// the extra dry day pushes the estimate to Wednesday Dec 2.
			const days = [
				day('2026-11-09', 0, 9.86, 71.8),
				day('2026-11-10', 0, 9.85, 76.1),
				day('2026-11-11', 0, 9.83, 71.3),
				day('2026-11-12', 0, 9.7, 71.8),
				day('2026-11-13', 1.244, 2.33, 59.5),
				day('2026-11-14', 0.067, 8.36, 60.2),
				day('2026-11-15', 1.134, 0, 57.4),
				day('2026-11-16', 0.173, 7.14, 54.8),
				day('2026-11-17', 0.016, 9.75, 51.9),
				day('2026-11-18', 1.516, 0, 50.6),
				day('2026-11-19', 0.65, 3.08, 49.5),
				day('2026-11-20', 0.311, 9.29, 52.1),
				day('2026-11-21', 0.169, 3.14, 48.7),
				day('2026-11-22', 0.051, 1.55, 52.6),
				day('2026-11-23', 0, 9.04, 54.3),
				day('2026-11-24', 0.067, 5.14, 53.3),
				day('2026-11-25', 0.35, 7.43, 60.7),
				day('2026-11-26', 0, 5.24, 61.9),
				day('2026-11-27', 0, 8.88, 63.3),
				day('2026-11-28', 0, 7.84, 67),
				day('2026-11-29', 0.598, 0.51, 58.9),
				day('2026-11-30', 0.114, 6.61, 60.3),
				day('2026-12-01', 0.047, 8.86, 60.5),
				day('2026-12-02', 0, 8.5, 60)
			];
			const estimate = estimateReopening(days, '2026-11-16T20:30:00Z', '2026-11-25');
			expect(estimate.estimatedDate).toBe('2026-12-02');
			expect(estimate.rainInches).toBe(3.3);
			expect(estimate.sunnyDays).toBe(5);
			expect(estimate.highTempF).toBe(60.7);
		});
	});
});
