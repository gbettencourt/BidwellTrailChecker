import express from 'express';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { OverrideValue, readOverride, writeOverride } from './override-util.js';
import Checker from 'checker.js';
import { check } from 'express-validator';

const router = express.Router();
let checker: Checker;

/**
 * ===== CONFIG =====
 */
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD!;
const ADMIN_SECRET = process.env.ADMIN_SECRET!;

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
