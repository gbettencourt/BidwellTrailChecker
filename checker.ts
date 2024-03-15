import { parse } from 'node-html-parser';
import nodemailer from 'nodemailer';
import schedule from 'node-schedule';
import DbUtil, { User } from './db.js';
import dotenv from 'dotenv';
import twilio from 'twilio';
import fetch from 'node-fetch';

dotenv.config();

type Config = {
	lastCheck: Date;
	lastStatus: string;
	checking: boolean;
};

export default class Checker {
	config: Config;
	constructor(runScheduler = true) {
		this.config = {
			lastCheck: new Date(),
			lastStatus: 'NULL',
			checking: false
		};
		if (runScheduler) {
			//check every 15 minutes
			schedule.scheduleJob('*/15 * * * *', () => {
				this.fetchStatus();
			});
		}
	}

	public async fetchStatus() {
		console.log('fetching status HTML page');

		if (this.config.checking) {
			console.log('checking in process, skipping');
			return;
		}

		this.config.checking = true;
		try {
			const response = await fetch(process.env.TRAIL_STATUS_URL);
			const body = await response.text();

			console.log('fetch complete, parsing...');

			const root = parse(body);
			const tableElem = root.querySelector('table').parentNode;

			let trailStatus = tableElem.rawText.toLowerCase().indexOf('open') === -1 ? 'Closed' : 'Open';

			console.log(`processing complete, trail status: ${trailStatus}`);

			if (trailStatus != '') {
				if (trailStatus != this.config.lastStatus && this.config.lastStatus != 'NULL') {
					await this.sendNotifications(trailStatus);
				}

				this.config.lastStatus = trailStatus;
				this.config.lastCheck = new Date();
			}
		} finally {
			this.config.checking = false;
		}
	}

	async sendNotifications(trailStatus: string) {
		const dbUtil = new DbUtil();
		const users = await dbUtil.fetchUsers();

		console.log('sending notifications');

		const subject = 'Bidwell Trail Status Update';
		const text = `Trail status changed to: ${trailStatus}`;

		try {
			const smsClient = twilio(process.env.SMS_SID, process.env.SMS_TOKEN);
			const transporter = this.getTransporter(true);

			for (const user of users) {
				console.log(`sending notification to: ${user.email}`);

				if (user.skipMail) {
					console.log('skipMail=true');
				} else {
					try {
						const info = await transporter.sendMail({
							from: process.env.SMTP_FROM_EMAIL,
							to: user.email,
							subject,
							text
						});
						console.log(`Message sent: ${info.messageId}`);
					} catch (e) {
						console.log(e);
					}
				}

				if (user.phone) {
					console.log(`${user.email} has phone ${user.phone}, sending sms`);

					try {
						const message = await smsClient.messages.create({
							body: `${subject}. ${text}`,
							from: `+1${process.env.SMS_FROM}`,
							to: `+1${user.phone}`
						});
						console.log(message.sid);
					} catch (e) {
						console.log(e);
					}
				}

				// rate limit
				await this.pause();
			}
		} catch (e) {
			console.log('error sending emails', e);
		}
	}

	currentStatus() {
		return {
			trailStatus: this.config.lastStatus,
			lastCheck: this.config.lastCheck
		};
	}

	getTransporter(pool = false) {
		return nodemailer.createTransport({
			service: 'Gmail',
			pool,
			auth: {
				user: process.env.SMTP_USER,
				pass: process.env.SMTP_PWD
			}
		});
	}

	sendNewUserNotification(email: string, phone: string, existingUser: User) {
		this.getTransporter().sendMail({
			from: process.env.SMTP_FROM_EMAIL,
			to: process.env.SMTP_ADMIN_EMAIL,
			subject: existingUser ? 'User updated' : 'New user registered',
			text: `user details: email=${email}, phone=${phone}`
		});
	}

	sendUserUnsubNotification(email: string) {
		this.getTransporter().sendMail({
			from: process.env.SMTP_FROM_EMAIL,
			to: process.env.SMTP_ADMIN_EMAIL,
			subject: 'User unsubscribed',
			text: `user: ${email}`
		});
	}

	sendRegEmail(email: string) {
		this.getTransporter().sendMail({
			from: process.env.SMTP_FROM_EMAIL,
			to: email,
			subject: 'Trail Checker Registration',
			text: `Thank you for registering!  The current trail status is ${this.config.lastStatus}. We'll send you an update when that changes!`
		});
	}

	async pause() {
		await new Promise((resolve) => setTimeout(resolve, 2000));
	}
}
