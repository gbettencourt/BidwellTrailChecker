import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { getPageMetadata, PageMetadata } from './PageMetadata';

const SITE_URL = 'https://www.chicomtb.com';

describe('getPageMetadata', () => {
	it('gives the homepage a status-aware title, description and canonical', () => {
		const meta = getPageMetadata('/', { status: 'Open', lastCheck: '2026-11-15T16:00:00.000Z', siteUrl: SITE_URL });
		expect(meta.title).toBe('Upper Bidwell Park trails: Open | Bidwell Trail Checker');
		expect(meta.description).toContain('currently Open');
		expect(meta.description).toContain('Last checked');
		expect(meta.canonical).toBe('https://www.chicomtb.com/');
		expect(meta.noIndex).toBeUndefined();
		expect(meta.structuredData).toBeDefined();
		const graph = (meta.structuredData as { '@graph': Array<Record<string, unknown>> })['@graph'];
		const park = graph.find((node) => node['@type'] === 'Park');
		expect(park?.['@id']).toBe('https://www.chicomtb.com/#upper-bidwell-park');
		expect(park?.dateModified).toBe('2026-11-15T16:00:00.000Z');
	});

	it('gives the homepage a generic title and description when the status is unknown', () => {
		const meta = getPageMetadata('/', { status: 'Unknown', siteUrl: SITE_URL });
		expect(meta.title).toBe('Bidwell Trail Checker | Upper Bidwell Park');
		expect(meta.description).toBe('Current trail status for Upper Bidwell Park in Chico, California. Check the latest status before visiting.');
		expect(meta.canonical).toBe('https://www.chicomtb.com/');
		const graph = (meta.structuredData as { '@graph': Array<Record<string, unknown>> })['@graph'];
		const park = graph.find((node) => node['@type'] === 'Park');
		expect(park?.dateModified).toBeUndefined();
	});

	it('gives the history page its own title, description and self-referencing canonical', () => {
		const meta = getPageMetadata('/history', { status: 'Unknown', siteUrl: SITE_URL });
		expect(meta.title).toBe('Bidwell Park Trail Status History | Bidwell Trail Checker');
		expect(meta.description).toBe('Review recorded trail openings and closures for Upper Bidwell Park in Chico, California.');
		expect(meta.canonical).toBe('https://www.chicomtb.com/history');
		expect(meta.noIndex).toBeUndefined();
		expect(meta.structuredData).toBeUndefined();
	});

	it('gives the map and report pages their own canonicals', () => {
		expect(getPageMetadata('/map', { status: 'Unknown', siteUrl: SITE_URL }).canonical).toBe('https://www.chicomtb.com/map');
		expect(getPageMetadata('/map', { status: 'Unknown', siteUrl: SITE_URL }).title).toBe(
			'Upper Bidwell Park Trail Map | Bidwell Trail Checker'
		);
		expect(getPageMetadata('/report', { status: 'Unknown', siteUrl: SITE_URL }).canonical).toBe('https://www.chicomtb.com/report');
		expect(getPageMetadata('/report', { status: 'Unknown', siteUrl: SITE_URL }).title).toBe(
			'Report Trail Status or Issue | Bidwell Trail Checker'
		);
	});

	it('marks unsubscribe and admin as noindex', () => {
		expect(getPageMetadata('/unsubscribe', { status: 'Unknown', siteUrl: SITE_URL }).noIndex).toBe(true);
		expect(getPageMetadata('/admin', { status: 'Unknown', siteUrl: SITE_URL }).noIndex).toBe(true);
		expect(getPageMetadata('/unsubscribe', { status: 'Unknown', siteUrl: SITE_URL }).canonical).toBe(
			'https://www.chicomtb.com/unsubscribe'
		);
	});

	it('marks unknown paths as noindex with a canonical for that path', () => {
		const meta = getPageMetadata('/not-a-page', { status: 'Unknown', siteUrl: SITE_URL });
		expect(meta.noIndex).toBe(true);
		expect(meta.canonical).toBe('https://www.chicomtb.com/not-a-page');
	});

	it('builds the canonical from the given site URL, never from the request host', () => {
		// the history-page indexing bug: the client canonical fell back to
		// window.location.origin and disagreed with the server one, so
		// Google ignored both. The metadata function must only use the
		// site URL it is given.
		const meta = getPageMetadata('/history', { status: 'Unknown', siteUrl: 'https://www.chicomtb.com' });
		expect(meta.canonical).toBe('https://www.chicomtb.com/history');
		const apex = getPageMetadata('/history', { status: 'Unknown', siteUrl: 'https://chicomtb.com' });
		expect(apex.canonical).toBe('https://chicomtb.com/history');
	});

	it('points the share image at og-image.jpg on the given site URL', () => {
		expect(getPageMetadata('/', { status: 'Open', siteUrl: SITE_URL }).image).toBe('https://www.chicomtb.com/og-image.jpg');
		expect(getPageMetadata('/map', { status: 'Unknown', siteUrl: SITE_URL }).image).toBe('https://www.chicomtb.com/og-image.jpg');
	});
});

describe('PageMetadata', () => {
	const meta = (pathname: string) => document.querySelector(`meta[property="${pathname}"]`)?.getAttribute('content');
	const twitter = (name: string) => document.querySelector(`meta[name="twitter:${name}"]`)?.getAttribute('content');

	it('renders Open Graph and Twitter Card tags for the page', () => {
		render(<PageMetadata {...getPageMetadata('/', { status: 'Open', lastCheck: '2026-11-15T16:00:00.000Z', siteUrl: SITE_URL })} />);
		expect(meta('og:title')).toBe('Upper Bidwell Park trails: Open | Bidwell Trail Checker');
		expect(meta('og:description')).toContain('currently Open');
		expect(meta('og:type')).toBe('website');
		expect(meta('og:url')).toBe('https://www.chicomtb.com/');
		expect(meta('og:site_name')).toBe('Bidwell Trail Checker');
		expect(meta('og:image')).toBe('https://www.chicomtb.com/og-image.jpg');
		expect(meta('og:image:width')).toBe('1200');
		expect(meta('og:image:height')).toBe('630');
		expect(meta('og:image:alt')).toContain('Bidwell Trail Checker');
		expect(twitter('card')).toBe('summary_large_image');
		expect(twitter('title')).toBe('Upper Bidwell Park trails: Open | Bidwell Trail Checker');
		expect(twitter('description')).toContain('currently Open');
		expect(twitter('image')).toBe('https://www.chicomtb.com/og-image.jpg');
	});

	it('renders the same share image for other pages', () => {
		render(<PageMetadata {...getPageMetadata('/map', { status: 'Unknown', siteUrl: SITE_URL })} />);
		expect(meta('og:url')).toBe('https://www.chicomtb.com/map');
		expect(meta('og:image')).toBe('https://www.chicomtb.com/og-image.jpg');
		expect(twitter('image')).toBe('https://www.chicomtb.com/og-image.jpg');
	});
});
