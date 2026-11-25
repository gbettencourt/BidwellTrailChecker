import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StatusCard, formatLastCheck, vagueEtaText } from './StatusCard';

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

describe('vagueEtaText', () => {
	it('uses the near buckets for today through 3 days out', () => {
		expect(vagueEtaText('2026-11-25', '2026-11-25')).toBe('Today');
		expect(vagueEtaText('2026-11-24', '2026-11-25')).toBe('Today');
		expect(vagueEtaText('2026-11-26', '2026-11-25')).toBe('Tomorrow');
		expect(vagueEtaText('2026-11-27', '2026-11-25')).toBe('In 2–3 days');
		expect(vagueEtaText('2026-11-28', '2026-11-25')).toBe('In 2–3 days');
	});

	it('says sometime this week only for a date in the same Monday–Sunday week', () => {
		// Wed Nov 25 → Sun Nov 29 is the same week; Mon Nov 30 is the next
		expect(vagueEtaText('2026-11-29', '2026-11-25')).toBe('Sometime this week');
		expect(vagueEtaText('2026-11-27', '2026-11-23')).toBe('Sometime this week');
	});

	it('says next week for a date in the following week, within 7 days', () => {
		// the live case: Wed Nov 25 → Tue Dec 1 is 6 days out, next week
		expect(vagueEtaText('2026-12-01', '2026-11-25')).toBe('Next week');
		expect(vagueEtaText('2026-11-30', '2026-11-25')).toBe('Next week');
		expect(vagueEtaText('2026-11-30', '2026-11-23')).toBe('Next week');
	});

	it('says more than a week away with no date, or one over 7 days out', () => {
		expect(vagueEtaText(null, '2026-11-25')).toBe('More than a week away');
		expect(vagueEtaText('2026-12-08', '2026-11-25')).toBe('More than a week away');
	});
});

describe('StatusCard', () => {
	const renderCard = (props: Partial<React.ComponentProps<typeof StatusCard>> = {}) =>
		render(
			<MemoryRouter>
				<StatusCard status="Open" lastCheck="2026-11-15T19:55:00Z" loading={false} now={NOW} {...props} />
			</MemoryRouter>
		);

	// the Closed card fetches /api/reopening in an effect; stub fetch so the
	// test never hits the network, and await the call so the state updates
	// it triggers settle inside act() instead of warning after the test
	let fetchMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ available: false }) }));
		vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('shows the open status and when it was checked', () => {
		renderCard();
		expect(screen.getByText('Open')).toBeInTheDocument();
		expect(screen.getByText('Checked 5 minutes ago')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'View map →' })).toHaveAttribute('href', '/map');
		expect(screen.getByRole('link', { name: 'View history →' })).toHaveAttribute('href', '/history');
	});

	it('shows the closed status with how long it has been closed', async () => {
		renderCard({ status: 'Closed', since: '2026-11-15T10:00:00Z' });
		expect(screen.getByText('Closed')).toBeInTheDocument();
		expect(screen.getByText('Closed since Sun, Nov 15 (10 hours)')).toBeInTheDocument();
		await waitFor(() => expect(fetchMock).toHaveBeenCalled());
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
	// fixed "today" is Wed Nov 25, 2026, so the week-boundary buckets are
	// deterministic: the tests would pass some weekdays and fail others
	// if they used the real today
	const TODAY = '2026-11-25';
	const ETA_NOW = new Date('2026-11-25T20:00:00Z').getTime();
	// a YYYY-MM-DD string shifted by n days, in America/Los_Angeles
	const datePlusDays = (date: string, days: number) => {
		const [y, m, d] = date.split('-').map(Number);
		return new Date(y, m - 1, d + days, 12).toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
	};

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
				<StatusCard status="Closed" lastCheck="2026-11-15T19:55:00Z" loading={false} since="2026-11-15T10:00:00Z" now={ETA_NOW} />
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
		fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ...estimate, estimatedDate: datePlusDays(TODAY, 2) }) });
		renderClosedCard();
		await waitFor(() => expect(screen.getByText('Estimated reopening')).toBeInTheDocument());
		expect(screen.getByText('In 2–3 days')).toBeInTheDocument();
		expect(screen.getByText('1.7 in of rain since Sun, Nov 15 · 1 sunny day · highs near 54°')).toBeInTheDocument();
		expect(screen.getByText('Estimate only — the City of Chico decides when the trails actually open.')).toBeInTheDocument();
		expect(fetchMock).toHaveBeenCalledWith('/api/reopening');
	});

	it('says Today when the estimate is today', async () => {
		fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ...estimate, estimatedDate: TODAY }) });
		renderClosedCard();
		await waitFor(() => expect(screen.getByText('Today')).toBeInTheDocument());
	});

	it('says Tomorrow when the estimate is tomorrow', async () => {
		fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ...estimate, estimatedDate: datePlusDays(TODAY, 1) }) });
		renderClosedCard();
		await waitFor(() => expect(screen.getByText('Tomorrow')).toBeInTheDocument());
	});

	it('says sometime this week when the estimate is later in the week', async () => {
		fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ...estimate, estimatedDate: datePlusDays(TODAY, 4) }) });
		renderClosedCard();
		await waitFor(() => expect(screen.getByText('Sometime this week')).toBeInTheDocument());
	});

	it('says next week when the estimate is in the following week', async () => {
		// the live case: Wed Nov 25 → Tue Dec 1
		fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ...estimate, estimatedDate: datePlusDays(TODAY, 6) }) });
		renderClosedCard();
		await waitFor(() => expect(screen.getByText('Next week')).toBeInTheDocument());
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
