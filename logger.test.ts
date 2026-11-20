import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { getLatestLogId, getLogEntries, logError, logInfo, logWarn } from './logger.js';

// the logger dual-writes every entry to the console; capture those calls instead of spamming test output
const calls: { method: string; message: string }[] = [];
const originals = { log: console.log, warn: console.warn, error: console.error };

describe('logger', () => {
	beforeAll(() => {
		console.log = (...args: unknown[]) => {
			calls.push({ method: 'log', message: String(args[0]) });
		};
		console.warn = (...args: unknown[]) => {
			calls.push({ method: 'warn', message: String(args[0]) });
		};
		console.error = (...args: unknown[]) => {
			calls.push({ method: 'error', message: String(args[0]) });
		};
	});
	afterAll(() => {
		console.log = originals.log;
		console.warn = originals.warn;
		console.error = originals.error;
	});
	test('records entries with incrementing ids, levels, and formatted messages', () => {
		const since = getLatestLogId();
		logInfo('hello %s', 'world');
		logWarn('careful now');
		logError('boom');
		const entries = getLogEntries(since);
		expect(entries.length).toBe(3);
		expect(entries.map((e) => e.level)).toEqual(['info', 'warn', 'error']);
		expect(entries[0].message).toBe('hello world');
		expect(entries[1].id + 1).toBe(entries[2].id);
		expect(entries.every((e) => !Number.isNaN(Date.parse(e.ts)))).toBeTruthy();
	});
	test('dual-writes each entry to the matching console method', () => {
		const beforeCount = calls.length;
		logInfo('info line');
		logWarn('warn line');
		logError('error line');
		expect(calls.slice(beforeCount).map((c) => c.method)).toEqual(['log', 'warn', 'error']);
		expect(calls.slice(beforeCount).map((c) => c.message)).toEqual(['info line', 'warn line', 'error line']);
	});
	test('getLogEntries filters by sinceId', () => {
		logInfo('first');
		const firstId = getLatestLogId();
		logInfo('second');
		const entries = getLogEntries(firstId);
		expect(entries.length).toBe(1);
		expect(entries[0].message).toBe('second');
	});
	test('caps the buffer at 1000 entries, dropping the oldest', () => {
		const since = getLatestLogId();
		for (let i = 0; i < 1005; i++) logInfo(`entry ${i}`);
		const entries = getLogEntries(since);
		expect(entries.length).toBe(1000);
		expect(entries[0].message).toBe('entry 5');
		expect(entries[999].message).toBe('entry 1004');
		expect(getLatestLogId()).toBe(since + 1005);
	});
});
