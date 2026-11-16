import { beforeAll, expect, test } from 'vitest';
import { welcomeEmail } from './email-templates.js';
import { unsubscribePageUrl } from './unsubscribe.js';

const user = { id: 7, email: 'rider@example.com', phone: '' };

beforeAll(() => {
	process.env.ADMIN_SECRET = 'test-secret-123';
	process.env.APP_URL = 'https://trails.example';
});

test('welcome email for Open names the current status in both formats', () => {
	const email = welcomeEmail('Open', user);
	expect(email.subject).toBe('Welcome to Bidwell Trail Checker');
	expect(email.html).toMatch(/currently <strong>open<\/strong>/);
	expect(email.text).toMatch(/currently open/);
	expect(email.text.includes('<')).toBeFalsy();
	expect(email.html.includes(unsubscribePageUrl(user))).toBeTruthy();
	expect(email.text.includes(unsubscribePageUrl(user))).toBeTruthy();
});

test('welcome email for an unknown status omits the current status', () => {
	const email = welcomeEmail('NULL', user);
	expect(email.html.includes('currently')).toBeFalsy();
	expect(email.text).toMatch(/as soon as the trail status changes/);
	expect(email.html.includes('background:#5f6b66')).toBeTruthy();
});

test('escapes the email address in the html footer', () => {
	const tricky = { id: 8, email: 'weird<&"@example.com', phone: '' };
	const email = welcomeEmail('Closed', tricky);
	expect(email.html.includes('weird<&"@example.com')).toBeFalsy();
	expect(email.html.includes('weird&#60;&#38;&#34;@example.com')).toBeTruthy();
	expect(email.text.includes('weird<&"@example.com')).toBeTruthy();
});
