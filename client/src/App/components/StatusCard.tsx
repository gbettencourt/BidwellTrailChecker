import React from 'react';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import DoNotDisturbOnRounded from '@mui/icons-material/DoNotDisturbOnRounded';
import HelpRounded from '@mui/icons-material/HelpRounded';
import { Box, Link, Paper, Skeleton, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { formatDuration } from '../util/Util';

interface StatusCardProps {
	status: string;
	lastCheck: string;
	loading: boolean;
	// when the current status began, from the status history
	since?: string;
}

const sinceFormat = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

const relativeTime = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

export function formatLastCheck(lastCheck: string) {
	const date = new Date(lastCheck);
	if (!lastCheck || isNaN(date.getTime())) return '';

	const minutes = Math.round((date.getTime() - Date.now()) / 60000);
	if (Math.abs(minutes) < 60) return relativeTime.format(minutes, 'minute');
	const hours = Math.round(minutes / 60);
	if (Math.abs(hours) < 24) return relativeTime.format(hours, 'hour');
	return date.toLocaleString();
}

export const StatusCard: React.FC<StatusCardProps> = ({ status, lastCheck, loading, since }) => {
	const isOpen = status === 'Open';
	const isKnown = status === 'Open' || status === 'Closed';
	const color = !isKnown ? 'text.secondary' : isOpen ? 'success.main' : 'error.main';
	const tint = !isKnown ? 'var(--mui-palette-text-secondary)' : isOpen ? 'var(--mui-palette-success-main)' : 'var(--mui-palette-error-main)';
	const Icon = !isKnown ? HelpRounded : isOpen ? CheckCircleRounded : DoNotDisturbOnRounded;
	const checked = formatLastCheck(lastCheck);
	const sinceDate = since ? new Date(since) : null;
	const sinceText =
		isKnown && sinceDate && !isNaN(sinceDate.getTime())
			? `${status} since ${sinceFormat.format(sinceDate)} (${formatDuration(Date.now() - sinceDate.getTime())})`
			: '';

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
						<Link component={RouterLink} to="/history" variant="body2" underline="hover">
							View history →
						</Link>
					</Stack>
				</>
			)}
		</Paper>
	);
};
