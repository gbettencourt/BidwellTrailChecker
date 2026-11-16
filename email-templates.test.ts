import { before, test } from 'node:test';
import assert from 'node:assert/strict';
import { welcomeEmail } from './email-templates.js';
import { unsubscribePageUrl } from './unsubscribe.js';

const user = { id: 7, email: 'rider@example.com', phone: '' };

before(() => {
	process.env.ADMIN_SECRET = 'test-secret-123';
	process.env.APP_URL = 'https://trails.example';
});

test('welcome email for Open names the current status in both formats', () => {
	const email = welcomeEmail('Open', user);
	assert.equal(email.subject, 'Welcome to Bidwell Trail Checker');
	assert.match(email.html, /currently <strong>open<\/strong>/);
	assert.match(email.text, /currently open/);
	assert.ok(!email.text.includes('<'));
	assert.ok(email.html.includes(unsubscribePageUrl(user)));
	assert.ok(email.text.includes(unsubscribePageUrl(user)));
});

test('welcome email for an unknown status omits the current status', () => {
	const email = welcomeEmail('NULL', user);
	assert.ok(!email.html.includes('currently'));
	assert.match(email.text, /as soon as the trail status changes/);
	assert.ok(email.html.includes('background:#5f6b66'));
});

test('escapes the email address in the html footer', () => {
	const tricky = { id: 8, email: 'weird<&"@example.com', phone: '' };
	const email = welcomeEmail('Closed', tricky);
	assert.ok(!email.html.includes('weird<&"@example.com'));
	assert.ok(email.html.includes('weird&#60;&#38;&#34;@example.com'));
	assert.ok(email.text.includes('weird<&"@example.com'));
});
