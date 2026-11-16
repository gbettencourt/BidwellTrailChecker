import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { logInfo } from './logger.js';

let tmp: string;
let originalCwd: string;
let originalConsole: { log: typeof console.log; warn: typeof console.warn; error: typeof console.error };
let server: Server;
let baseUrl: string;
let token: string;
let readOverride: typeof import('./override-util.js').readOverride;

const manualOverrideCalls: string[] = [];
const fetchStatusCalls: number[] = [];
const sendStatusEmailCalls: { status: string; user: any }[] = [];
const sendSmsCalls: { phone: string; body: string }[] = [];

// the router only needs the checker methods its routes call
const stubChecker = {
	manualOverride: (value: string) => {
		manualOverrideCalls.push(value);
	},
	fetchStatus: async () => {
		fetchStatusCalls.push(1);
	},
	sendStatusEmail: async (status: string, user: any) => {
		sendStatusEmailCalls.push({ status, user });
		return { messageId: 'stub-message-id' };
	},
	sendSms: async (phone: string, body: string) => {
		sendSmsCalls.push({ phone, body });
		return { sid: 'SMstub' };
	}
};

const seedDb = () =>
	fs.writeFileSync(
		path.join(tmp, 'db.json'),
		JSON.stringify({
			users: [
				{ id: 1, email: 'admin@example.com', phone: '5551234567' },
				{ id: 2, email: 'rider@example.com', phone: '' }
			]
		})
	);

