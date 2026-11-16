import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let tmp: string;
let originalCwd: string;
let recordStatus: typeof import('./history.js').recordStatus;
let statusHistory: typeof import('./history.js').statusHistory;

before(async () => {
	originalCwd = process.cwd();
	tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'btc-history-'));
	process.chdir(tmp);
	({ recordStatus, statusHistory } = await import('./history.js'));
});

after(() => {
	process.chdir(originalCwd);
	fs.rmSync(tmp, { recursive: true, force: true });
});

test('empty history has no current status and no events', async () => {
	const result = await statusHistory();
	assert.equal(result.current, null);
	assert.equal(result.trackedSince, null);
	assert.deepEqual(result.events, []);
	assert.equal(result.stats.avgClosureMs, null);
	assert.equal(result.stats.closuresLast90Days, 0);
});

test('recordStatus appends an event and statusHistory returns it', async () => {
	await recordStatus('Open', 'auto');
	const result = await statusHistory();
	assert.equal(result.events.length, 1);
	assert.equal(result.current?.status, 'Open');
	assert.equal(result.current?.source, 'auto');
	assert.ok(result.trackedSince);
	assert.ok(result.current && !Number.isNaN(Date.parse(result.current.at)));
	// persisted to history.json on disk
	const onDisk = JSON.parse(fs.readFileSync(path.join(tmp, 'history.json'), 'utf-8'));
	assert.equal(onDisk.events.length, 1);
});

test('repeated statuses are ignored', async () => {
	await recordStatus('Open', 'auto');
	await recordStatus('Open', 'manual');
	const result = await statusHistory();
	assert.equal(result.events.length, 1);
});

test('statusHistory caps events to the most recent entries', async () => {
	await recordStatus('Closed', 'auto');
	await recordStatus('Open', 'auto');
	await recordStatus('Closed', 'auto');
	await recordStatus('Open', 'auto');
	const result = await statusHistory(2);
	assert.equal(result.events.length, 2);
	assert.deepEqual(
		result.events.map((e) => e.status),
		['Closed', 'Open']
	);
	assert.equal(result.current?.status, 'Open');
});

test('closure stats count completed closures', async () => {
	const result = await statusHistory();
	// two Closed events so far, each followed by an Open
	assert.equal(result.stats.closuresLast90Days, 2);
	assert.ok(typeof result.stats.avgClosureMs === 'number' && result.stats.avgClosureMs >= 0);
});
