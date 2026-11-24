import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { buildDays, StatusHistory } from './StatusHistory';
import type { StatusEvent, StatusHistory as History } from '../../../../shared-types';

const HOUR_MS = 3600000;

const event = (status: StatusEvent['status'], at: string): StatusEvent => ({ status, at, source: 'auto' });

describe('StatusHistory', () => {
	it('buckets days at Chico midnight', () => {
		// now is 08:00 Chico time on Nov 20, 2026 (PST, UTC-8)
		const now = Date.parse('2026-11-20T16:00:00Z');
		const days = buildDays([event('Closed', '2026-11-19T07:00:00Z'), event('Open', '2026-11-19T08:00:00Z')], now);
		expect(days).toHaveLength(90);
		const day = (iso: string) => {
			const found = days.find((d) => d.start.toISOString() === iso);
			expect(found).toBeDefined();
			return found!;
		};
		// Nov 19 starts at Chico midnight (08:00Z); the closure ended exactly then
		const nov19 = day('2026-11-19T08:00:00.000Z');
		expect(nov19.closedMs).toBe(0);
		expect(nov19.openMs).toBe(24 * HOUR_MS);
		expect(nov19.state).toBe('open');
		// the hour before that midnight belongs to Nov 18
		const nov18 = day('2026-11-18T08:00:00.000Z');
		expect(nov18.closedMs).toBe(HOUR_MS);
		expect(nov18.openMs).toBe(0);
		expect(nov18.state).toBe('closed');
		// the window ends on the Chico today
		expect(days[89].start.toISOString()).toBe('2026-11-20T08:00:00.000Z');
	});

	it('counts a spring-forward day as 23 hours', () => {
		// Mar 8, 2026: clocks jump 02:00 PST to 03:00 PDT, so Mar 9 starts at 07:00Z
		const now = Date.parse('2026-03-09T07:00:00Z');
		const days = buildDays([event('Closed', '2026-03-08T08:00:00Z')], now);
		const mar8 = days.find((d) => d.start.toISOString() === '2026-03-08T08:00:00.000Z');
		expect(mar8?.closedMs).toBe(23 * HOUR_MS);
		expect(mar8?.state).toBe('closed');
		const mar9 = days.find((d) => d.start.toISOString() === '2026-03-09T07:00:00.000Z');
		expect(mar9?.state).toBe('none');
	});

	it('counts a fall-back day as 25 hours', () => {
		// Nov 1, 2026: clocks fall back 02:00 PDT to 01:00 PST, so Nov 2 starts at 08:00Z
		const now = Date.parse('2026-11-02T08:00:00Z');
		const days = buildDays([event('Closed', '2026-11-01T07:00:00Z')], now);
		const nov1 = days.find((d) => d.start.toISOString() === '2026-11-01T07:00:00.000Z');
		expect(nov1?.closedMs).toBe(25 * HOUR_MS);
		expect(nov1?.state).toBe('closed');
	});
});

describe('StatusHistory pagination', () => {
	// n events, one a day back from Nov 20, 2026, alternating status
	const makeHistory = (n: number): History => {
		const events: StatusEvent[] = Array.from({ length: n }, (_, i) => ({
			status: i % 2 === 0 ? 'Closed' : 'Open',
			at: new Date(Date.parse('2026-11-20T12:00:00Z') - (n - 1 - i) * 24 * HOUR_MS).toISOString(),
			source: 'auto' as const
		}));
		return {
			current: events[events.length - 1],
			trackedSince: events[0].at,
			stats: { avgClosureMs: null, closuresLast90Days: n },
			events
		};
	};

	let fetchMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		fetchMock = vi.fn(async () => ({ ok: true, json: async () => makeHistory(3) }));
		vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('shows 20 changes per page with a page count', async () => {
		fetchMock.mockResolvedValue({ ok: true, json: async () => makeHistory(25) });
		render(<StatusHistory />);
		await waitFor(() => expect(screen.getByText('Recent changes')).toBeInTheDocument());
		// header row + 20 change rows
		expect(screen.getAllByRole('row')).toHaveLength(21);
		expect(screen.getByText('Showing 1–20 of 25')).toBeInTheDocument();

		fireEvent.click(screen.getByRole('button', { name: 'Go to page 2' }));
		await waitFor(() => expect(screen.getByText('Showing 21–25 of 25')).toBeInTheDocument());
		expect(screen.getAllByRole('row')).toHaveLength(6);
	});

	it('shows no pagination when everything fits on one page', async () => {
		render(<StatusHistory />);
		await waitFor(() => expect(screen.getByText('Recent changes')).toBeInTheDocument());
		expect(screen.getAllByRole('row')).toHaveLength(4);
		expect(screen.queryByText(/Showing/)).not.toBeInTheDocument();
		expect(screen.queryByLabelText('Recent changes pages')).not.toBeInTheDocument();
	});
});
