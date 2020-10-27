const request = require('request');
const HTMLParser = require('node-html-parser');
const nodemailer = require('nodemailer');
const schedule = require('node-schedule');
//const format = require("string-template");
const DbUtil = require('./db');
//const htmlTmplFile = 'email-tmpl.html';
require('dotenv').config();

module.exports = class Checker {
	constructor() {
		this.config = {
			lastCheck: new Date(),
			lastStatus: 'NULL',
		};
		this.fetchStatus();

		//check every 5 minutes
		schedule.scheduleJob('*/5 * * * *', () => {
			this.fetchStatus();
		});
	}

	fetchStatus() {
		let trailStatus = '';
		console.log('fetching status HTML page');

		request(process.env.TRAIL_STATUS_URL, {}, async (err, res, body) => {
			console.log('fetch complete, parsing...');
			let root = HTMLParser.parse(body);

			let trailStatus =
				root
					.querySelector('table td')
					.parentNode.rawText.indexOf('Open') === -1
					? 'Closed'
					: 'Open';

			/* let trailStatusNode = root.querySelector('#sideColumn');
			if (trailStatusNode) {
				let childParas = trailStatusNode.querySelectorAll('p');
				for (let p of childParas) {
					if (p.rawText.startsWith('UPPER PARK TRAILS')) {
						if (p.lastChild.rawText.trim() == 'OPEN') {
							trailStatus = 'Open';
							break;
						} else {
							trailStatus = 'Closed';
						}
					}
				}
			} else {
				console.log('Query for #sideColumn failed! Body: ', body);
			} */

			console.log('processing complete, trail status: ' + trailStatus);

			if (trailStatus != '') {
				if (
					trailStatus != this.config.lastStatus &&
					this.config.lastStatus != 'NULL'
				) {
					await this.sendMail(trailStatus);
				}

				this.config.lastStatus = trailStatus;
				this.config.lastCheck = new Date();
			}
		});
	}

	async sendMail(trailStatus) {
		let dbUtil = new DbUtil();
		let emailList = await dbUtil.fetchEmails();
		dbUtil.close();

		console.log('sending email notifications');

		try {
			//let htmlTmpl = fs.readFileSync(htmlTmplFile).toString();

			let transporter = this.getTransporter();

			for (let email of emailList) {
				console.log('sending email to:' + email);
				/*
                let html = format(htmlTmpl, {
                    email: email,
                    trailStatus: trailStatus,
                    statusColor: trailStatus == "Open" ? "green" : "red"
                });
                */
				let info = await transporter.sendMail({
					from: process.env.SMTP_FROM_EMAIL,
					to: email,
					subject: 'Bidwell Trail Status Update',
					//html: html
					text: 'Trail status changed to: ' + trailStatus,
				});
				console.log('Message sent: %s', info.messageId);
			}
		} catch (e) {
			console.log('error sending emails', e);
		}
	}

	currentStatus() {
		return {
			trailStatus: this.config.lastStatus,
			lastCheck: this.config.lastCheck,
		};
	}

	getTransporter() {
		return nodemailer.createTransport({
			host: process.env.SMTP_HOST,
			port: process.env.SMTP_PORT,
			secure: false,
			auth: {
				user: process.env.SMTP_USER,
				pass: process.env.SMTP_PWD,
			},
		});
	}

	sendNewUserNotification(email, score) {
		this.getTransporter().sendMail({
			from: process.env.SMTP_FROM_EMAIL,
			to: process.env.SMTP_ADMIN_EMAIL,
			subject: 'New user registered',
			text: 'New user: ' + email + ' Score: ' + score,
		});
	}

	sendNewUserFailedNotification(email, score) {
		this.getTransporter().sendMail({
			from: process.env.SMTP_FROM_EMAIL,
			to: process.env.SMTP_ADMIN_EMAIL,
			subject: 'New user registration failed',
			text: 'Email: ' + email + ' Score: ' + score,
		});
	}

	sendUserUnsubNotification(email) {
		this.getTransporter().sendMail({
			from: process.env.SMTP_FROM_EMAIL,
			to: process.env.SMTP_ADMIN_EMAIL,
			subject: 'User unsubscribed',
			text: 'user: ' + email,
		});
	}

	sendRegEmail(email) {
		this.getTransporter().sendMail({
			from: process.env.SMTP_FROM_EMAIL,
			to: email,
			subject: 'Trail Checker Registration',
			text:
				'Thank you for registering!  The current trail status is ' +
				this.config.lastStatus +
				". We'll send you an update when that changes!",
		});
	}
};
