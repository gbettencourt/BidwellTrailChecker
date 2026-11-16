import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import DbUtil from './db.js';

let tmp: string;
let originalCwd: string;

before(() => {
	originalCwd = process.cwd();
	tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'btc-db-'));
	process.chdir(tmp);
});

after(() => {
	process.chdir(originalCwd);
	fs.rmSync(tmp, { recursive: true, force: true });
});

test('starts empty when no db.json exists', async () => {
	const db = new DbUtil();
	assert.deepEqual(await db.fetchUsers(), []);
	assert.deepEqual(await db.fetchEmails(), []);
});

test('addUser assigns incrementing ids and persists across instances', async () => {
	const db = new DbUtil();
	const first = await db.addUser('a@example.com', '');
	const second = await db.addUser('b@example.com', '5551234567');
	assert.equal(first.id, 1);
	assert.equal(second.id, 2);
	assert.equal(second.phone, '5551234567');

	const reopened = new DbUtil();
	assert.deepEqual(await reopened.fetchUsers(), [first, second]);
});

test('fetchUser finds by id and returns undefined for a missing id', async () => {
	const db = new DbUtil();
	assert.equal((await db.fetchUser(1))?.email, 'a@example.com');
	assert.equal(await db.fetchUser(999), undefined);
});

test('fetchEmails returns emails in order', async () => {
	const db = new DbUtil();
	assert.deepEqual(await db.fetchEmails(), ['a@example.com', 'b@example.com']);
});

test('removeUser deletes by email and is a no-op for unknown emails', async () => {
	const db = new DbUtil();
	await db.removeUser('a@example.com');
	assert.deepEqual(await db.fetchEmails(), ['b@example.com']);
	await db.removeUser('a@example.com');
	assert.deepEqual(await db.fetchEmails(), ['b@example.com']);
	// persisted: a fresh instance sees the removal
	assert.deepEqual(await new DbUtil().fetchEmails(), ['b@example.com']);
});

test('save persists in-memory changes', async () => {
	const db = new DbUtil();
	const users = await db.fetchUsers();
	users[0].email = 'b-new@example.com';
	await db.save();
	assert.equal((await new DbUtil().fetchUser(2))?.email, 'b-new@example.com');
});
