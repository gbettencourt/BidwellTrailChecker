import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StatusCard, formatLastCheck } from './StatusCard';

const NOW = new Date('2026-11-15T20:00:00Z').getTime();

describe('formatLastCheck', () => {
	it('returns an empty string for missing or invalid dates', () => {
		expect(formatLastCheck('')).toBe('');
		expect(formatLastCheck('not-a-date')).toBe('');
	});

	it('says how many minutes ago the check ran', () => {
		expect(formatLastCheck('2026-11-15T19:55:00Z', NOW)).toBe('5 minutes ago');
		expect(formatLastCheck('2026-11-15T19:59:00Z', NOW)).toBe('1 minute ago');
	});

	it('says how many hours ago the check ran', () => {
		expect(formatLastCheck('2026-11-15T18:00:00Z', NOW)).toBe('2 hours ago');
	});

	it('falls back to a full date for older checks', () => {
		expect(formatLastCheck('2026-11-10T20:00:00Z', NOW)).toBe('11/10/2026, 12:00:00 PM');
	});
});

describe('StatusCard', () => {
	const renderCard = (props: Partial<React.ComponentProps<typeof StatusCard>> = {}) =>
		render(
			<MemoryRouter>
				<StatusCard status="Open" lastCheck="2026-11-15T19:55:00Z" loading={false} now={NOW} {...props} />
			</MemoryRouter>
		);

	it('shows the open status and when it was checked', () => {
		renderCard();
		expect(screen.getByText('Open')).toBeInTheDocument();
		expect(screen.getByText('Checked 5 minutes ago')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'View map →' })).toHaveAttribute('href', '/map');
		expect(screen.getByRole('link', { name: 'View history →' })).toHaveAttribute('href', '/history');
	});

	it('shows the closed status with how long it has been closed', () => {
		renderCard({ status: 'Closed', since: '2026-11-15T10:00:00Z' });
		expect(screen.getByText('Closed')).toBeInTheDocument();
		expect(screen.getByText('Closed since Sun, Nov 15 (10 hours)')).toBeInTheDocument();
	});

	it('shows Unknown and a fallback message when the status is not known', () => {
		renderCard({ status: 'Unknown' });
		expect(screen.getByText('Unknown')).toBeInTheDocument();
		expect(screen.getByText('Status is not available right now. Check back soon.')).toBeInTheDocument();
	});

	it('shows loading skeletons instead of the status', () => {
		renderCard({ loading: true });
		expect(screen.queryByText('Open')).not.toBeInTheDocument();
		expect(document.querySelector('.MuiSkeleton-root')).not.toBeNull();
	});
});

describe('StatusCard reopening estimate', () => {
	// a YYYY-MM-DD string shifted by n days, in America/Los_Angeles,
	// so the ETA tests stay valid no matter when they run
	const datePlusDays = (date: string, days: number) => {
		const [y, m, d] = date.split('-').map(Number);
		return new Date(y, m - 1, d + days, 12).toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
	};
	const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });

	const estimate = {
		available: true,
		estimatedDate: '2026-11-21',
		closedSince: '2026-11-15T10:00:00Z',
		rainInches: 1.7,
		sunnyDays: 1,
		highTempF: 54
	};
	let fetchMock: ReturnType<typeof vi.fn>;

	const renderClosedCard = () =>
		render(
			<MemoryRouter>
				<StatusCard status="Closed" lastCheck="2026-11-15T19:55:00Z" loading={false} since="2026-11-15T10:00:00Z" now={NOW} />
			</MemoryRouter>
		);

	beforeEach(() => {
		fetchMock = vi.fn(async () => ({ ok: true, json: async () => estimate }));
		vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('shows the estimated reopening with the weather behind it', async () => {
		fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ...estimate, estimatedDate: datePlusDays(today(), 2) }) });
		renderClosedCard();
		await waitFor(() => expect(screen.getByText('Estimated reopening')).toBeInTheDocument());
		expect(screen.getByText('In 2–3 days')).toBeInTheDocument();
		expect(screen.getByText('1.7 in of rain since Sun, Nov 15 · 1 sunny day · highs near 54°')).toBeInTheDocument();
		expect(screen.getByText('Estimate only — the City of Chico decides when the trails actually open.')).toBeInTheDocument();
		expect(fetchMock).toHaveBeenCalledWith('/api/reopening');
	});

	it('says Today when the estimate is today', async () => {
		fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ...estimate, estimatedDate: today() }) });
		renderClosedCard();
		await waitFor(() => expect(screen.getByText('Today')).toBeInTheDocument());
	});

	it('says Tomorrow when the estimate is tomorrow', async () => {
		fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ...estimate, estimatedDate: datePlusDays(today(), 1) }) });
		renderClosedCard();
		await waitFor(() => expect(screen.getByText('Tomorrow')).toBeInTheDocument());
	});

	it('says sometime this week when the estimate is later in the week', async () => {
		fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ...estimate, estimatedDate: datePlusDays(today(), 5) }) });
		renderClosedCard();
		await waitFor(() => expect(screen.getByText('Sometime this week')).toBeInTheDocument());
	});

	it('says more than a week away when no date is in the forecast', async () => {
		fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ...estimate, estimatedDate: null }) });
		renderClosedCard();
		await waitFor(() => expect(screen.getByText('More than a week away')).toBeInTheDocument());
	});

	it('hides the estimate when none is available', async () => {
		fetchMock.mockResolvedValue({ ok: true, json: async () => ({ available: false }) });
		renderClosedCard();
		await waitFor(() => expect(fetchMock).toHaveBeenCalled());
		expect(screen.queryByText('Estimated reopening')).not.toBeInTheDocument();
	});

	it('hides the estimate when the fetch fails', async () => {
		fetchMock.mockRejectedValue(new Error('network down'));
		renderClosedCard();
		await waitFor(() => expect(fetchMock).toHaveBeenCalled());
		expect(screen.queryByText('Estimated reopening')).not.toBeInTheDocument();
	});

	it('does not fetch an estimate while the trails are open', () => {
		render(
			<MemoryRouter>
				<StatusCard status="Open" lastCheck="2026-11-15T19:55:00Z" loading={false} now={NOW} />
			</MemoryRouter>
		);
		expect(fetchMock).not.toHaveBeenCalled();
		expect(screen.queryByText('Estimated reopening')).not.toBeInTheDocument();
	});
});
