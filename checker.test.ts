import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type Checker from './checker.js';
import type { User } from './db.js';

// trimmed-down copy of the status table on the city's Trail, Gate, & Facility Status page
const page = (north: string, south: string) => `
<div>
	<table>
		<tr><th>Location</th><th>Status</th></tr>
		<tr><td>Upper Park Trails &ndash; North Side*</td><td><strong>${north}</strong></td></tr>
		<tr><td>Upper Park Trails &ndash; South Side*</td><td><strong>${south}</strong></td></tr>
		<tr><td colspan="2">*Unless otherwise indicated, &ldquo;CLOSED&rdquo; trails pertains to vehicles, equestrians, and bicyclists.</td></tr>
	</table>
</div>`;

type SentMail = {
	to?: string;
	subject?: string;
	text?: string;
	html?: string;
	from?: string;
	replyTo?: string;
	headers?: Record<string, string>;
};

let tmp: string;
let originalCwd: string;
let originalFetch: typeof fetch;
let originalConsole: { log: typeof console.log; warn: typeof console.warn; error: typeof console.error };
let CheckerClass: typeof Checker;
let fetchCalls: string[];
let fetchBehavior: () => Promise<{ ok: boolean; status: number; text: () => Promise<string> }>;

const sent: SentMail[] = [];
const fakeTransporter = {
	sendMail: async (mail: SentMail) => {
		sent.push(mail);
		return { messageId: `fake-${sent.length}` };
	}
};

function stubbedChecker() {
	const checker = new CheckerClass(false);
	(checker as any).getTransporter = () => fakeTransporter;
	return checker;
}

function readHistory() {
	return JSON.parse(fs.readFileSync(path.join(tmp, 'history.json'), 'utf-8'));
}

before(async () => {
	originalCwd = process.cwd();
	tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'btc-checker-'));
	process.chdir(tmp);
	process.env.TRAIL_STATUS_URL = 'https://city.example/status';
	process.env.SMTP_ADMIN_EMAIL = 'admin@example.com';
	process.env.SMTP_FROM_EMAIL = 'alerts@example.com';
	process.env.APP_URL = 'https://trails.example';
	process.env.ADMIN_SECRET = 'test-secret-123';
	delete process.env.SMTP_HOST;
	// silence the logger's console dual-write during tests
	originalConsole = { log: console.log, warn: console.warn, error: console.error };
	console.log = () => {};
	console.warn = () => {};
	console.error = () => {};
	// stub network: no real fetch, no real SMTP
	originalFetch = globalThis.fetch;
	fetchCalls = [];
	fetchBehavior = async () => ({ ok: true, status: 200, text: async () => page('OPEN', 'OPEN') });
	globalThis.fetch = (async (url: string) => {
		fetchCalls.push(url);
		return fetchBehavior();
	}) as unknown as typeof fetch;
	// seed two subscribers: one by email, one who skips mail
	fs.writeFileSync(
		path.join(tmp, 'db.json'),
		JSON.stringify({
			users: [
				{ id: 1, email: 'a@example.com', phone: '' },
				{ id: 2, email: 'b@example.com', phone: '', skipMail: true }
			]
		})
	);
	// import after chdir so override-util's data file path lands in the temp dir
	({ default: CheckerClass } = await import('./checker.js'));
});

after(() => {
	globalThis.fetch = originalFetch;
	console.log = originalConsole.log;
	console.warn = originalConsole.warn;
	console.error = originalConsole.error;
	process.chdir(originalCwd);
	fs.rmSync(tmp, { recursive: true, force: true });
});

beforeEach(() => {
	sent.length = 0;
	fetchCalls.length = 0;
	fetchBehavior = async () => ({ ok: true, status: 200, text: async () => page('OPEN', 'OPEN') });
	// reset history by writing empty state, not by deleting the file:
	// lowdb keeps its in-memory data when the file is missing
	fs.writeFileSync(path.join(tmp, 'history.json'), JSON.stringify({ events: [] }));
	fs.rmSync(path.join(tmp, 'trailOverride.json'), { force: true });
});

