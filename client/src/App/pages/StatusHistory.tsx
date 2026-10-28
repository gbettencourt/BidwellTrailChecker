import React, { useEffect, useMemo, useState } from 'react';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import DoNotDisturbOnRounded from '@mui/icons-material/DoNotDisturbOnRounded';
import {
	Alert,
	Box,
	Paper,
	Skeleton,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
	Tooltip,
	Typography
} from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { formatDuration, StatusEvent, StatusHistory as History } from '../util/Util';

const DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

// Validated for colorblind separation against the light and dark surfaces (closed is also hatched)
const DAY_COLORS = {
	open: { light: '#6cc290', dark: '#38a565' },
	closed: { light: '#b3261e', dark: '#b8392f' }
};
const HATCH = 'repeating-linear-gradient(135deg, rgba(255,255,255,.28) 0 2px, transparent 2px 6px)';

type DayState = 'open' | 'closed' | 'none';
type Day = { start: Date; state: DayState; closedMs: number; openMs: number };

const dayFormat = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
const shortDayFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
const longDayFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const dateFormat = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
const dateTimeFormat = new Intl.DateTimeFormat('en-US', {
	weekday: 'short',
	month: 'short',
	day: 'numeric',
	year: 'numeric',
	hour: 'numeric',
	minute: '2-digit'
});

const SOURCE_NOTES: Partial<Record<StatusEvent['source'], string>> = {
	manual: 'set manually',
	email: 'from past alert emails'
};

/** Split the event timeline into the last DAYS local days, measuring time open and closed in each. */
function buildDays(events: StatusEvent[], now = Date.now()): Day[] {
	const intervals = events.map((event, i) => ({
		status: event.status,
		start: Date.parse(event.at),
		end: i + 1 < events.length ? Date.parse(events[i + 1].at) : now
	}));

	const today = new Date(now);
	today.setHours(0, 0, 0, 0);

	return Array.from({ length: DAYS }, (_, i) => {
		const start = new Date(today);
		start.setDate(today.getDate() - (DAYS - 1 - i));
		const end = new Date(start);
		end.setDate(start.getDate() + 1);
		const dayEnd = Math.min(end.getTime(), now);

		let closedMs = 0;
		let openMs = 0;
		for (const interval of intervals) {
			const overlap = Math.min(interval.end, dayEnd) - Math.max(interval.start, start.getTime());
			if (overlap <= 0) continue;
			if (interval.status === 'Closed') closedMs += overlap;
			else openMs += overlap;
		}

		const state: DayState = closedMs + openMs === 0 ? 'none' : closedMs > openMs ? 'closed' : 'open';
		return { start, state, closedMs, openMs };
	});
}

function describeDay(day: Day) {
	if (day.state === 'none') return 'No data';
	if (!day.closedMs) return 'Open';
	if (!day.openMs) return 'Closed';
	return `Closed ${formatDuration(day.closedMs)}, open ${formatDuration(day.openMs)}`;
}

const dayCellSx = (state: DayState) => (theme: Theme) => {
	if (state === 'none') return { bgcolor: 'action.selected' };
	const colors = DAY_COLORS[state];
	return {
		bgcolor: colors.light,
		backgroundImage: state === 'closed' ? HATCH : 'none',
		...theme.applyStyles('dark', { bgcolor: colors.dark })
	};
};

const StatTile: React.FC<{ label: string; value: React.ReactNode; detail?: string }> = ({ label, value, detail }) => (
	<Paper sx={{ p: 2.5, flex: 1, minWidth: 0 }}>
		<Typography variant="body2" color="text.secondary">
			{label}
		</Typography>
		<Typography variant="h5" component="div" sx={{ mt: 0.5 }}>
			{value}
		</Typography>
		{detail && (
			<Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
				{detail}
			</Typography>
		)}
	</Paper>
);

const StatusLabel: React.FC<{ status: StatusEvent['status'] }> = ({ status }) => {
	const Icon = status === 'Open' ? CheckCircleRounded : DoNotDisturbOnRounded;
	return (
		<Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
			<Icon fontSize="small" sx={{ color: status === 'Open' ? 'success.main' : 'error.main' }} />
			<span>{status}</span>
		</Stack>
	);
};

const LegendSwatch: React.FC<{ state: DayState; label: string }> = ({ state, label }) => (
	<Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
		<Box sx={[{ width: 12, height: 12, borderRadius: '3px' }, dayCellSx(state)]} />
		<Typography variant="body2" color="text.secondary">
			{label}
		</Typography>
	</Stack>
);

