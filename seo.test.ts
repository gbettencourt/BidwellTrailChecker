import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderPage } from './seo.js';

const template = `
<html><head><!-- PAGE_METADATA --><!-- SSR_STYLES --></head>
<body><div id="root"><!-- TRAIL_STATUS_CONTENT --></div>
<script type="application/json" id="app-initial-data"><!-- APP_INITIAL_DATA --></script></body></html>`;

test('assembles React-rendered metadata, styles, content, and safely serialized initial data', () => {
	const html = renderPage(template, {
		metadata: '<title>Trail status</title><script type="application/ld+json">{}</script>',
		styles: '<style data-emotion="css">.status{color:green}</style>',
		markup: '<main><h1>Upper Bidwell Park trails: Open</h1></main>',
		initialData: { trailStatus: 'Open', safe: '</script><script>alert(1)</script>' }
	});

	assert.match(html, /<head><title>Trail status<\/title><script type="application\/ld\+json">\{\}<\/script><style/);
	assert.match(html, /<div id="root"><main><h1>Upper Bidwell Park trails: Open<\/h1><\/main><\/div>/);
	assert.match(html, /"safe":"\\u003c\/script>\\u003cscript>alert\(1\)\\u003c\/script>"/);
	assert.doesNotMatch(html, /<!-- (PAGE_METADATA|SSR_STYLES|TRAIL_STATUS_CONTENT|APP_INITIAL_DATA) -->/);
});

test('reports a missing template marker instead of returning incomplete HTML', () => {
	assert.throws(() => renderPage('<html></html>', { metadata: '', markup: '' }), /Could not find HTML template marker/);
});
