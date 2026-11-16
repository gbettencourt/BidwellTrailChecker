import { describe, expect, it } from 'vitest';
import { cleanPhoneNumber, formatDuration, formatPhoneNumber } from './Util';

describe('formatPhoneNumber', () => {
	it('returns an empty string for empty or missing input', () => {
		expect(formatPhoneNumber()).toBe('');
		expect(formatPhoneNumber('')).toBe('');
	});

	it('opens the parenthesis for a partial number', () => {
		expect(formatPhoneNumber('555')).toBe('(555');
	});

	it('formats a full 10-digit number', () => {
		expect(formatPhoneNumber('5551234567')).toBe('(555) 123-4567');
	});

	it('formats a 7-digit number, dash included', () => {
		expect(formatPhoneNumber('5551234')).toBe('(555) 123-4');
	});

	it('strips non-digits and caps at 10 digits', () => {
		expect(formatPhoneNumber('abc555-def1234')).toBe('(555) 123-4');
		expect(formatPhoneNumber('555123456789')).toBe('(555) 123-4567');
	});
});

describe('cleanPhoneNumber', () => {
	it('strips everything but digits', () => {
		expect(cleanPhoneNumber('(555) 123-4567')).toBe('5551234567');
		expect(cleanPhoneNumber()).toBe('');
	});
});

describe('formatDuration', () => {
	it('formats minutes with singular and plural', () => {
		expect(formatDuration(0)).toBe('0 minutes');
		expect(formatDuration(60_000)).toBe('1 minute');
		expect(formatDuration(30 * 60_000)).toBe('30 minutes');
		expect(formatDuration(59 * 60_000)).toBe('59 minutes');
	});

	it('formats hours', () => {
		expect(formatDuration(60 * 60_000)).toBe('1 hour');
		expect(formatDuration(5 * 60 * 60_000)).toBe('5 hours');
		expect(formatDuration(47 * 60 * 60_000)).toBe('47 hours');
	});

	it('formats days', () => {
		expect(formatDuration(48 * 60 * 60_000)).toBe('2 days');
		expect(formatDuration(3 * 24 * 60 * 60_000)).toBe('3 days');
	});
});
