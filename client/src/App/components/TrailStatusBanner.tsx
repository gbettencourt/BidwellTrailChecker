import React from 'react';
import { Alert, Button } from '@mui/material';

export type TrailStatus = 'Open' | 'Closed';
export type TrailStatusState = 'loading' | TrailStatus | 'unknown';

type TrailStatusBannerProps = {
	status: TrailStatusState;
	onRetry?: () => void;
};

// Always rendered, so the map page shows the trail status in every state —
// including Open, which previously rendered nothing at all.
export const TrailStatusBanner: React.FC<TrailStatusBannerProps> = ({ status, onRetry }) => {
	if (status === 'loading') return <Alert severity="info">Checking trail status…</Alert>;
	if (status === 'Open') return <Alert severity="success">The park trails are open right now.</Alert>;
	if (status === 'Closed')
		return (
			<Alert severity="warning">
				The park trails are closed right now. The Strava Town trails, highlighted in green, stay open during closures.
			</Alert>
		);
	return (
		<Alert
			severity="warning"
			action={
				onRetry ? (
					<Button color="inherit" size="small" onClick={onRetry}>
						Try again
					</Button>
				) : undefined
			}>
			We couldn&apos;t check the trail status. Please try again.
		</Alert>
	);
};
