import { before, test } from 'node:test';
import assert from 'node:assert/strict';
import { oneClickUnsubscribeUrl, unsubscribePageUrl, unsubscribeToken, verifyUnsubscribeToken } from './unsubscribe.js';
import { statusChangeEmail } from './email-templates.js';

const user = { id: 7, email: 'rider@example.com', phone: '' };

before(() => {
	process.env.ADMIN_SECRET = 'test-secret';
	process.env.APP_URL = 'https://trails.example';
});

test('accepts the token for the same user', () => {
	assert.ok(verifyUnsubscribeToken(user, unsubscribeToken(user)));
});

test('rejects a token made for a different id or email', () => {
	assert.ok(!verifyUnsubscribeToken({ id: 8, email: user.email }, unsubscribeToken(user)));
	assert.ok(!verifyUnsubscribeToken({ id: 7, email: 'someone-else@example.com' }, unsubscribeToken(user)));
});

test('rejects missing or malformed tokens', () => {
	assert.ok(!verifyUnsubscribeToken(user, ''));
	assert.ok(!verifyUnsubscribeToken(user, undefined));
	assert.ok(!verifyUnsubscribeToken(user, 'not-a-token'));
});

test('ignores email capitalization', () => {
	assert.ok(verifyUnsubscribeToken({ id: 7, email: 'Rider@Example.com' }, unsubscribeToken(user)));
});

test('links carry the id and token, not the email address', () => {
	for (const url of [unsubscribePageUrl(user), oneClickUnsubscribeUrl(user)]) {
		assert.ok(url.startsWith('https://trails.example/'));
		assert.ok(url.includes(`u=7&t=${unsubscribeToken(user)}`));
		assert.ok(!url.includes('rider'));
	}
});

test('status email has html and text versions, both with an unsubscribe link', () => {
	const email = statusChangeEmail('Closed', user);
	assert.equal(email.subject, 'Bidwell trails are now CLOSED');
	assert.ok(email.html.includes('CLOSED') && email.html.includes(unsubscribePageUrl(user)));
	assert.ok(email.text.includes('CLOSED') && email.text.includes(unsubscribePageUrl(user)));
	assert.ok(!email.text.includes('<'));
});
