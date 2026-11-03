import type { User } from './db.js';
import { unsubscribePageUrl } from './unsubscribe.js';

export type Email = { subject: string; html: string; text: string };

const COLORS = { Open: '#2e8b57', Closed: '#c0392b', Unknown: '#5f6b66' };

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * Shared layout: plain table markup with inline styles, which is what email clients render reliably.
 * Kept mostly text with no images or scripts so it doesn't look like bulk marketing mail to spam filters.
 */
function layout({ status, heading, paragraphs, user }: { status: string; heading: string; paragraphs: string[]; user: User }) {
	const color = COLORS[status as keyof typeof COLORS] ?? COLORS.Unknown;
	const appUrl = process.env.APP_URL;

	return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(heading)}</title></head>
<body style="margin:0;padding:0;background:#f4f6f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#1f2a24;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f2;padding:24px 12px;">
<tr><td align="center">
	<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid #e1e6e0;border-radius:14px;overflow:hidden;">
		<tr><td style="background:${color};padding:28px 24px;text-align:center;color:#ffffff;">
			<div style="font-size:12px;letter-spacing:1.5px;text-transform:uppercase;opacity:.9;">Upper Bidwell Park trails</div>
			<div style="font-size:40px;font-weight:800;line-height:1.1;margin-top:6px;">${escapeHtml(status.toUpperCase())}</div>
		</td></tr>
		<tr><td style="padding:24px;">
			<h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;">${escapeHtml(heading)}</h1>
			${paragraphs.map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.5;color:#3b4842;">${p}</p>`).join('\n\t\t\t')}
			<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0 8px;"><tr><td style="background:#2f6b4f;border-radius:10px;">
				<a href="${appUrl}" style="display:inline-block;padding:12px 20px;color:#ffffff;font-weight:600;font-size:15px;text-decoration:none;">View trail status &amp; map</a>
			</td></tr></table>
			<p style="margin:18px 0 0;font-size:13px;line-height:1.5;color:#5f6b66;">Status comes from the City of Chico's trail page and may lag behind. Always check the signs at the trailhead before you ride.</p>
		</td></tr>
		<tr><td style="padding:16px 24px;border-top:1px solid #e1e6e0;font-size:12px;line-height:1.5;color:#7a857f;">
			You're getting this because ${escapeHtml(user.email)} signed up for Bidwell Trail Checker alerts.
			<a href="${unsubscribePageUrl(user)}" style="color:#7a857f;">Unsubscribe</a>
		</td></tr>
	</table>
</td></tr>
</table>
</body>
</html>`;
}

const textFooter = (user: User) =>
	`Status comes from the City of Chico's trail page and may lag behind. Always check the signs at the trailhead before you ride.

View trail status & map: ${process.env.APP_URL}

You're getting this because ${user.email} signed up for Bidwell Trail Checker alerts.
Unsubscribe: ${unsubscribePageUrl(user)}`;

export function statusChangeEmail(status: string, user: User): Email {
	const closed = status === 'Closed';
	const heading = closed ? 'The Upper Park trails just closed' : 'The Upper Park trails are open again';
	const detail = closed
		? 'Bikes and horses are off the Upper Bidwell Park trails until the city reopens them. Hikers are still welcome.'
		: 'The city has reopened the Upper Bidwell Park trails. Enjoy the ride!';
	const mapNote = closed ? 'Trails outside of the park stay open during closures. They are highlighted on the trail map.' : '';

	return {
		subject: `Bidwell trails are now ${status.toUpperCase()}`,
		html: layout({ status, heading, paragraphs: [detail, mapNote].filter(Boolean), user }),
		text: [`Upper Bidwell Park trails: ${status.toUpperCase()}`, heading + '.', detail, mapNote, textFooter(user)]
			.filter(Boolean)
			.join('\n\n')
	};
}

export function welcomeEmail(status: string, user: User): Email {
	const known = status === 'Open' || status === 'Closed';
	const heading = "You're signed up for trail alerts";
	const detail = known
		? `The trails are currently <strong>${escapeHtml(status.toLowerCase())}</strong>. We'll email you as soon as that changes.`
		: "We'll email you as soon as the trail status changes.";

	return {
		subject: 'Welcome to Bidwell Trail Checker',
		html: layout({ status: known ? status : 'Unknown', heading, paragraphs: [detail], user }),
		text: [heading + '.', detail.replace(/<[^>]+>/g, ''), textFooter(user)].join('\n\n')
	};
}
