import { afterAll, beforeAll, expect, test } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let tmp: string;
let originalCwd: string;
// override-util fixes its data file path at import time, so import it after chdir
let readOverride: typeof import('./override-util.js').readOverride;
let writeOverride: typeof import('./override-util.js').writeOverride;

beforeAll(async () => {
	originalCwd = process.cwd();
	tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'btc-override-'));
	process.chdir(tmp);
	({ readOverride, writeOverride } = await import('./override-util.js'));
});

afterAll(() => {
	process.chdir(originalCwd);
	fs.rmSync(tmp, { recursive: true, force: true });
});

test('returns auto when no override file exists', () => {
	expect(readOverride()).toBe('auto');
});

test('round-trips open, closed, and auto', () => {
	for (const value of ['open', 'closed', 'auto'] as const) {
		writeOverride(value);
		expect(readOverride()).toBe(value);
	}
});

test('persists the override as JSON on disk', () => {
	writeOverride('closed');
	expect(JSON.parse(fs.readFileSync(path.join(tmp, 'trailOverride.json'), 'utf-8'))).toEqual({ override: 'closed' });
});

test('returns auto for corrupt JSON or a missing key', () => {
	fs.writeFileSync(path.join(tmp, 'trailOverride.json'), '{not json');
	expect(readOverride()).toBe('auto');
	fs.writeFileSync(path.join(tmp, 'trailOverride.json'), JSON.stringify({ something: 'else' }));
	expect(readOverride()).toBe('auto');
});
