import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
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
