import { describe, expect, test } from 'vitest';
import { dryingInches, estimateReopening } from './reopening.js';
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
			expect(estimate.estimatedDate).toBe('2026-11-24');
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
			expect(estimate.estimatedDate).toBe('2026-11-18');
			// the summary only covers days since the closure, not the lookback
			expect(estimate.rainInches).toBe(0);
		});
	});
});
