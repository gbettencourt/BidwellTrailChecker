import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TrailStatusBanner } from './TrailStatusBanner';

describe('TrailStatusBanner', () => {
	it('shows a checking message while loading', () => {
		render(<TrailStatusBanner status="loading" />);
		expect(screen.getByText('Checking trail status…')).toBeInTheDocument();
	});

	it('shows the open message when trails are open', () => {
		render(<TrailStatusBanner status="Open" />);
		expect(screen.getByText('The park trails are open right now.')).toBeInTheDocument();
	});

	it('shows the closure message, including that Strava Town stays open', () => {
		render(<TrailStatusBanner status="Closed" />);
		expect(screen.getByText(/The park trails are closed right now/)).toBeInTheDocument();
		expect(screen.getByText(/Strava Town trails, highlighted in green, stay open/)).toBeInTheDocument();
	});

	it('shows the failure message with a retry button when the check fails', () => {
		const onRetry = vi.fn();
		render(<TrailStatusBanner status="unknown" onRetry={onRetry} />);
		expect(screen.getByText(/We couldn't check the trail status/)).toBeInTheDocument();
		fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
		expect(onRetry).toHaveBeenCalledTimes(1);
	});

	it('shows the failure message without a retry button when no retry is offered', () => {
		render(<TrailStatusBanner status="unknown" />);
		expect(screen.getByText(/We couldn't check the trail status/)).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
	});
});
