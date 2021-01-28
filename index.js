const express = require('express');
var winston = require('winston'),
	expressWinston = require('express-winston');
const { check, validationResult } = require('express-validator');
const path = require('path');
const Checker = require('./checker');
const DbUtil = require('./db');
require('dotenv').config();

const app = express();
app.use(express.json());

app.use(
	expressWinston.logger({
		transports: [new winston.transports.Console()],
		format: winston.format.combine(
			winston.format.colorize({ all: true }),
			winston.format.timestamp({
				format: 'MM-DD-YYYY HH:mm:ss',
			}),
			winston.format.printf((info) => {
				return `${info.timestamp}: ${info.message}`;
			})
		),
	})
);

// Serve the static files from the React app
app.use(express.static(path.join(__dirname, '/client/build')));

app.get('/api/users', async (req, res) => {
	let list = [];
	if (req.connection.localAddress === req.connection.remoteAddress) {
		list = await dbUtil.fetchEmails();
	}
	res.json(list);
});

app.get('/api/trailstatus', (req, res) => {
	res.json(checker.currentStatus());
});

app.post('/api/registeremail', [check('email').isEmail()], async (req, res) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		console.log('registeremail invalid email=' + req.body);
		res.send({
			success: false,
			error: 'invalid email',
		});
		return;
	}
	let email = req.body.email;
	console.log('register new email=' + email);

	let list = await dbUtil.fetchEmails();
	if (list.includes(email)) {
		res.send({
			success: false,
			error: 'email already registered',
		});
		return;
	}
	await dbUtil.addEmail(email);

	//send confirmation emails
	try {
		checker.sendNewUserNotification(email, score);
		checker.sendRegEmail(email);
	} catch (e) {
		console.log('error sending new user email', e);
	}

	res.send({
		success: true,
	});
});

app.post('/api/rmemail', [check('email').isEmail()], async (req, res) => {
	console.log(req.body);

	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		res.send({
			success: false,
			error: 'invalid email',
		});
		return;
	}
	let email = req.body.email;
	console.log('removing email=' + email);
	try {
		checker.sendUserUnsubNotification(email);
	} catch (e) {
		console.log('error sending email', e);
	}

	await dbUtil.removeEmail(email);
	res.send({
		success: true,
	});
});

// Handles any requests that don't match the ones above
app.get('*', (req, res) => {
	res.sendFile(path.join(__dirname + '/client/build/index.html'));
});

//init trail checker
let checker = new Checker();
//init db client
let dbUtil = new DbUtil();

//start server
const port = process.env.PORT || 5000;
app.listen(port);

console.log('App is listening on port ' + port);