export const StatusHistory: React.FC = () => {
	const [history, setHistory] = useState<History>();
	const [error, setError] = useState(false);

	useEffect(() => {
		fetch('/api/statushistory')
			.then((res) => {
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				return res.json();
			})
			.then(setHistory)
			.catch((e) => {
				console.error('Failed to load status history:', e);
				setError(true);
			});
	}, []);

	const days = useMemo(() => (history ? buildDays(history.events) : []), [history]);

	// newest first, with how long each status lasted
	const changes = useMemo(() => {
		if (!history) return [];
		const events = history.events;
		return events
			.map((event, i) => ({
				...event,
				lastedMs: (i + 1 < events.length ? Date.parse(events[i + 1].at) : Date.now()) - Date.parse(event.at),
				ongoing: i === events.length - 1
			}))
			.reverse();
	}, [history]);

	const current = history?.current;

	return (
		<Stack spacing={3}>
			<Box>
				<Typography variant="h4" component="h1">
					Status history
				</Typography>
				<Typography color="text.secondary" sx={{ mt: 0.5 }}>
					{history?.trackedSince
						? `Open and closed changes for Upper Bidwell Park, recorded since ${longDayFormat.format(new Date(history.trackedSince))}.`
						: 'Open and closed changes for Upper Bidwell Park.'}
				</Typography>
			</Box>

			{error && <Alert severity="error">The status history couldn't be loaded. Please try again later.</Alert>}

			{!history && !error && <Skeleton variant="rounded" height={260} />}

			{history && !current && (
				<Alert severity="info">No history yet. Changes are recorded from now on, so check back after the next opening or closure.</Alert>
			)}

			{history && current && (
				<>
					<Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
						<StatTile
							label="Current status"
							value={<StatusLabel status={current.status} />}
							detail={`for ${formatDuration(Date.now() - Date.parse(current.at))}`}
						/>
						<StatTile
							label="Typical closure"
							value={history.stats.avgClosureMs != null ? formatDuration(history.stats.avgClosureMs) : '–'}
							detail={history.stats.avgClosureMs != null ? 'average, last 12 months' : 'not enough data yet'}
						/>
						<StatTile
							label="Closures"
							value={history.stats.closuresLast90Days}
							detail="in the last 90 days"
						/>
					</Stack>

					<Paper sx={{ p: { xs: 2.5, sm: 3 } }}>
						<Typography variant="h6" component="h2">
							Last 90 days
						</Typography>
						<Box
							role="img"
							aria-label={`Daily trail status for the last ${DAYS} days. See the table of changes below for details.`}
							sx={{ display: 'flex', gap: '2px', mt: 2, height: 44 }}>
							{days.map((day) => (
								<Tooltip
									key={day.start.toISOString()}
									title={
										<>
											<strong>{dayFormat.format(day.start)}</strong>
											<br />
											{describeDay(day)}
										</>
									}
									arrow
									disableInteractive>
									<Box sx={[{ flex: 1, minWidth: 0, borderRadius: '2px', cursor: 'default' }, dayCellSx(day.state)]} />
								</Tooltip>
							))}
						</Box>
						<Stack direction="row" sx={{ justifyContent: 'space-between', mt: 0.75 }}>
							<Typography variant="caption" color="text.secondary">
								{shortDayFormat.format(days[0].start)}
							</Typography>
							<Typography variant="caption" color="text.secondary">
								Today
							</Typography>
						</Stack>
						<Stack direction="row" spacing={2.5} sx={{ mt: 2, flexWrap: 'wrap', rowGap: 1 }}>
							<LegendSwatch state="open" label="Open" />
							<LegendSwatch state="closed" label="Closed" />
							<LegendSwatch state="none" label="No data" />
						</Stack>
					</Paper>

					<Paper sx={{ overflow: 'hidden' }}>
						<Typography variant="h6" component="h2" sx={{ px: { xs: 2.5, sm: 3 }, pt: { xs: 2.5, sm: 3 }, pb: 1 }}>
							Recent changes
						</Typography>
						<Box sx={{ overflowX: 'auto' }}>
							<Table size="small">
								<TableHead>
									<TableRow>
										<TableCell>Changed to</TableCell>
										<TableCell>When</TableCell>
										<TableCell>Lasted</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{changes.map((change) => (
										<TableRow key={change.at}>
											<TableCell>
												<StatusLabel status={change.status} />
											</TableCell>
											<TableCell sx={{ whiteSpace: 'nowrap' }}>
												{/* past emails only give the day, not the time */}
												{(change.source === 'email' ? dateFormat : dateTimeFormat).format(new Date(change.at))}
												{SOURCE_NOTES[change.source] && (
													<Typography variant="caption" color="text.secondary" component="div">
														{SOURCE_NOTES[change.source]}
													</Typography>
												)}
											</TableCell>
											<TableCell sx={{ whiteSpace: 'nowrap' }}>
												{formatDuration(change.lastedMs)}
												{change.ongoing && ' so far'}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</Box>
					</Paper>
				</>
			)}
		</Stack>
	);
};
