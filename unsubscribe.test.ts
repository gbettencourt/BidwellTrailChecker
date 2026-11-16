import { beforeAll, expect, test } from 'vitest';
import { oneClickUnsubscribeUrl, unsubscribePageUrl, unsubscribeToken, verifyUnsubscribeToken } from './unsubscribe.js';
import { statusChangeEmail } from './email-templates.js';

const user = { id: 7, email: 'rider@example.com', phone: '' };

beforeAll(() => {
	process.env.ADMIN_SECRET = 'test-secret';
	process.env.APP_URL = 'https://trails.example';
});

test('accepts the token for the same user', () => {
	expect(verifyUnsubscribeToken(user, unsubscribeToken(user))).toBeTruthy();
});

test('rejects a token made for a different id or email', () => {
	expect(verifyUnsubscribeToken({ id: 8, email: user.email }, unsubscribeToken(user))).toBeFalsy();
	expect(verifyUnsubscribeToken({ id: 7, email: 'someone-else@example.com' }, unsubscribeToken(user))).toBeFalsy();
});

test('rejects missing or malformed tokens', () => {
	expect(verifyUnsubscribeToken(user, '')).toBeFalsy();
	expect(verifyUnsubscribeToken(user, undefined)).toBeFalsy();
	expect(verifyUnsubscribeToken(user, 'not-a-token')).toBeFalsy();
});

test('ignores email capitalization', () => {
	expect(verifyUnsubscribeToken({ id: 7, email: 'Rider@Example.com' }, unsubscribeToken(user))).toBeTruthy();
});

test('links carry the id and token, not the email address', () => {
	for (const url of [unsubscribePageUrl(user), oneClickUnsubscribeUrl(user)]) {
		expect(url.startsWith('https://trails.example/')).toBeTruthy();
		expect(url.includes(`u=7&t=${unsubscribeToken(user)}`)).toBeTruthy();
		expect(url.includes('rider')).toBeFalsy();
	}
});

test('status email has html and text versions, both with an unsubscribe link', () => {
	const email = statusChangeEmail('Closed', user);
	expect(email.subject).toBe('Bidwell trails are now CLOSED');
	expect(email.html.includes('CLOSED') && email.html.includes(unsubscribePageUrl(user))).toBeTruthy();
	expect(email.text.includes('CLOSED') && email.text.includes(unsubscribePageUrl(user))).toBeTruthy();
	expect(email.text.includes('<')).toBeFalsy();
});
