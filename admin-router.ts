import express from 'express';
import jwt from 'jsonwebtoken';
import { readOverride, writeOverride } from './override-util.js';
import type { OverrideValue } from './shared-types.js';
import Checker from './checker.js';
import DbUtil, { User } from './db.js';
import { getLatestLogId, getLogEntries, logError, logInfo } from './logger.js';

const router = express.Router();
let checker: Checker;

/**
 * ===== CONFIG =====
 */
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD!;
const ADMIN_SECRET = process.env.ADMIN_SECRET!;

async function findAdminUser(): Promise<{ admin: User } | { status: number; error: string }> {
	const adminEmail = process.env.SMTP_ADMIN_EMAIL;
	if (!adminEmail) {
		return { status: 500, error: 'SMTP_ADMIN_EMAIL is not configured' };
	}

	const users = await new DbUtil().fetchUsers();
	const admin = users.find((user) => user.email.trim().toLowerCase() === adminEmail.trim().toLowerCase());
	if (!admin) {
		return { status: 500, error: 'SMTP_ADMIN_EMAIL was not found in the user database' };
	}

	return { admin };
}

/**
 * ===== AUTH =====
 */
function createToken() {
	return jwt.sign({ role: 'admin' }, ADMIN_SECRET, {
		expiresIn: '7d'
	});
}

function verifyToken(token: string) {
	try {
		return jwt.verify(token, ADMIN_SECRET);
	} catch {
		return null;
	}
}

function adminAuthMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
	const token = req.headers.authorization?.replace('Bearer ', '');

	if (!token || !verifyToken(token)) {
		return res.status(401).json({ error: 'Unauthorized' });
	}

	next();
}

/**
 * ===== LOGIN RATE LIMIT =====
 * The admin password is a single shared secret, so the login endpoint is
 * the obvious brute-force target. Five failed logins lock the endpoint for
 * fifteen minutes; a successful login clears the count, and an expired
 * lock clears itself so the next failure starts a fresh count. One global
 * lock, not per IP — the admin logs in rarely, so simple beats tracking
 * addresses. The trade-off: an attacker can lock the admin out by failing
 * five times, and a restart clears it.
 */
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000;

let failedLoginAttempts = 0;
let loginLockedUntil: number | null = null;

function recordFailedLogin(ip: string) {
	failedLoginAttempts += 1;
	if (failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
		loginLockedUntil = Date.now() + LOGIN_LOCKOUT_MS;
		logError(`Admin login locked out from ${ip} after ${MAX_LOGIN_ATTEMPTS} failures`);
	}
}

/**
 * ===== LOGIN =====
 */
router.post('/login', (req, res) => {
	const { password } = req.body;
	const ip = req.ip ?? 'unknown';

	if (loginLockedUntil !== null) {
		if (Date.now() >= loginLockedUntil) {
			// the lock expired — the next failure starts a fresh count
			loginLockedUntil = null;
			failedLoginAttempts = 0;
		} else {
			res.set('Retry-After', String(Math.ceil((loginLockedUntil - Date.now()) / 1000)));
			return res.status(429).json({ error: 'Too many login attempts, try again later' });
		}
	}

	if (password !== ADMIN_PASSWORD) {
		logError(`Admin login failed from ${ip}`);
		recordFailedLogin(ip);
		return res.status(401).json({ error: 'Invalid password' });
	}

	failedLoginAttempts = 0;
	loginLockedUntil = null;
	logInfo(`Admin login succeeded from ${ip}`);
	const token = createToken();
	res.json({ token });
});

/**
 * ===== PROTECTED ROUTES =====
 */
router.use(adminAuthMiddleware);

/**
 * ===== STATUS =====
 */
router.get('/status', async (_req, res) => {
	logInfo('Admin status requested');
	const override = readOverride();

	res.json({
		override
	});
});

/**
 * ===== LOGS =====
 * Live tail of app events (status checks, notifications, signups,
 * admin actions). The admin page polls this every 2 seconds with the
 * id of the last entry it has; entries are the in-memory ring buffer
 * from logger.ts, so this only covers the current process lifetime.
 */
router.get('/logs', (req, res) => {
	const since = Number(req.query.since) || 0;
	res.json({ entries: getLogEntries(since), latestId: getLatestLogId() });
});

router.get('/users', async (_req, res) => {
	res.json(await new DbUtil().fetchEmails());
});

router.post('/test-email', async (req, res) => {
	const status = req.body?.status;
	if (status !== 'open' && status !== 'closed') {
		return res.status(400).json({ error: 'Status must be open or closed' });
	}

	try {
		const result = await findAdminUser();
		if (!('admin' in result)) {
			logError(`Cannot send admin test email: ${result.error}`);
			return res.status(result.status).json({ error: result.error });
		}

		const info = await checker.sendStatusEmail(status === 'open' ? 'Open' : 'Closed', result.admin);
		logInfo(`Admin test email sent: ${info.messageId}`);
		res.json({ ok: true });
	} catch (error) {
		logError('Failed to send admin test email', error);
		res.status(500).json({ error: 'Failed to send test email' });
	}
});

router.post('/test-sms', async (_req, res) => {
	if (!process.env.SMS_SID || !process.env.SMS_TOKEN || !process.env.SMS_FROM) {
		logError('Cannot send admin test SMS: Twilio configuration is incomplete');
		return res.status(500).json({ error: 'Twilio SMS configuration is incomplete' });
	}

	try {
		const result = await findAdminUser();
		if (!('admin' in result)) {
			logError(`Cannot send admin test SMS: ${result.error}`);
			return res.status(result.status).json({ error: result.error });
		}

		if (!result.admin.phone) {
			logError('Cannot send admin test SMS: the admin account has no phone number');
			return res.status(400).json({ error: 'The admin account has no phone number for SMS testing' });
		}
		if (!/^\d{10}$/.test(result.admin.phone)) {
			logError('Cannot send admin test SMS: the admin account has an invalid phone number');
			return res.status(500).json({ error: 'The admin account has an invalid phone number' });
		}

		const message = await checker.sendSms(
			result.admin.phone,
			`Bidwell Trail Checker test SMS. SMS sending is working.\n\nView trail status & map: ${process.env.APP_URL}`
		);
		logInfo(`Admin test SMS sent: ${message.sid}`);
		res.json({ ok: true });
	} catch (error) {
		logError('Failed to send admin test SMS', error);
		res.status(500).json({ error: 'Failed to send test SMS' });
	}
});

/**
 * ===== SET OVERRIDE =====
 */
router.post('/override', (req, res) => {
	const { value } = req.body as { value: OverrideValue };
	logInfo(`Admin override set to ${JSON.stringify(req.body)}`);

	if (!['open', 'closed', 'auto'].includes(value)) {
		return res.status(400).json({ error: 'Invalid value' });
	}

	writeOverride(value);

	if (value !== 'auto') {
		// If override is set to open or closed, immediately update status and notify users
		checker.manualOverride(value);
	}

	res.json({ ok: true });
});

/**
 * ===== OPTIONAL: REFRESH =====
 */
router.post('/refresh', async (_req, res) => {
	await checker.fetchStatus();
	res.json({ ok: true });
});

export default (checkerInstance: Checker) => {
	checker = checkerInstance;
	return router;
};
