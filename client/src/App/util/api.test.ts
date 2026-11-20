import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiGet, normalizeTrailStatus } from './api';

describe('api', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('normalizes only Open and Closed, with a fallback for anything else', () => {
		expect(normalizeTrailStatus('Open', 'unknown')).toBe('Open');
		expect(normalizeTrailStatus('Closed', 'unknown')).toBe('Closed');
		expect(normalizeTrailStatus('', 'unknown')).toBe('unknown');
		expect(normalizeTrailStatus('open', 'unknown')).toBe('unknown');
		expect(normalizeTrailStatus(undefined, 'unknown')).toBe('unknown');
		expect(normalizeTrailStatus(null, 'unknown')).toBe('unknown');
		expect(normalizeTrailStatus('', 'loading')).toBe('loading');
		expect(normalizeTrailStatus(undefined, 'loading')).toBe('loading');
	});

	it('keeps the display spelling when the fallback is Unknown', () => {
		expect(normalizeTrailStatus('Open', 'Unknown')).toBe('Open');
		expect(normalizeTrailStatus('', 'Unknown')).toBe('Unknown');
		expect(normalizeTrailStatus(undefined, 'Unknown')).toBe('Unknown');
	});

	it('returns the parsed JSON on success', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ a: 1 }) }));
		await expect(apiGet('/api/test')).resolves.toEqual({ a: 1 });
	});

	it('throws on a non-2xx response', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }));
		await expect(apiGet('/api/test')).rejects.toThrow('HTTP 500');
	});
});
