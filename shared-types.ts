// Types shared between the server and the client. Pure type declarations
// only — no runtime code, so either side can import them type-only and
// there is exactly one definition of each.

export type TrailStatus = 'Open' | 'Closed';

export type StatusEvent = {
	status: TrailStatus;
	at: string;
	source: 'auto' | 'manual' | 'email';
};

export type StatusHistory = {
	current: StatusEvent | null;
	trackedSince: string | null;
	stats: { avgClosureMs: number | null; closuresLast90Days: number };
	events: StatusEvent[];
};

export type OverrideValue = 'open' | 'closed' | 'auto';

export type LogLevel = 'info' | 'warn' | 'error';

export type LogEntry = {
	id: number;
	ts: string;
	level: LogLevel;
	message: string;
};

export type ReopeningEstimate = {
	available: true;
	/** first day the trails are expected to be dry enough, YYYY-MM-DD; null when not within the forecast */
	estimatedDate: string | null;
	/** when the current closure began (ISO timestamp from the status history) */
	closedSince: string;
	/** inches of rain since the closure, through today */
	rainInches: number;
	/** days since the closure with at least 6 hours of sunshine */
	sunnyDays: number;
	/** warmest daily high (°F) since the closure, null when unknown */
	highTempF: number | null;
};

export type ReopeningUnavailable = { available: false };
