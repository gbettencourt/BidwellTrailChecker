import { format } from 'node:util';

/**
 * In-memory log of app events for the admin live tail view.
 *
 * Every entry is also written to the console (stdout/stderr) exactly as
 * before, so the service logs keep everything. The ring buffer is purely
 * additive: it holds the most recent entries so GET /api/admin/logs can
 * serve them to the admin page, which polls every 2 seconds.
 *
 * HTTP request logs are NOT captured here — express-winston logs those
 * separately, and they'd flood the tail with a line per page load.
 */

export type LogLevel = 'info' | 'warn' | 'error';

export type LogEntry = {
	id: number;
	ts: string;
	level: LogLevel;
	message: string;
};

const MAX_ENTRIES = 1000;
const entries: LogEntry[] = [];
let nextId = 1;

function push(level: LogLevel, args: unknown[]) {
	const message = format(...args);
	entries.push({ id: nextId++, ts: new Date().toISOString(), level, message });
	if (entries.length > MAX_ENTRIES) entries.shift();

	// Dual-write: the console output is the service log, keep it unchanged.
	if (level === 'error') console.error(message);
	else if (level === 'warn') console.warn(message);
	else console.log(message);
}

export function logInfo(...args: unknown[]) {
	push('info', args);
}

export function logWarn(...args: unknown[]) {
	push('warn', args);
}

export function logError(...args: unknown[]) {
	push('error', args);
}

export function getLogEntries(sinceId = 0): LogEntry[] {
	return entries.filter((entry) => entry.id > sinceId);
}

export function getLatestLogId(): number {
	return nextId - 1;
}
