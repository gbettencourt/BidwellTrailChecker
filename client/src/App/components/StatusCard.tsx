import React, { useEffect, useState } from 'react';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import DoNotDisturbOnRounded from '@mui/icons-material/DoNotDisturbOnRounded';
import HelpRounded from '@mui/icons-material/HelpRounded';
import { Box, Link, Paper, Skeleton, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { DAY_MS, formatDuration } from '../util/Util';
import { formatDateLocal } from '../../../../shared/format-date-local.js';
import type { ReopeningEstimate, ReopeningUnavailable } from '../../../../shared-types.js';

interface StatusCardProps {
	status: string;
	lastCheck: string;
	loading: boolean;
	// when the current status began, from the status history
	since?: string;
	now?: number;
}

const sinceFormat = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/Los_Angeles' });

// a YYYY-MM-DD date parsed as local noon, so formatting it in
// America/Los_Angeles never lands on the neighboring day
const localNoon = (date: string) => new Date(`${date}T12:00:00`);

// the drying model is a rough guess, so the card shows a vague window
// instead of an exact date — a specific day would imply more precision
// than the model has
const vagueEtaText = (etaDate: string | null, today = formatDateLocal(new Date())): string => {
	if (etaDate === null) return 'More than a week away';
	const days = Math.round((localNoon(etaDate).getTime() - localNoon(today).getTime()) / DAY_MS);
	if (days <= 0) return 'Today';
	if (days === 1) return 'Tomorrow';
	if (days <= 3) return 'In 2–3 days';
	return 'Sometime this week';
};

const relativeTime = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

export function formatLastCheck(lastCheck: string, now = Date.now()) {
	const date = new Date(lastCheck);
	if (!lastCheck || isNaN(date.getTime())) return '';

	const minutes = Math.round((date.getTime() - now) / 60000);
	if (Math.abs(minutes) < 60) return relativeTime.format(minutes, 'minute');
	const hours = Math.round(minutes / 60);
	if (Math.abs(hours) < 24) return relativeTime.format(hours, 'hour');
	return date.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' });
}

export const StatusCard: React.FC<StatusCardProps> = ({ status, lastCheck, loading, since, now = Date.now() }) => {
	const isOpen = status === 'Open';
	const isKnown = status === 'Open' || status === 'Closed';
	const color = !isKnown ? 'text.secondary' : isOpen ? 'success.main' : 'error.main';
	const tint = !isKnown ? 'var(--mui-palette-text-secondary)' : isOpen ? 'var(--mui-palette-success-main)' : 'var(--mui-palette-error-main)';
	const Icon = !isKnown ? HelpRounded : isOpen ? CheckCircleRounded : DoNotDisturbOnRounded;
	const checked = formatLastCheck(lastCheck, now);
	const sinceDate = since ? new Date(since) : null;
	const sinceText =
		isKnown && sinceDate && !isNaN(sinceDate.getTime())
			? `${status} since ${sinceFormat.format(sinceDate)} (${formatDuration(now - sinceDate.getTime())})`
			: '';

	// reopening estimate, fetched only while the trails are closed; a
	// failure just hides the section, it never breaks the status card
	const [estimate, setEstimate] = useState<ReopeningEstimate | null>(null);
	const [etaLoading, setEtaLoading] = useState(false);
	useEffect(() => {
		if (status !== 'Closed' || loading) return;
		let cancelled = false;
		setEtaLoading(true);
		fetch('/api/reopening')
			.then((res) => (res.ok ? res.json() : null))
			.then((data: ReopeningEstimate | ReopeningUnavailable | null) => {
				if (!cancelled) setEstimate(data?.available ? data : null);
			})
			.catch(() => {})
			.finally(() => {
				if (!cancelled) setEtaLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [status, loading]);

	const etaDate = estimate?.estimatedDate ?? null;
	const etaText = vagueEtaText(etaDate);
	const etaParts: string[] = [];
	if (estimate) {
		etaParts.push(`${estimate.rainInches} in of rain since ${sinceFormat.format(new Date(estimate.closedSince))}`);
		etaParts.push(`${estimate.sunnyDays} sunny day${estimate.sunnyDays === 1 ? '' : 's'}`);
		if (estimate.highTempF !== null) {
			etaParts.push(`highs near ${Math.round(estimate.highTempF)}°`);
		}
	}

	return (
		<Paper
			sx={{
				p: { xs: 3, sm: 4 },
				position: 'relative',
				overflow: 'hidden',
				background: `linear-gradient(135deg, color-mix(in srgb, ${tint} 14%, transparent), transparent 70%)`
			}}>
			<Typography variant="overline" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.1em' }}>
				Upper Bidwell Park trails
			</Typography>
			{loading ? (
				<>
					<Skeleton variant="text" width="60%" sx={{ fontSize: '3.5rem' }} />
					<Skeleton variant="text" width="40%" />
				</>
			) : (
				<>
					<Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mt: 0.5 }}>
						<Box sx={{ color, display: 'flex' }}>
							<Icon sx={{ fontSize: { xs: 44, sm: 52 } }} />
						</Box>
						<Typography variant="h2" component="p" sx={{ color, fontSize: { xs: '2.75rem', sm: '3.5rem' } }}>
							{isKnown ? status : 'Unknown'}
						</Typography>
					</Stack>
					{sinceText && (
						<Typography variant="body1" sx={{ mt: 1.5, fontWeight: 500 }}>
							{sinceText}
						</Typography>
					)}
					<Stack
						direction="row"
						spacing={2}
						sx={{ mt: sinceText ? 0.5 : 1.5, justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap' }}>
						<Typography variant="body2" color="text.secondary">
							{isKnown ? (checked ? `Checked ${checked}` : '') : 'Status is not available right now. Check back soon.'}
						</Typography>
						<Stack direction="row" spacing={2}>
							<Link component={RouterLink} to="/map" variant="body2" underline="hover">
								View map →
							</Link>
							<Link component={RouterLink} to="/history" variant="body2" underline="hover">
								View history →
							</Link>
						</Stack>
					</Stack>
					{!isOpen && isKnown && (etaLoading || estimate) && (
						<Box sx={{ mt: 2.5, pt: 2, borderTop: 1, borderColor: 'divider' }}>
							{etaLoading ? (
								<Skeleton variant="text" width="55%" />
							) : (
								<>
									<Typography variant="overline" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.1em' }}>
										Estimated reopening
									</Typography>
									<Typography variant="h6" component="p" sx={{ mt: 0.5 }}>
										{etaText}
									</Typography>
									{etaParts.length > 0 && (
										<Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
											{etaParts.join(' · ')}
										</Typography>
									)}
									<Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
										Estimate only — the City of Chico decides when the trails actually open.
									</Typography>
								</>
							)}
						</Box>
					)}
				</>
			)}
		</Paper>
	);
};
