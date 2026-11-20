import { useCallback, useEffect, useState } from 'react';
import { apiGet, normalizeTrailStatus } from '../util/api';
import type { TrailStatusState } from '../components/TrailStatusBanner';

type TrailStatusResponse = {
	trailStatus: string;
	lastCheck: string;
};

// fetches the live status on mount and returns it with a retry; the
// server-seeded initialData keeps the first paint honest
export function useTrailStatus(initial?: { trailStatus: string; lastCheck: string }) {
	const [status, setStatus] = useState<TrailStatusState>(() => normalizeTrailStatus(initial?.trailStatus, 'loading'));
	const [lastCheck, setLastCheck] = useState(initial?.lastCheck ?? '');
	const [loading, setLoading] = useState(!initial);

	const fetchStatus = useCallback(async () => {
		try {
			const data = await apiGet<TrailStatusResponse>('/api/trailstatus');
			setStatus(normalizeTrailStatus(data.trailStatus, 'unknown'));
			setLastCheck(data.lastCheck);
		} catch (e) {
			console.error('Failed to fetch trail status:', e);
			setStatus('unknown');
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchStatus();
	}, [fetchStatus]);

	return { status, lastCheck, loading, retry: fetchStatus };
}
