import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SignUp } from './SignUp';
import type { AppInitialData } from '../app-data';

describe('SignUp', () => {
	// the page fetches the live status and the status history on mount;
	// stub fetch so the test never hits the network, and await the calls
	// so the state updates they trigger settle inside act()
	let fetchMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		fetchMock = vi.fn(async (url: string) => ({
			ok: true,
			json: async () =>
				url.includes('/api/statushistory')
					? { current: { status: 'Open', at: '2026-11-15T10:00:00Z' } }
					: { trailStatus: 'Open', lastCheck: '2026-11-15T19:55:00Z' }
		}));
		vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('shows a static paragraph describing the checker, with links to the map and history', async () => {
		const initialData: AppInitialData = {
			trailStatus: 'Open',
			lastCheck: '2026-11-15T19:55:00Z',
			statusSince: null,
			captchaCode: 1234,
			renderedAt: new Date('2026-11-15T20:00:00Z').getTime(),
			siteUrl: 'https://www.chicomtb.com'
		};
		render(
			<MemoryRouter>
				<SignUp initialData={initialData} />
			</MemoryRouter>
		);
		await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
		expect(screen.getByRole('heading', { name: 'Get notified' })).toBeInTheDocument();
		expect(screen.getByText(/shows whether the trails in Upper Bidwell Park are open or closed/)).toBeInTheDocument();
		expect(screen.getByText(/checked every 15 minutes/)).toBeInTheDocument();
		expect(screen.getByText(/back to January 2020/)).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'map' })).toHaveAttribute('href', '/map');
		expect(screen.getByRole('link', { name: 'history page' })).toHaveAttribute('href', '/history');
	});
});
