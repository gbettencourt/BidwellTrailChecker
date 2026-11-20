import React, { Suspense, lazy } from 'react';
import { Skeleton, Stack } from '@mui/material';
import type { AppInitialData } from '../app-data';
import { TrailStatusBanner } from '../components/TrailStatusBanner';
import { useTrailStatus } from '../hooks/useTrailStatus';

// Leaflet is large, so only load it when someone opens the map
const TrailMap = lazy(() => import('./TrailMap'));

// The map page shell. The status banner lives here, outside the lazy
// TrailMap boundary, so it is in the first HTML the server sends
// (see index.ts GET /map) instead of appearing only after the Leaflet
// chunk loads and a status fetch completes.
export const MapPage: React.FC<{ initialData?: AppInitialData }> = ({ initialData }) => {
	const { status, retry: fetchStatus } = useTrailStatus(initialData);

	return (
		<Stack spacing={2.5}>
			<TrailStatusBanner status={status} onRetry={fetchStatus} />
			<Suspense fallback={<Skeleton variant="rounded" height="70vh" />}>
				<TrailMap status={status} />
			</Suspense>
		</Stack>
	);
};
