import crypto from 'crypto';
import type { User } from './db.js';

/**
 * Signed unsubscribe links. The token is an HMAC of the user's id and email, so links can't be guessed or forged,
 * and a link stops working if the id is later reused by a different subscriber.
 * Uses ADMIN_SECRET, so changing that secret invalidates links in emails already sent.
 */
export function unsubscribeToken(user: Pick<User, 'id' | 'email'>) {
	return crypto
		.createHmac('sha256', process.env.ADMIN_SECRET)
		.update(`unsubscribe:${user.id}:${user.email.toLowerCase()}`)
		.digest('base64url');
}

export function verifyUnsubscribeToken(user: Pick<User, 'id' | 'email'>, token: string) {
	const expected = Buffer.from(unsubscribeToken(user));
	const actual = Buffer.from(String(token ?? ''));
	return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

const query = (user: Pick<User, 'id' | 'email'>) => `u=${user.id}&t=${unsubscribeToken(user)}`;

// page where the user confirms, linked from the email body
export const unsubscribePageUrl = (user: Pick<User, 'id' | 'email'>) => `${process.env.APP_URL}/unsubscribe?${query(user)}`;

// RFC 8058 one-click endpoint for the List-Unsubscribe header (Gmail's and Yahoo's built-in unsubscribe button)
export const oneClickUnsubscribeUrl = (user: Pick<User, 'id' | 'email'>) => `${process.env.APP_URL}/api/unsubscribe/oneclick?${query(user)}`;
