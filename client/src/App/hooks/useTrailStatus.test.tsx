import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { useTrailStatus } from './useTrailStatus';

const Probe: React.FC<{ initial?: { trailStatus: string; lastCheck: string } }> = ({ initial }) => {
	const { status, lastCheck, loading, retry } = useTrailStatus(initial);
	return (
		<div>
			<span data-testid="status">{status}</span>
			<span data-testid="last-check">{lastCheck}</span>
			<span data-testid="loading">{String(loading)}</span>
			<button onClick={() => void retry()}>Retry</button>
		</div>
	);
};

describe('useTrailStatus', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('shows the seeded status, then refreshes from the API', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({ ok: true, json: async () => ({ trailStatus: 'Open', lastCheck: '2026-11-19T10:00:00.000Z' }) })
		);
		render(<Probe initial={{ trailStatus: 'Closed', lastCheck: '2026-11-19T09:00:00.000Z' }} />);
		expect(screen.getByTestId('status')).toHaveTextContent('Closed');
		expect(screen.getByTestId('loading')).toHaveTextContent('false');
		await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('Open'));
		expect(screen.getByTestId('last-check')).toHaveTextContent('2026-11-19T10:00:00.000Z');
	});

	it('starts loading and fetches when there is no seed', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({ ok: true, json: async () => ({ trailStatus: 'Closed', lastCheck: '2026-11-19T10:00:00.000Z' }) })
		);
		render(<Probe />);
		expect(screen.getByTestId('status')).toHaveTextContent('loading');
		expect(screen.getByTestId('loading')).toHaveTextContent('true');
		await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('Closed'));
		expect(screen.getByTestId('loading')).toHaveTextContent('false');
	});

	it('reports unknown when the fetch fails', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
		render(<Probe initial={{ trailStatus: 'Open', lastCheck: '' }} />);
		await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unknown'));
		expect(screen.getByTestId('loading')).toHaveTextContent('false');
	});

	it('treats an unexpected status string as unknown', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({ ok: true, json: async () => ({ trailStatus: 'Maybe', lastCheck: '' }) })
		);
		render(<Probe />);
		await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unknown'));
	});

	it('retries on demand', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const fetchMock = vi
			.fn()
			.mockRejectedValueOnce(new Error('network down'))
			.mockResolvedValue({ ok: true, json: async () => ({ trailStatus: 'Open', lastCheck: '' }) });
		vi.stubGlobal('fetch', fetchMock);
		render(<Probe />);
		await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unknown'));
		screen.getByRole('button', { name: 'Retry' }).click();
		await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('Open'));
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});
});
