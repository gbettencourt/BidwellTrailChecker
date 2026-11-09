import express from 'express';
import winston from 'winston';
import expressWinston from 'express-winston';
import { body, check, validationResult } from 'express-validator';
import { join, dirname } from 'path';
import { readFile } from 'node:fs/promises';
import { randomInt } from 'node:crypto';
import Checker from './checker.js';
import DbUtil from './db.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import adminRouter from './admin-router.js';
import { statusHistory } from './history.js';
import { renderPage } from './seo.js';
import { renderApp, renderPageContent, renderPageMetadata } from './ssr-renderer.js';
import { verifyUnsubscribeToken } from './unsubscribe.js';
dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const seoSiteUrl = process.env.APP_URL || 'https://www.chicomtb.com';

//init trail checker
const checker = new Checker();
checker.fetchStatus();

//init db client
const dbUtil = new DbUtil();

const app = express();

app.set('trust proxy', 'loopback');
app.use(express.json());

app.use(
	expressWinston.logger({
		transports: [new winston.transports.Console()],
		format: winston.format.combine(winston.format.timestamp({ format: 'MM-DD-YYYY HH:mm:ss' }), winston.format.json()),
		// Log only the fields you need, not all headers
		requestWhitelist: ['url', 'method', 'headers.user-agent', 'headers.referer'],
		responseWhitelist: ['statusCode'],
		headerBlacklist: ['cookie', 'authorization'],
		msg: 'HTTP {{req.method}} {{req.url}} {{res.statusCode}} {{res.responseTime}}ms',
		dynamicMeta: (req) => ({
			ip: req.headers['x-forwarded-for'] || req.ip, // behind Caddy, also set app.set('trust proxy', true)
			userAgent: req.headers['user-agent']
		})
	})
);

app.get('/', async (_req, res) => {
	const html = await readFile(join(__dirname, '/client/build/index.html'), 'utf8');
	const status = checker.currentStatus();
	const history = await statusHistory();
	const initialData = {
		trailStatus: status.trailStatus,
		lastCheck: status.lastCheck.toISOString(),
		statusSince: history.current,
		captchaCode: randomInt(1000, 9999),
		renderedAt: Date.now(),
		siteUrl: seoSiteUrl
	};
	const renderedApp = await renderApp('/', initialData);
	res.type('html').send(renderPage(html, { ...renderedApp, initialData }));
});

app.get('/map', async (_req, res) => {
	const html = await readFile(join(__dirname, '/client/build/index.html'), 'utf8');
	const page = {
		title: 'Upper Bidwell Park Trail Map | Bidwell Trail Checker',
		description:
			'Explore bike-legal trails in Upper Bidwell Park, Chico, California, including trails that remain open during park closures.',
		heading: 'Upper Bidwell Park trail map'
	};
	res.type('html').send(
		renderPage(html, {
			metadata: await renderPageMetadata('/map', 'Unknown', undefined, seoSiteUrl),
			markup: await renderPageContent(page.heading, page.description)
		})
	);
});

app.get('/history', async (_req, res) => {
	const html = await readFile(join(__dirname, '/client/build/index.html'), 'utf8');
	const page = {
		title: 'Bidwell Park Trail Status History | Bidwell Trail Checker',
		description: 'Review recorded trail openings and closures for Upper Bidwell Park in Chico, California.',
		heading: 'Upper Bidwell Park trail status history'
	};
	res.type('html').send(
		renderPage(html, {
			metadata: await renderPageMetadata('/history', 'Unknown', undefined, seoSiteUrl),
			markup: await renderPageContent(page.heading, page.description)
		})
	);
});

app.get('/report', async (_req, res) => {
	const html = await readFile(join(__dirname, '/client/build/index.html'), 'utf8');
	const page = {
		title: 'Report Trail Status or Issue | Bidwell Trail Checker',
		description: 'Report a trail status discrepancy or an issue on the Upper Bidwell Park trails in Chico, California.',
		heading: 'Report a trail status or issue'
	};
	res.type('html').send(
		renderPage(html, {
			metadata: await renderPageMetadata('/report', 'Unknown', undefined, seoSiteUrl),
			markup: await renderPageContent(page.heading, page.description)
		})
	);
});

// Serve the static files from the React app
app.use(express.static(join(__dirname, '/client/build')));

app.get('/api/trailstatus', (req, res) => {
	res.json(checker.currentStatus());
});

app.get('/api/statushistory', async (req, res) => {
	res.json(await statusHistory());
});

