import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';

export type TrailStatus = 'Open' | 'Closed';

export type StatusEvent = {
	status: TrailStatus;
	at: string;
	source: 'auto' | 'manual' | 'email';
};

type HistoryDb = {
	events: StatusEvent[];
};

// one shared instance so concurrent writes from the checker and admin routes don't clobber each other
const db = new Low<HistoryDb>(new JSONFile('history.json'), { events: [] });

/**
 * Append a status change. Repeated statuses are ignored, so this is safe to call on every check
 * and doesn't add duplicate entries after a server restart.
 */
export async function recordStatus(status: TrailStatus, source: StatusEvent['source']) {
	await db.read();
	const last = db.data.events[db.data.events.length - 1];
	if (last?.status === status) return;

	db.data.events.push({ status, at: new Date().toISOString(), source });
	await db.write();
	console.log(`recorded status change to ${status} (${source})`);
}

const DAY_MS = 24 * 60 * 60 * 1000;

export async function statusHistory(limit = 100) {
	await db.read();
	const events = db.data.events;
	const now = Date.now();

	// completed closures: a Closed event followed by the next Open event
	const closures: { start: number; end: number }[] = [];
	events.forEach((event, i) => {
		const next = events[i + 1];
		if (event.status === 'Closed' && next?.status === 'Open') {
			closures.push({ start: Date.parse(event.at), end: Date.parse(next.at) });
		}
	});

	const lastYear = closures.filter((c) => c.start >= now - 365 * DAY_MS);
	const avgClosureMs = lastYear.length ? lastYear.reduce((sum, c) => sum + (c.end - c.start), 0) / lastYear.length : null;
	const closuresLast90Days = events.filter((e) => e.status === 'Closed' && Date.parse(e.at) >= now - 90 * DAY_MS).length;

	return {
		current: events.length ? events[events.length - 1] : null,
		trackedSince: events.length ? events[0].at : null,
		stats: { avgClosureMs, closuresLast90Days },
		// oldest first, capped to the most recent entries
		events: events.slice(-limit)
	};
}
