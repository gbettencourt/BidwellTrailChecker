import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiGet, normalizeTrailStatus } from './api';

describe('api', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('normalizes only Open and Closed, with a fallback for anything else', () => {
		expect(normalizeTrailStatus('Open')).toBe('Open');
		expect(normalizeTrailStatus('Closed')).toBe('Closed');
		expect(normalizeTrailStatus('')).toBe('unknown');
		expect(normalizeTrailStatus('open')).toBe('unknown');
		expect(normalizeTrailStatus(undefined)).toBe('unknown');
		expect(normalizeTrailStatus(null)).toBe('unknown');
		expect(normalizeTrailStatus('', 'loading')).toBe('loading');
		expect(normalizeTrailStatus(undefined, 'loading')).toBe('loading');
	});

	it('returns the parsed JSON on success', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({ ok: true, json: async () => ({ a: 1 }) })
		);
		await expect(apiGet('/api/test')).resolves.toEqual({ a: 1 });
	});

	it('throws on a non-2xx response', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) })
		);
		await expect(apiGet('/api/test')).rejects.toThrow('HTTP 500');
	});
});
