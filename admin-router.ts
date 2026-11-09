import express from 'express';
import jwt from 'jsonwebtoken';
import { OverrideValue, readOverride, writeOverride } from './override-util.js';
import Checker from 'checker.js';
import DbUtil from './db.js';

const router = express.Router();
let checker: Checker;

/**
 * ===== CONFIG =====
 */
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD!;
const ADMIN_SECRET = process.env.ADMIN_SECRET!;

async function findAdminUser() {
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
 * ===== LOGIN =====
 */
router.post('/login', (req, res) => {
	const { password } = req.body;

	if (password !== ADMIN_PASSWORD) {
		return res.status(401).json({ error: 'Invalid password' });
	}

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
	console.log('Admin status requested');
	const override = readOverride();

	res.json({
		override
	});
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
			console.error(`Cannot send admin test email: ${result.error}`);
			return res.status(result.status).json({ error: result.error });
		}

		await checker.sendStatusEmail(status === 'open' ? 'Open' : 'Closed', result.admin);
		res.json({ ok: true });
	} catch (error) {
		console.error('Failed to send admin test email', error);
		res.status(500).json({ error: 'Failed to send test email' });
	}
});

router.post('/test-sms', async (_req, res) => {
	if (!process.env.SMS_SID || !process.env.SMS_TOKEN || !process.env.SMS_FROM) {
		console.error('Cannot send admin test SMS: Twilio configuration is incomplete');
		return res.status(500).json({ error: 'Twilio SMS configuration is incomplete' });
	}

	try {
		const result = await findAdminUser();
		if (!('admin' in result)) {
			console.error(`Cannot send admin test SMS: ${result.error}`);
			return res.status(result.status).json({ error: result.error });
		}

		if (!result.admin.phone) {
			console.error('Cannot send admin test SMS: the admin account has no phone number');
			return res.status(400).json({ error: 'The admin account has no phone number for SMS testing' });
		}
		if (!/^\d{10}$/.test(result.admin.phone)) {
			console.error('Cannot send admin test SMS: the admin account has an invalid phone number');
			return res.status(500).json({ error: 'The admin account has an invalid phone number' });
		}

		await checker.sendSms(
			result.admin.phone,
			`Bidwell Trail Checker test SMS. SMS sending is working.\n\nView trail status & map: ${process.env.APP_URL}`
		);
		res.json({ ok: true });
	} catch (error) {
		console.error('Failed to send admin test SMS', error);
		res.status(500).json({ error: 'Failed to send test SMS' });
	}
});

/**
 * ===== SET OVERRIDE =====
 */
router.post('/override', (req, res) => {
	const { value } = req.body as { value: OverrideValue };
	console.log(`Admin override set to ${JSON.stringify(req.body)}`);

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