app.post(
	'/api/trail-report',
	[
		check('type').isIn(['status', 'issue']),
		check('location').trim().isLength({ min: 2, max: 120 }),
		check('details')
			.if(body('type').equals('issue'))
			.trim()
			.isLength({ min: 5, max: 2000 }),
		check('observedStatus')
			.if(body('type').equals('status'))
			.isIn(['open', 'closed']),
		check('observedAt').optional({ checkFalsy: true }).isISO8601(),
		check('email').optional({ checkFalsy: true }).isEmail().normalizeEmail()
	],
	async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ success: false, error: 'Please check the report details and try again.' });
		}

		if (!process.env.SMTP_ADMIN_EMAIL) {
			console.error('Cannot send trail report: SMTP_ADMIN_EMAIL is not configured');
			return res.status(500).json({ success: false, error: 'Trail reports are temporarily unavailable.' });
		}

		try {
			await checker.sendTrailReport({
				type: req.body.type,
				location: req.body.location.trim(),
				details: req.body.type === 'issue' ? req.body.details.trim() : undefined,
				observedStatus: req.body.type === 'status' ? req.body.observedStatus : undefined,
				observedAt: req.body.observedAt || undefined,
				email: req.body.email || undefined
			});
			return res.json({ success: true });
		} catch (error) {
			console.error('Failed to send trail report', error);
			return res.status(500).json({ success: false, error: 'Unable to send your report right now. Please try again later.' });
		}
	}
);

app.post(
	'/api/registeremail',
	[
		check('email').isEmail(),
		check('phone')
			.if(body('phone').exists({ checkFalsy: true }))
			.isMobilePhone('en-US')
	],
	async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			res.send({
				success: false,
				error: 'invalid email/phone'
			});
			return;
		}
		const email = req.body.email;
		const phone = req.body.phone;
		console.log('register new email=' + email);
		console.log('register new phone=' + phone);

		const users = await dbUtil.fetchUsers();
		const existingUser = users.find((user) => user.email === email);

		let user = existingUser;
		if (existingUser) {
			console.log(`updating existing user, email=${email}, phone=${phone}`);
			existingUser.phone = phone;
			await dbUtil.save();
		} else {
			user = await dbUtil.addUser(email, phone);
		}

		//send confirmation emails (errors are logged inside the checker)
		checker.sendNewUserNotification(email, phone, existingUser);
		checker.sendRegEmail(user);

		res.send({
			success: true
		});
	}
);

app.post('/api/rmemail', [check('email').isEmail()], async (req, res) => {
	console.log(req.body);

	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		res.send({
			success: false,
			error: 'invalid email'
		});
		return;
	}
	const email = req.body.email;
	console.log('removing email=' + email);
	checker.sendUserUnsubNotification(email);

	await dbUtil.removeUser(email);
	res.send({
		success: true
	});
});

// unsubscribe from a signed link in an email (u = user id, t = token); unknown or already-removed users succeed quietly
async function unsubscribeFromLink(id: unknown, token: unknown) {
	const user = await dbUtil.fetchUser(Number(id));
	if (!user) return true;
	if (!verifyUnsubscribeToken(user, String(token))) return false;

	console.log(`unsubscribing via email link, email=${user.email}`);
	checker.sendUserUnsubNotification(user.email);
	await dbUtil.removeUser(user.email);
	return true;
}

app.post('/api/unsubscribe', async (req, res) => {
	const ok = await unsubscribeFromLink(req.body.u, req.body.t);
	res.status(ok ? 200 : 400).send({ success: ok, error: ok ? undefined : 'This unsubscribe link is invalid or has expired' });
});

// one-click unsubscribe from the mail client's own button (List-Unsubscribe-Post, RFC 8058)
app.post('/api/unsubscribe/oneclick', express.urlencoded({ extended: false }), async (req, res) => {
	const ok = await unsubscribeFromLink(req.query.u, req.query.t);
	res.sendStatus(ok ? 200 : 400);
});

app.use('/api/admin', adminRouter(checker));

// Handles any requests that don't match the ones above
app.get(/.*/, (req, res) => {
	res.sendFile(join(__dirname + '/client/build/index.html'));
});

if (!process.env.APP_URL) {
	console.warn('APP_URL is not set, so links in emails (including unsubscribe links) will be broken');
}

//start server
const port = process.env.PORT || 5000;
app.listen(port);

console.log('App is listening on port ' + port);
