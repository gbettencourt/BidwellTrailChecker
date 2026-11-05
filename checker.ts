import nodemailer from 'nodemailer';
import schedule from 'node-schedule';
import DbUtil, { User } from './db.js';
import dotenv from 'dotenv';
import twilio from 'twilio';
import { readOverride } from './override-util.js';
import { recordStatus, TrailStatus } from './history.js';
import { parseTrailStatus } from './status-parser.js';
import { statusChangeEmail, welcomeEmail } from './email-templates.js';
import { oneClickUnsubscribeUrl } from './unsubscribe.js';

// lets Gmail and Yahoo show their own unsubscribe button, which unsubscribes in one click (RFC 8058)
const unsubscribeHeaders = (user: User) => ({
	'List-Unsubscribe': `<${oneClickUnsubscribeUrl(user)}>`,
	'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
});

dotenv.config();

type Config = {
	lastCheck: Date;
	lastStatus: string;
	checking: boolean;
	checkFailing: boolean;
};

export default class Checker {
	config: Config;
	constructor(runScheduler = true) {
		this.config = {
			lastCheck: new Date(),
			lastStatus: 'NULL',
			checking: false,
			checkFailing: false
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

		if (this.config.checking || readOverride() !== 'auto') {
			console.log('checking in process or override active, skipping');
			return;
		}

		this.config.checking = true;
		try {
			const response = await fetch(process.env.TRAIL_STATUS_URL);
			if (!response.ok) {
				this.reportCheckFailure(`status page returned HTTP ${response.status}`);
				return;
			}
			const body = await response.text();

			console.log('fetch complete, parsing...');

			const result = parseTrailStatus(body);
			if ('error' in result) {
				// keep the last known status rather than guessing
				this.reportCheckFailure(result.error);
				return;
			}

			const trailStatus = result.status;
			console.log(`processing complete, trail status: ${trailStatus}`);
			this.checkRecovered();

			await recordStatus(trailStatus, 'auto').catch((e) => console.log('error recording status history', e));

			if (trailStatus != this.config.lastStatus && this.config.lastStatus != 'NULL') {
				await this.sendNotifications(trailStatus);
			}

			this.config.lastStatus = trailStatus;
			this.config.lastCheck = new Date();
		} catch (e) {
			this.reportCheckFailure(`error checking status: ${e}`);
		} finally {
			this.config.checking = false;
		}
	}

	// email the admin once when checks start failing, not on every 15 minute retry
	reportCheckFailure(reason: string) {
		console.log(`status check failed: ${reason}`);
		if (this.config.checkFailing) return;

		this.config.checkFailing = true;
		this.sendMail({
			to: process.env.SMTP_ADMIN_EMAIL,
			subject: 'Trail Checker: status check failing',
			text: `The trail status check failed and the last known status (${this.config.lastStatus}) is being kept.\n\nReason: ${reason}\n\nStatus page: ${process.env.TRAIL_STATUS_URL}\n\nYou'll get one more email when checks recover.`
		});
	}

	checkRecovered() {
		if (!this.config.checkFailing) return;

		this.config.checkFailing = false;
		console.log('status check recovered');
		this.sendMail({
			to: process.env.SMTP_ADMIN_EMAIL,
			subject: 'Trail Checker: status check recovered',
			text: 'The trail status check is working again.'
		});
	}

	public manualOverride(value: 'open' | 'closed') {
		this.config.lastStatus = value === 'open' ? 'Open' : 'Closed';
		this.config.lastCheck = new Date();
		recordStatus(this.config.lastStatus as TrailStatus, 'manual').catch((e) => console.log('error recording status history', e));
		this.sendNotifications(this.config.lastStatus);
	}

	async sendNotifications(trailStatus: string) {
		const dbUtil = new DbUtil();
		const users = await dbUtil.fetchUsers();

		console.log('sending notifications');

		const smsText = `Bidwell Trail Status Update. Trail status changed to: ${trailStatus}`;

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
							replyTo: process.env.SMTP_ADMIN_EMAIL,
							to: user.email,
							...statusChangeEmail(trailStatus, user),
							headers: unsubscribeHeaders(user)
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
							body: smsText,
							from: `+1${process.env.SMS_FROM}`,
							to: `+1${user.phone}`
						});
						console.log(message.sid);
					} catch (e) {
						console.log(e);
					}
				}

				// rate limit
				// await this.pause();
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

	// SMTP server from SMTP_HOST/SMTP_PORT (e.g. Amazon SES), or Gmail when SMTP_HOST isn't set
	getTransporter(pool = false) {
		const auth = {
			user: process.env.SMTP_USER,
			pass: process.env.SMTP_PWD
		};
		if (!process.env.SMTP_HOST) {
			return nodemailer.createTransport({ service: 'Gmail', pool, auth });
		}

		const port = Number(process.env.SMTP_PORT) || 587;
		return nodemailer.createTransport({
			host: process.env.SMTP_HOST,
			port,
			// 465 is TLS from the start; 587 upgrades with STARTTLS
			secure: port === 465,
			pool,
			auth
		});
	}

	sendNewUserNotification(email: string, phone: string, existingUser: User) {
		return this.sendMail({
			to: process.env.SMTP_ADMIN_EMAIL,
			subject: existingUser ? 'User updated' : 'New user registered',
			text: `user details: email=${email}, phone=${phone}`
		});
	}

	sendUserUnsubNotification(email: string) {
		return this.sendMail({
			to: process.env.SMTP_ADMIN_EMAIL,
			subject: 'User unsubscribed',
			text: `user: ${email}`
		});
	}

	sendRegEmail(user: User) {
		return this.sendMail({
			to: user.email,
			...welcomeEmail(this.config.lastStatus, user),
			headers: unsubscribeHeaders(user)
		});
	}

	// never rejects, so callers can fire and forget without an unhandled rejection crashing the process
	async sendMail(mail: { to: string; subject: string; text: string; html?: string; headers?: Record<string, string> }) {
		try {
			await this.getTransporter().sendMail({ from: process.env.SMTP_FROM_EMAIL, ...mail });
		} catch (e) {
			console.log(`error sending email "${mail.subject}" to ${mail.to}`, e);
		}
	}

	async pause() {
		await new Promise((resolve) => setTimeout(resolve, 2000));
	}
}
