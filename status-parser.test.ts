import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTrailStatus } from './status-parser.js';

// trimmed-down copy of the status table on the city's Trail, Gate, & Facility Status page
const page = (north: string, south: string) => `
<div>
	<table>
		<tr><th>Location</th><th>Status</th></tr>
		<tr><td>Upper Park Trails &ndash; North Side*</td><td><strong>${north}</strong></td></tr>
		<tr><td>Upper Park Trails &ndash; South Side*</td><td><strong>${south}</strong></td></tr>
		<tr><td colspan="2">*Unless otherwise indicated, &ldquo;CLOSED&rdquo; trails pertains to vehicles, equestrians, and bicyclists.</td></tr>
		<tr><td>Upper Park Road at Lot E</td><td>OPEN</td></tr>
		<tr><td>Gate at Diversion Dam (Parking Lot L)</td><td>CLOSED</td></tr>
		<tr><td>Caper Acres**</td><td>OPEN</td></tr>
		<tr><td>Peregrine Point Disc Golf Course</td><td>OPEN</td></tr>
	</table>
</div>`;

test('open when both trail rows are open', () => {
	assert.deepEqual(parseTrailStatus(page('OPEN', 'OPEN')), { status: 'Open' });
});

test('closed when both trail rows are closed, even though other facilities are open', () => {
	assert.deepEqual(parseTrailStatus(page('CLOSED', 'CLOSED')), { status: 'Closed' });
});

test('closed when only one side is closed', () => {
	assert.deepEqual(parseTrailStatus(page('OPEN', 'CLOSED')), { status: 'Closed' });
});

test('ignores case and footnote markers', () => {
	assert.deepEqual(parseTrailStatus(page('Open*', ' open ')), { status: 'Open' });
});

test('error on unexpected wording instead of guessing', () => {
	const result = parseTrailStatus(page('OPEN TO PEDESTRIANS ONLY', 'OPEN'));
	assert.ok('error' in result && result.error.includes('PEDESTRIANS'));
});

test('error when the trail rows are missing', () => {
	const result = parseTrailStatus('<table><tr><td>Caper Acres</td><td>OPEN</td></tr></table>');
	assert.ok('error' in result && result.error.includes('no "Upper Park Trails" rows'));
});
