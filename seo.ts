type TrailStatusSnapshot = {
	trailStatus: string;
	lastCheck: Date | string;
};

type IndexablePage = {
	path: string;
	title: string;
	description: string;
	heading: string;
};

const PARK_NAME = 'Upper Bidwell Park trails';
const PAGE_TITLE = 'Bidwell Trail Checker';

function escapeHtml(value: string) {
	return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function replaceRequired(html: string, pattern: RegExp, replacement: string) {
	if (!pattern.test(html)) throw new Error(`Could not find SEO template element: ${pattern}`);
	return html.replace(pattern, replacement);
}

function replaceMarker(html: string, marker: string, replacement: string) {
	if (!html.includes(marker)) throw new Error(`Could not find SEO template marker: ${marker}`);
	return html.replace(marker, replacement);
}

function renderPageMetadata(html: string, page: IndexablePage, siteUrl: string) {
	const canonicalUrl = new URL(page.path, siteUrl).href;
	let result = replaceRequired(html, /<title>[^<]*<\/title>/, `<title>${escapeHtml(page.title)}</title>`);
	result = replaceRequired(
		result,
		/<meta name="description" content="[^"]*" \/>/,
		`<meta name="description" content="${escapeHtml(page.description)}" />`
	);
	result = replaceRequired(result, /<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`);
	result = replaceRequired(result, /<script type="application\/ld\+json" id="trail-status-jsonld"><\/script>/, '');
	return replaceMarker(
		result,
		'<!-- TRAIL_STATUS_CONTENT -->',
		`<main><h1>${escapeHtml(page.heading)}</h1><p>${escapeHtml(page.description)}</p></main>`
	);
}

export function renderIndexablePage(html: string, page: IndexablePage, siteUrl: string) {
	return renderPageMetadata(html, page, siteUrl);
}

export function renderTrailStatusPage(html: string, snapshot: TrailStatusSnapshot, siteUrl: string) {
	const status = snapshot.trailStatus === 'Open' || snapshot.trailStatus === 'Closed' ? snapshot.trailStatus : 'Unknown';
	const checkDate = snapshot.lastCheck instanceof Date ? new Date(snapshot.lastCheck.getTime()) : new Date(snapshot.lastCheck);
	const checkedAt = status !== 'Unknown' && !Number.isNaN(checkDate.getTime()) ? checkDate.toISOString() : undefined;
	const checkedText = checkedAt
		? ` Last checked ${new Intl.DateTimeFormat('en-US', {
				dateStyle: 'long',
				timeStyle: 'short',
				timeZone: 'America/Los_Angeles'
			}).format(checkDate)}.`
		: '';
	const description =
		status === 'Unknown'
			? 'Current trail status for Upper Bidwell Park in Chico, California. Check the latest status before visiting.'
			: `${PARK_NAME} are currently ${status}.${checkedText}`;
	const title = status === 'Unknown' ? `${PAGE_TITLE} | Upper Bidwell Park` : `${PARK_NAME}: ${status} | ${PAGE_TITLE}`;
	const canonicalUrl = new URL('/', siteUrl).href;
	const parkId = `${canonicalUrl}#upper-bidwell-park`;
	const structuredData = {
		'@context': 'https://schema.org',
		'@graph': [
			{
				'@type': 'WebSite',
				'@id': `${canonicalUrl}#website`,
				url: canonicalUrl,
				name: PAGE_TITLE,
				about: { '@id': parkId }
			},
			{
				'@type': 'Park',
				'@id': parkId,
				name: PARK_NAME,
				url: canonicalUrl,
				description,
				address: {
					'@type': 'PostalAddress',
					addressLocality: 'Chico',
					addressRegion: 'CA',
					addressCountry: 'US'
				},
				additionalProperty: {
					'@type': 'PropertyValue',
					name: 'Current trail status',
					value: status
				},
				...(checkedAt ? { dateModified: checkedAt } : {})
			}
		]
	};
	const safeStructuredData = JSON.stringify(structuredData).replaceAll('<', '\\u003c');
	const statusContent =
		status === 'Unknown'
			? `<main><h1>${PARK_NAME}: Status unavailable</h1><p>The current trail status is not available right now. Check back soon.</p></main>`
			: `<main><h1>${PARK_NAME}: ${status}</h1><p>${escapeHtml(description)}</p><p>Trail status for Upper Bidwell Park in Chico, California.</p></main>`;

	let result = replaceRequired(html, /<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`);
	result = replaceRequired(
		result,
		/<meta name="description" content="[^"]*" \/>/,
		`<meta name="description" content="${escapeHtml(description)}" />`
	);
	result = replaceRequired(result, /<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`);
	result = replaceRequired(result, /<script type="application\/ld\+json" id="trail-status-jsonld"><\/script>/, `<script type="application/ld+json" id="trail-status-jsonld">${safeStructuredData}</script>`);
	result = replaceMarker(result, '<!-- TRAIL_STATUS_CONTENT -->', statusContent);
	return result;
}
