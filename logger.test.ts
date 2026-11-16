import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { getLatestLogId, getLogEntries, logError, logInfo, logWarn } from './logger.js';

// the logger dual-writes every entry to the console; capture those calls instead of spamming test output
const calls: { method: string; message: string }[] = [];
const originals = { log: console.log, warn: console.warn, error: console.error };

before(() => {
	console.log = (...args: any[]) => {
		calls.push({ method: 'log', message: String(args[0]) });
	};
	console.warn = (...args: any[]) => {
		calls.push({ method: 'warn', message: String(args[0]) });
	};
	console.error = (...args: any[]) => {
		calls.push({ method: 'error', message: String(args[0]) });
	};
});

after(() => {
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
	assert.equal(entries.length, 3);
	assert.deepEqual(
		entries.map((e) => e.level),
		['info', 'warn', 'error']
	);
	assert.equal(entries[0].message, 'hello world');
	assert.equal(entries[1].id + 1, entries[2].id);
	assert.ok(entries.every((e) => !Number.isNaN(Date.parse(e.ts))));
});

test('dual-writes each entry to the matching console method', () => {
	const beforeCount = calls.length;
	logInfo('info line');
	logWarn('warn line');
	logError('error line');

	assert.deepEqual(
		calls.slice(beforeCount).map((c) => c.method),
		['log', 'warn', 'error']
	);
	assert.deepEqual(
		calls.slice(beforeCount).map((c) => c.message),
		['info line', 'warn line', 'error line']
	);
});

test('getLogEntries filters by sinceId', () => {
	logInfo('first');
	const firstId = getLatestLogId();
	logInfo('second');

	const entries = getLogEntries(firstId);
	assert.equal(entries.length, 1);
	assert.equal(entries[0].message, 'second');
});

test('caps the buffer at 1000 entries, dropping the oldest', () => {
	const since = getLatestLogId();
	for (let i = 0; i < 1005; i++) logInfo(`entry ${i}`);

	const entries = getLogEntries(since);
	assert.equal(entries.length, 1000);
	assert.equal(entries[0].message, 'entry 5');
	assert.equal(entries[999].message, 'entry 1004');
	assert.equal(getLatestLogId(), since + 1005);
});
