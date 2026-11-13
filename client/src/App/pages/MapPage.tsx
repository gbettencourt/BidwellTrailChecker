import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { Skeleton, Stack } from '@mui/material';
import type { AppInitialData } from '../app-data';
import { TrailStatusBanner, type TrailStatusState } from '../components/TrailStatusBanner';

// Leaflet is large, so only load it when someone opens the map
const TrailMap = lazy(() => import('./TrailMap'));

const initialStatus = (initialData?: AppInitialData): TrailStatusState =>
	initialData?.trailStatus === 'Open' || initialData?.trailStatus === 'Closed' ? initialData.trailStatus : 'loading';

// The map page shell. The status banner lives here, outside the lazy
// TrailMap boundary, so it is in the first HTML the server sends
// (see index.ts GET /map) instead of appearing only after the Leaflet
// chunk loads and a status fetch completes.
export const MapPage: React.FC<{ initialData?: AppInitialData }> = ({ initialData }) => {
	const [status, setStatus] = useState<TrailStatusState>(() => initialStatus(initialData));

	const fetchStatus = useCallback(async () => {
		try {
			const res = await fetch('/api/trailstatus');
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = await res.json();
			setStatus(data.trailStatus === 'Open' || data.trailStatus === 'Closed' ? data.trailStatus : 'unknown');
		} catch (e) {
			console.error('Failed to fetch trail status:', e);
			setStatus('unknown');
		}
	}, []);

	// refresh the server-seeded status once the page is live
	useEffect(() => {
		fetchStatus();
	}, [fetchStatus]);

	return (
		<Stack spacing={2.5}>
			<TrailStatusBanner status={status} onRetry={fetchStatus} />
			<Suspense fallback={<Skeleton variant="rounded" height="70vh" />}>
				<TrailMap status={status} />
			</Suspense>
		</Stack>
	);
};
