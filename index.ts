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
dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));

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
		format: winston.format.combine(
			winston.format.colorize({ all: true }),
			winston.format.timestamp({
				format: 'MM-DD-YYYY HH:mm:ss'
			}),
			winston.format.printf((info) => {
				return `${info.timestamp}: ${info.message}`;
			})
		)
	})
);

app.get('/', async (_req, res) => {
	const html = await readFile(join(__dirname, '/client/build/index.html'), 'utf8');
	const status = checker.currentStatus();
	const history = await statusHistory();
	const siteUrl = process.env.APP_URL || 'https://chicomtb.com';
	const initialData = {
		trailStatus: status.trailStatus,
		lastCheck: status.lastCheck.toISOString(),
		statusSince: history.current,
		captchaCode: randomInt(1000, 9999),
		renderedAt: Date.now(),
		siteUrl
	};
	const renderedApp = await renderApp('/', initialData);
	res.type('html').send(renderPage(html, { ...renderedApp, initialData }));
});

app.get('/map', async (_req, res) => {
	const html = await readFile(join(__dirname, '/client/build/index.html'), 'utf8');
	const siteUrl = process.env.APP_URL || 'https://chicomtb.com';
	const page = {
		title: 'Upper Bidwell Park Trail Map | Bidwell Trail Checker',
		description: 'Explore bike-legal trails in Upper Bidwell Park, Chico, California, including trails that remain open during park closures.',
		heading: 'Upper Bidwell Park trail map'
	};
	res.type('html').send(
		renderPage(html, {
			metadata: await renderPageMetadata('/map', 'Unknown', undefined, siteUrl),
			markup: await renderPageContent(page.heading, page.description)
		})
	);
});

app.get('/history', async (_req, res) => {
	const html = await readFile(join(__dirname, '/client/build/index.html'), 'utf8');
	const siteUrl = process.env.APP_URL || 'https://chicomtb.com';
	const page = {
		title: 'Bidwell Park Trail Status History | Bidwell Trail Checker',
		description: 'Review recorded trail openings and closures for Upper Bidwell Park in Chico, California.',
		heading: 'Upper Bidwell Park trail status history'
	};
	res.type('html').send(
		renderPage(html, {
			metadata: await renderPageMetadata('/history', 'Unknown', undefined, siteUrl),
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

		if (existingUser) {
			console.log(`updating existing user, email=${email}, phone=${phone}`);
			existingUser.phone = phone;
			await dbUtil.save();
		} else {
			await dbUtil.addUser(email, phone);
		}

		//send confirmation emails (errors are logged inside the checker)
		checker.sendNewUserNotification(email, phone, existingUser);
		checker.sendRegEmail(email);

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

app.use('/api/admin', adminRouter(checker));

// Handles any requests that don't match the ones above
app.get(/.*/, (req, res) => {
	res.sendFile(join(__dirname + '/client/build/index.html'));
});

//start server
const port = process.env.PORT || 5000;
app.listen(port);

console.log('App is listening on port ' + port);
