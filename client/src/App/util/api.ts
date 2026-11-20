import type { TrailStatusState } from '../components/TrailStatusBanner';

// a GET that throws on a non-2xx response instead of making every caller
// repeat the ok check and res.json()
export async function apiGet<T>(url: string): Promise<T> {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`GET ${url} failed: HTTP ${res.status}`);
	return res.json() as Promise<T>;
}

// the API returns the status as a plain string; only Open/Closed are
// trusted, anything else falls back (unknown for a fetch result, loading
// for a server seed that hasn't produced a real status yet)
export const normalizeTrailStatus = (value: unknown, fallback: TrailStatusState = 'unknown'): TrailStatusState =>
	value === 'Open' || value === 'Closed' ? value : fallback;
