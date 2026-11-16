import { afterAll, beforeAll, expect, test } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let tmp: string;
let originalCwd: string;
let recordStatus: typeof import('./history.js').recordStatus;
let statusHistory: typeof import('./history.js').statusHistory;

beforeAll(async () => {
	originalCwd = process.cwd();
	tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'btc-history-'));
	process.chdir(tmp);
	({ recordStatus, statusHistory } = await import('./history.js'));
});

afterAll(() => {
	process.chdir(originalCwd);
	fs.rmSync(tmp, { recursive: true, force: true });
});

test('empty history has no current status and no events', async () => {
	const result = await statusHistory();
	expect(result.current).toBe(null);
	expect(result.trackedSince).toBe(null);
	expect(result.events).toEqual([]);
	expect(result.stats.avgClosureMs).toBe(null);
	expect(result.stats.closuresLast90Days).toBe(0);
});

test('recordStatus appends an event and statusHistory returns it', async () => {
	await recordStatus('Open', 'auto');
	const result = await statusHistory();
	expect(result.events.length).toBe(1);
	expect(result.current?.status).toBe('Open');
	expect(result.current?.source).toBe('auto');
	expect(result.trackedSince).toBeTruthy();
	expect(result.current && !Number.isNaN(Date.parse(result.current.at))).toBeTruthy();
	// persisted to history.json on disk
	const onDisk = JSON.parse(fs.readFileSync(path.join(tmp, 'history.json'), 'utf-8'));
	expect(onDisk.events.length).toBe(1);
});

test('repeated statuses are ignored', async () => {
	await recordStatus('Open', 'auto');
	await recordStatus('Open', 'manual');
	const result = await statusHistory();
	expect(result.events.length).toBe(1);
});

test('statusHistory caps events to the most recent entries', async () => {
	await recordStatus('Closed', 'auto');
	await recordStatus('Open', 'auto');
	await recordStatus('Closed', 'auto');
	await recordStatus('Open', 'auto');
	const result = await statusHistory(2);
	expect(result.events.length).toBe(2);
	expect(result.events.map((e) => e.status)).toEqual(['Closed', 'Open']);
	expect(result.current?.status).toBe('Open');
});

test('closure stats count completed closures', async () => {
	const result = await statusHistory();
	// two Closed events so far, each followed by an Open
	expect(result.stats.closuresLast90Days).toBe(2);
	expect(typeof result.stats.avgClosureMs === 'number' && result.stats.avgClosureMs >= 0).toBeTruthy();
});
