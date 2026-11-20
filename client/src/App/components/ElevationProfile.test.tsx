import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ElevationProfile, { type TrailElevation } from './ElevationProfile';

const elevation: TrailElevation = {
	distanceMi: 2.06,
	gainFt: 598,
	lossFt: 120,
	minFt: 305,
	maxFt: 900,
	points: [
		{ d: 0, e: 305 },
		{ d: 1, e: 600 },
		{ d: 2.06, e: 900 }
	]
};

describe('ElevationProfile', () => {
	it('shows the trail stats and the elevation chart', () => {
		render(
			<ElevationProfile
				name="South Rim Trail"
				distanceMi={2.06}
				difficulty="Moderate to Difficult"
				elevation={elevation}
				onClose={() => {}}
			/>
		);
		expect(screen.getByRole('heading', { name: 'South Rim Trail' })).toBeInTheDocument();
		expect(screen.getByText('Moderate to Difficult')).toBeInTheDocument();
		expect(screen.getByText('2.1 mi', { selector: 'p' })).toBeInTheDocument();
		expect(screen.getByText('↑598 ft')).toBeInTheDocument();
		expect(screen.getByText('↓120 ft')).toBeInTheDocument();
		expect(screen.getByText('900 / 305 ft')).toBeInTheDocument();
		expect(
			screen.getByRole('img', { name: /Elevation profile for South Rim Trail: 598 feet of climbing over 2.1 miles/ })
		).toBeInTheDocument();
		expect(screen.queryByText(/Profile covers the longest continuous stretch/)).not.toBeInTheDocument();
	});

	it('says when the profile only covers part of the trail', () => {
		render(
			<ElevationProfile
				name="Strava Town trail"
				distanceMi={0.73}
				difficulty="Moderate"
				elevation={{ ...elevation, distanceMi: 0.34 }}
				onClose={() => {}}
			/>
		);
		expect(screen.getByText('Profile covers the longest continuous stretch (0.3 mi of 0.7 mi).')).toBeInTheDocument();
	});

	it('shows a fallback when no elevation data is available', () => {
		render(<ElevationProfile name="South Rim Trail" distanceMi={2.06} difficulty="Moderate to Difficult" onClose={() => {}} />);
		expect(screen.getByText("Elevation data isn't available for this trail yet.")).toBeInTheDocument();
		// gain, loss and high/low all fall back to an em dash
		expect(screen.getAllByText('—', { selector: 'p' })).toHaveLength(3);
		expect(screen.queryByRole('img')).not.toBeInTheDocument();
	});

	it('closes when the close button is clicked', () => {
		const onClose = vi.fn();
		render(<ElevationProfile name="South Rim Trail" distanceMi={2.06} elevation={elevation} onClose={onClose} />);
		fireEvent.click(screen.getByRole('button', { name: 'Close trail details' }));
		expect(onClose).toHaveBeenCalledTimes(1);
	});
});
