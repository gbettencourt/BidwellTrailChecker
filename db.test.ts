import { afterAll, beforeAll, expect, test } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import DbUtil from './db.js';

let tmp: string;
let originalCwd: string;

beforeAll(() => {
	originalCwd = process.cwd();
	tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'btc-db-'));
	process.chdir(tmp);
});

afterAll(() => {
	process.chdir(originalCwd);
	fs.rmSync(tmp, { recursive: true, force: true });
});

test('starts empty when no db.json exists', async () => {
	const db = new DbUtil();
	expect(await db.fetchUsers()).toEqual([]);
	expect(await db.fetchEmails()).toEqual([]);
});

test('addUser assigns incrementing ids and persists across instances', async () => {
	const db = new DbUtil();
	const first = await db.addUser('a@example.com', '');
	const second = await db.addUser('b@example.com', '5551234567');
	expect(first.id).toBe(1);
	expect(second.id).toBe(2);
	expect(second.phone).toBe('5551234567');

	const reopened = new DbUtil();
	expect(await reopened.fetchUsers()).toEqual([first, second]);
});

test('fetchUser finds by id and returns undefined for a missing id', async () => {
	const db = new DbUtil();
	expect((await db.fetchUser(1))?.email).toBe('a@example.com');
	expect(await db.fetchUser(999)).toBe(undefined);
});

test('fetchEmails returns emails in order', async () => {
	const db = new DbUtil();
	expect(await db.fetchEmails()).toEqual(['a@example.com', 'b@example.com']);
});

test('removeUser deletes by email and is a no-op for unknown emails', async () => {
	const db = new DbUtil();
	await db.removeUser('a@example.com');
	expect(await db.fetchEmails()).toEqual(['b@example.com']);
	await db.removeUser('a@example.com');
	expect(await db.fetchEmails()).toEqual(['b@example.com']);
	// persisted: a fresh instance sees the removal
	expect(await new DbUtil().fetchEmails()).toEqual(['b@example.com']);
});

test('save persists in-memory changes', async () => {
	const db = new DbUtil();
	const users = await db.fetchUsers();
	users[0].email = 'b-new@example.com';
	await db.save();
	expect((await new DbUtil().fetchUser(2))?.email).toBe('b-new@example.com');
});
