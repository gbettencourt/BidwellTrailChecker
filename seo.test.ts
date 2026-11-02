import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderIndexablePage, renderTrailStatusPage } from './seo.js';

const template = `
<html><head>
<title>Bidwell Trail Checker</title>
<meta name="description" content="Sign up to receive trail status updates for Bidwell Park in Chico California" />
<link rel="canonical" href="https://chicomtb.com/" />
<script type="application/ld+json" id="trail-status-jsonld"></script>
</head><body><div id="root"><!-- TRAIL_STATUS_CONTENT --></div></body></html>`;

test('renders current status in page content, search metadata, and structured data', () => {
	const html = renderTrailStatusPage(template, { trailStatus: 'Open', lastCheck: '2026-11-02T18:00:00.000Z' }, 'https://chicomtb.com');

	assert.match(html, /<title>Upper Bidwell Park trails: Open \| Bidwell Trail Checker<\/title>/);
	assert.match(html, /<h1>Upper Bidwell Park trails: Open<\/h1>/);
	assert.match(html, /currently Open\. Last checked/);
	assert.match(html, /"name":"Current trail status","value":"Open"/);
	assert.match(html, /"dateModified":"2026-11-02T18:00:00.000Z"/);
});

test('does not present an unknown status as current or attach a misleading check date', () => {
	const html = renderTrailStatusPage(template, { trailStatus: 'NULL', lastCheck: '2026-11-02T18:00:00.000Z' }, 'https://chicomtb.com');

	assert.match(html, /<h1>Upper Bidwell Park trails: Status unavailable<\/h1>/);
	assert.match(html, /"name":"Current trail status","value":"Unknown"/);
	assert.doesNotMatch(html, /"dateModified"/);
});

test('does not treat an unrecognized status as trusted page content', () => {
	const html = renderTrailStatusPage(template, { trailStatus: '<script>', lastCheck: 'not-a-date' }, 'https://chicomtb.com');

	assert.match(html, /"value":"Unknown"/);
	assert.doesNotMatch(html, /<h1>[^<]*<script>/);
	assert.doesNotMatch(html, /"value":"<script>"/);
});

test('renders a public route with its own canonical URL and page metadata', () => {
	const html = renderIndexablePage(
		template,
		{
			path: '/history',
			title: 'Bidwell Park Trail Status History | Bidwell Trail Checker',
			description: 'Review recorded trail openings and closures.',
			heading: 'Upper Bidwell Park trail status history'
		},
		'https://chicomtb.com'
	);

	assert.match(html, /<title>Bidwell Park Trail Status History \| Bidwell Trail Checker<\/title>/);
	assert.match(html, /<link rel="canonical" href="https:\/\/chicomtb\.com\/history" \/>/);
	assert.match(html, /<h1>Upper Bidwell Park trail status history<\/h1>/);
	assert.doesNotMatch(html, /trail-status-jsonld/);
});
