import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { About } from './About';
import { TRAIL_PAGE_URL } from '../util/Util';

describe('About', () => {
	it('explains where the status comes from, the lag, and where to go next', () => {
		render(
			<MemoryRouter>
				<About />
			</MemoryRouter>
		);
		expect(screen.getByRole('heading', { name: 'About Bidwell Trail Checker' })).toBeInTheDocument();
		expect(screen.getByRole('heading', { name: 'Where the status comes from' })).toBeInTheDocument();
		expect(screen.getByText(/checks the City's page every 15 minutes/)).toBeInTheDocument();
		expect(screen.getByText(/can lag behind real conditions/)).toBeInTheDocument();
		expect(screen.getByRole('link', { name: "City of Chico's trail status page" })).toHaveAttribute('href', TRAIL_PAGE_URL);
		expect(screen.getByRole('link', { name: 'history page' })).toHaveAttribute('href', '/history');
		expect(screen.getByRole('link', { name: 'map' })).toHaveAttribute('href', '/map');
		expect(screen.getByRole('link', { name: 'Sign up on the home page' })).toHaveAttribute('href', '/');
		expect(screen.getByRole('link', { name: 'report it' })).toHaveAttribute('href', '/report');
		expect(screen.getByRole('link', { name: 'Gary Bettencourt' })).toHaveAttribute('href', 'https://garybettencourt.com');
	});
});
