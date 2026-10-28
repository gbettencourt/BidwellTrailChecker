import { parse } from 'node-html-parser';
import type { TrailStatus } from './history.js';

export type ParseResult = { status: TrailStatus } | { error: string };

// matches "Upper Park Trails – North Side*", "Upper Park Trails - South Side", etc.
const TRAIL_ROW = /upper\s+park\s+trails/i;

/**
 * Read the Upper Park trail status from the city's status page.
 *
 * Only the "Upper Park Trails" rows count; other facilities in the same table (Caper Acres, gates, the pool)
 * are ignored. The trails are Closed if any of those rows says CLOSED and Open only if all say OPEN.
 * Anything else (rows missing, unexpected wording) is an error, so a page redesign can't produce a wrong status.
 */
export function parseTrailStatus(html: string): ParseResult {
	const rows = parse(html)
		.querySelectorAll('tr')
		.map((row) => row.querySelectorAll('td, th').map((cell) => cell.text.replace(/\s+/g, ' ').trim()))
		.filter((cells) => cells.length >= 2 && TRAIL_ROW.test(cells[0]));

	if (!rows.length) return { error: 'no "Upper Park Trails" rows found on the status page' };

	const statuses = rows.map(([location, status]) => {
		// tolerate footnote markers and punctuation around the word, but nothing else
		const word = status.toUpperCase().replace(/[^A-Z ]/g, '').trim();
		return { location, status, word };
	});

	const unknown = statuses.filter((s) => s.word !== 'OPEN' && s.word !== 'CLOSED');
	if (unknown.length) {
		return { error: `unexpected trail status: ${unknown.map((s) => `"${s.location}" = "${s.status}"`).join(', ')}` };
	}

	return { status: statuses.some((s) => s.word === 'CLOSED') ? 'Closed' : 'Open' };
}
