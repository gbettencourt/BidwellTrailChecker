import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let tmp: string;
let originalCwd: string;
// override-util fixes its data file path at import time, so import it after chdir
let readOverride: typeof import('./override-util.js').readOverride;
let writeOverride: typeof import('./override-util.js').writeOverride;

before(async () => {
	originalCwd = process.cwd();
	tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'btc-override-'));
	process.chdir(tmp);
	({ readOverride, writeOverride } = await import('./override-util.js'));
});

after(() => {
	process.chdir(originalCwd);
	fs.rmSync(tmp, { recursive: true, force: true });
});

test('returns auto when no override file exists', () => {
	assert.equal(readOverride(), 'auto');
});

test('round-trips open, closed, and auto', () => {
	for (const value of ['open', 'closed', 'auto'] as const) {
		writeOverride(value);
		assert.equal(readOverride(), value);
	}
});

test('persists the override as JSON on disk', () => {
	writeOverride('closed');
	assert.deepEqual(JSON.parse(fs.readFileSync(path.join(tmp, 'trailOverride.json'), 'utf-8')), { override: 'closed' });
});

test('returns auto for corrupt JSON or a missing key', () => {
	fs.writeFileSync(path.join(tmp, 'trailOverride.json'), '{not json');
	assert.equal(readOverride(), 'auto');
	fs.writeFileSync(path.join(tmp, 'trailOverride.json'), JSON.stringify({ something: 'else' }));
	assert.equal(readOverride(), 'auto');
});