test('first check records the status but notifies nobody', async () => {
	const checker = stubbedChecker();
	await checker.fetchStatus();

	assert.equal(checker.config.lastStatus, 'Open');
	assert.deepEqual(sent, []);
	assert.equal(fetchCalls.length, 1);
	assert.equal(fetchCalls[0], 'https://city.example/status');
	const history = readHistory();
	assert.equal(history.events.length, 1);
	assert.equal(history.events[0].status, 'Open');
	assert.equal(history.events[0].source, 'auto');
});

test('status flip emails subscribers, skipping skipMail users', async () => {
	const checker = stubbedChecker();
	checker.config.lastStatus = 'Open';
	fetchBehavior = async () => ({ ok: true, status: 200, text: async () => page('CLOSED', 'CLOSED') });
	await checker.fetchStatus();

	assert.equal(checker.config.lastStatus, 'Closed');
	assert.equal(sent.length, 1);
	assert.equal(sent[0].to, 'a@example.com');
	assert.equal(sent[0].subject, 'Bidwell trails are now CLOSED');
	assert.match(sent[0].headers!['List-Unsubscribe']!, /u=1&t=/);
	assert.equal(sent[0].headers!['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click');
	assert.equal(readHistory().events.length, 1);
	assert.equal(readHistory().events[0].status, 'Closed');
});

test('no change sends nothing', async () => {
	const checker = stubbedChecker();
	checker.config.lastStatus = 'Closed';
	fetchBehavior = async () => ({ ok: true, status: 200, text: async () => page('CLOSED', 'CLOSED') });
	await checker.fetchStatus();

	assert.deepEqual(sent, []);
});

test('failed check emails the admin once, then once more on recovery', async () => {
	const checker = stubbedChecker();
	fetchBehavior = async () => {
		throw new Error('network down');
	};
	await checker.fetchStatus();

	assert.equal(sent.length, 1);
	assert.equal(sent[0].to, 'admin@example.com');
	assert.equal(sent[0].subject, 'Trail Checker: status check failing');
	assert.match(sent[0].text!, /network down/);
	// still failing: no second alert
	await checker.fetchStatus();
	assert.equal(sent.length, 1);
	// recovered: one recovery email, and no user notifications on the first known status
	fetchBehavior = async () => ({ ok: true, status: 200, text: async () => page('OPEN', 'OPEN') });
	await checker.fetchStatus();
	assert.equal(sent.length, 2);
	assert.equal(sent[1].subject, 'Trail Checker: status check recovered');
});

test('HTTP error from the status page is a check failure', async () => {
	const checker = stubbedChecker();
	fetchBehavior = async () => ({ ok: false, status: 503, text: async () => '' });
	await checker.fetchStatus();

	assert.equal(sent.length, 1);
	assert.equal(sent[0].subject, 'Trail Checker: status check failing');
	assert.match(sent[0].text!, /HTTP 503/);
});

test('unparseable page is a check failure, keeping the last known status', async () => {
	const checker = stubbedChecker();
	checker.config.lastStatus = 'Open';
	fetchBehavior = async () => ({ ok: true, status: 200, text: async () => page('OPEN TO PEDESTRIANS ONLY', 'OPEN') });
	await checker.fetchStatus();

	assert.equal(sent.length, 1);
	assert.match(sent[0].text!, /PEDESTRIANS/);
	assert.equal(checker.config.lastStatus, 'Open');
});

test('override active skips the check entirely', async () => {
	fs.writeFileSync(path.join(tmp, 'trailOverride.json'), JSON.stringify({ override: 'closed' }));
	const checker = stubbedChecker();
	await checker.fetchStatus();

	assert.equal(fetchCalls.length, 0);
	assert.deepEqual(sent, []);
	assert.equal(checker.config.lastStatus, 'NULL');
});

test('sendStatusEmail uses the given transporter and adds one-click unsubscribe headers', async () => {
	const checker = stubbedChecker();
	const user: User = { id: 1, email: 'a@example.com', phone: '' };
	const info = await checker.sendStatusEmail('Closed', user, fakeTransporter as any);

	assert.equal(info.messageId, 'fake-1');
	assert.equal(sent.length, 1);
	assert.equal(sent[0].to, 'a@example.com');
	assert.equal(sent[0].subject, 'Bidwell trails are now CLOSED');
	assert.match(sent[0].headers!['List-Unsubscribe']!, /u=1&t=/);
});

test('getTransporter uses Gmail without SMTP_HOST and SMTP with a host', () => {
	const checker = new CheckerClass(false);
	delete process.env.SMTP_HOST;
	const gmail = checker.getTransporter() as any;
	assert.equal(gmail.options.service, 'Gmail');

	process.env.SMTP_HOST = 'smtp.example';
	process.env.SMTP_PORT = '465';
	const smtps = checker.getTransporter() as any;
	assert.equal(smtps.options.host, 'smtp.example');
	assert.equal(smtps.options.port, 465);
	assert.equal(smtps.options.secure, true);

	process.env.SMTP_PORT = '587';
	const smtp = checker.getTransporter() as any;
	assert.equal(smtp.options.secure, false);

	delete process.env.SMTP_HOST;
	delete process.env.SMTP_PORT;
});

test('currentStatus reports the last known status', () => {
	const checker = stubbedChecker();
	checker.config.lastStatus = 'Closed';
	assert.equal(checker.currentStatus().trailStatus, 'Closed');
	assert.ok(checker.currentStatus().lastCheck instanceof Date);
});

test('sendTrailReport emails the admin with the report details', async () => {
	const checker = stubbedChecker();
	checker.config.lastStatus = 'Open';
	await checker.sendTrailReport({
		type: 'status',
		location: 'North Rim',
		observedStatus: 'closed',
		observedAt: '2026-11-15T10:00:00Z',
		details: 'Gate shut',
		email: 'rider@example.com'
	});

	assert.equal(sent.length, 1);
	assert.equal(sent[0].to, 'admin@example.com');
	assert.match(sent[0].subject!, /Trail status discrepancy/);
	assert.match(sent[0].text!, /North Rim/);
	assert.match(sent[0].text!, /Gate shut/);
	assert.match(sent[0].text!, /rider@example.com/);
	assert.match(sent[0].text!, /Current checker status: Open/);
});

test('sendRegEmail sends the welcome email to the new user', async () => {
	const checker = stubbedChecker();
	const user: User = { id: 3, email: 'new@example.com', phone: '' };
	await checker.sendRegEmail(user);

	assert.equal(sent.length, 1);
	assert.equal(sent[0].to, 'new@example.com');
	assert.equal(sent[0].subject, 'Welcome to Bidwell Trail Checker');
	assert.ok(sent[0].headers!['List-Unsubscribe']);
});

test('sendMail never rejects when sending fails', async () => {
	const checker = stubbedChecker();
	(checker as any).getTransporter = () => ({
		sendMail: async () => {
			throw new Error('SMTP down');
		}
	});
	await checker.sendMail({ to: 'a@example.com', subject: 'hi', text: 'hello' });
	// no throw = pass
});

test('manualOverride sets the status, records it, and notifies', async () => {
	const checker = stubbedChecker();
	checker.manualOverride('closed');
	// manualOverride fires recordStatus and sendNotifications without awaiting
	await new Promise((resolve) => setTimeout(resolve, 100));

	assert.equal(checker.config.lastStatus, 'Closed');
	assert.equal(sent.length, 1);
	assert.equal(sent[0].to, 'a@example.com');
	const history = readHistory();
	assert.equal(history.events[history.events.length - 1].status, 'Closed');
	assert.equal(history.events[history.events.length - 1].source, 'manual');
});
