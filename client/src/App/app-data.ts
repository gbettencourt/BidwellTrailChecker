// keep the .js extension: the server imports this type under nodenext
import type { StatusEvent } from './util/Util.js';

export type AppInitialData = {
	trailStatus: string;
	lastCheck: string;
	statusSince: StatusEvent | null;
	captchaCode: number;
	renderedAt: number;
	siteUrl: string;
	// address trail alerts come from (SMTP_FROM_EMAIL), so the signup
	// success message can tell new users what to unblock in spam
	notificationFromEmail?: string;
};