before(async () => {
	originalCwd = process.cwd();
	tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'btc-admin-'));
	process.chdir(tmp);
	process.env.ADMIN_PASSWORD = 'testpass123';
	process.env.ADMIN_SECRET = 'test-secret-123';
	process.env.SMTP_ADMIN_EMAIL = 'admin@example.com';
	process.env.APP_URL = 'https://trails.example';
	// silence the logger's console dual-write during tests
	originalConsole = { log: console.log, warn: console.warn, error: console.error };
	console.log = () => {};
	console.warn = () => {};
	console.error = () => {};
	seedDb();
	// import after env + chdir: the router reads ADMIN_PASSWORD/ADMIN_SECRET at
	// import time, and override-util fixes its data file path at import time
	const { default: adminRouter } = await import('./admin-router.js');
	({ readOverride } = await import('./override-util.js'));
	const app = express();
	app.use(express.json());
	app.use('/api/admin', adminRouter(stubChecker as any));
	server = app.listen(0);
	await new Promise<void>((resolve) => server.once('listening', resolve));
	baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/admin`;
	// log one entry so /logs has something to return
	logInfo('test log entry');
	// a valid token for the protected routes
	const res = await fetch(`${baseUrl}/login`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ password: 'testpass123' })
	});
	const body = (await res.json()) as { token: string };
	token = body.token;
});

after(async () => {
	await new Promise<void>((resolve) => server.close(() => resolve()));
	console.log = originalConsole.log;
	console.warn = originalConsole.warn;
	console.error = originalConsole.error;
	process.chdir(originalCwd);
	fs.rmSync(tmp, { recursive: true, force: true });
});

beforeEach(() => {
	manualOverrideCalls.length = 0;
	fetchStatusCalls.length = 0;
	sendStatusEmailCalls.length = 0;
	sendSmsCalls.length = 0;
});

const authHeaders = () => ({ Authorization: `Bearer ${token}` });

const postJson = (url: string, body: unknown, headers: Record<string, string> = {}) =>
	fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', ...headers },
		body: JSON.stringify(body)
	});

test('login rejects a wrong password', async () => {
	const res = await postJson(`${baseUrl}/login`, { password: 'nope' });
	assert.equal(res.status, 401);
	assert.deepEqual(await res.json(), { error: 'Invalid password' });
});

test('login returns a JWT with the admin role', async () => {
	const res = await postJson(`${baseUrl}/login`, { password: 'testpass123' });
	assert.equal(res.status, 200);
	const body = (await res.json()) as { token: string };
	const decoded = jwt.verify(body.token, 'test-secret-123') as { role: string };
	assert.equal(decoded.role, 'admin');
});

test('protected routes reject missing, malformed, and bad tokens', async () => {
	const noToken = await fetch(`${baseUrl}/logs`);
	assert.equal(noToken.status, 401);
	const garbage = await fetch(`${baseUrl}/logs`, { headers: { Authorization: 'Bearer garbage' } });
	assert.equal(garbage.status, 401);
	const wrongSecret = await fetch(`${baseUrl}/logs`, {
		headers: { Authorization: `Bearer ${jwt.sign({ role: 'admin' }, 'someone-elses-secret')}` }
	});
	assert.equal(wrongSecret.status, 401);
	const good = await fetch(`${baseUrl}/logs`, { headers: authHeaders() });
	assert.equal(good.status, 200);
});

test('logs returns entries with latestId, and since filters them', async () => {
	const all = (await (await fetch(`${baseUrl}/logs`, { headers: authHeaders() })).json()) as {
		entries: { id: number; message: string }[];
		latestId: number;
	};
	assert.ok(all.entries.some((e) => e.message === 'test log entry'));
	assert.ok(all.latestId >= all.entries[all.entries.length - 1].id);
	const filtered = (await (await fetch(`${baseUrl}/logs?since=${all.latestId}`, { headers: authHeaders() })).json()) as {
		entries: unknown[];
	};
	assert.deepEqual(filtered.entries, []);
});

test('override rejects invalid values and applies valid ones', async () => {
	const bad = await postJson(`${baseUrl}/override`, { value: 'bogus' }, authHeaders());
	assert.equal(bad.status, 400);
	assert.equal(manualOverrideCalls.length, 0);

	const closed = await postJson(`${baseUrl}/override`, { value: 'closed' }, authHeaders());
	assert.equal(closed.status, 200);
	assert.deepEqual(await closed.json(), { ok: true });
	assert.deepEqual(manualOverrideCalls, ['closed']);
	assert.equal(readOverride(), 'closed');

	const auto = await postJson(`${baseUrl}/override`, { value: 'auto' }, authHeaders());
	assert.equal(auto.status, 200);
	// auto does not trigger a manual override
	assert.deepEqual(manualOverrideCalls, ['closed']);
	assert.equal(readOverride(), 'auto');
});

test('status returns the current override', async () => {
	const res = await fetch(`${baseUrl}/status`, { headers: authHeaders() });
	assert.equal(res.status, 200);
	assert.deepEqual(await res.json(), { override: 'auto' });
});

test('users lists subscriber emails', async () => {
	const res = await fetch(`${baseUrl}/users`, { headers: authHeaders() });
	assert.deepEqual(await res.json(), ['admin@example.com', 'rider@example.com']);
});

test('test-email validates the status and sends to the admin', async () => {
	const bad = await postJson(`${baseUrl}/test-email`, { status: 'bogus' }, authHeaders());
	assert.equal(bad.status, 400);
	const good = await postJson(`${baseUrl}/test-email`, { status: 'open' }, authHeaders());
	assert.equal(good.status, 200);
	assert.deepEqual(await good.json(), { ok: true });
	assert.equal(sendStatusEmailCalls.length, 1);
	assert.equal(sendStatusEmailCalls[0].status, 'Open');
	assert.equal(sendStatusEmailCalls[0].user.email, 'admin@example.com');
});

test('test-email fails when the admin user is not in the database', async () => {
	fs.writeFileSync(
		path.join(tmp, 'db.json'),
		JSON.stringify({ users: [{ id: 2, email: 'rider@example.com', phone: '' }] })
	);
	const res = await postJson(`${baseUrl}/test-email`, { status: 'open' }, authHeaders());
	assert.equal(res.status, 500);
	seedDb();
});

test('test-sms reports incomplete Twilio config, then sends when configured', async () => {
	delete process.env.SMS_SID;
	delete process.env.SMS_TOKEN;
	delete process.env.SMS_FROM;
	const incomplete = await fetch(`${baseUrl}/test-sms`, { method: 'POST', headers: authHeaders() });
	assert.equal(incomplete.status, 500);

	process.env.SMS_SID = 'ACtest';
	process.env.SMS_TOKEN = 'test-token';
	process.env.SMS_FROM = '5550001111';
	const good = await fetch(`${baseUrl}/test-sms`, { method: 'POST', headers: authHeaders() });
	assert.equal(good.status, 200);
	assert.deepEqual(await good.json(), { ok: true });
	assert.equal(sendSmsCalls.length, 1);
	assert.equal(sendSmsCalls[0].phone, '5551234567');
	assert.match(sendSmsCalls[0].body, /test SMS/);
});

test('refresh triggers a status check', async () => {
	const res = await fetch(`${baseUrl}/refresh`, { method: 'POST', headers: authHeaders() });
	assert.equal(res.status, 200);
	assert.deepEqual(await res.json(), { ok: true });
	assert.equal(fetchStatusCalls.length, 1);
});
