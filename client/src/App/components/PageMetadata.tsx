import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { normalizeTrailStatus } from '../util/api';
import type { TrailStatus } from '../../../../shared-types.js';

export type PageMetadataProps = {
	title: string;
	description: string;
	canonical: string;
	image: string;
	noIndex?: boolean;
	structuredData?: Record<string, unknown>;
};

type MetadataContext = {
	status: TrailStatus | 'Unknown';
	lastCheck?: string;
	siteUrl: string;
};

const PARK_NAME = 'Upper Bidwell Park trails';
const PAGE_TITLE = 'Bidwell Trail Checker';

// one record for every page's metadata — the heading is for the
// server-rendered shell of the history/report/about pages (see
// getPageContent); the other routes have no shell
type PageRoute = {
	title: string;
	description: string;
	noIndex?: boolean;
	heading?: string;
};

const PAGE_ROUTES: Record<string, PageRoute> = {
	'/map': {
		title: 'Upper Bidwell Park Trail Map | Bidwell Trail Checker',
		description:
			'Explore bike-legal trails in Upper Bidwell Park, Chico, California, including trails that remain open during park closures.'
	},
	'/history': {
		title: 'Bidwell Park Trail Status History | Bidwell Trail Checker',
		description: 'Review recorded trail openings and closures for Upper Bidwell Park in Chico, California.',
		heading: 'Upper Bidwell Park trail status history'
	},
	'/report': {
		title: 'Report Trail Status or Issue | Bidwell Trail Checker',
		description: 'Report a trail status discrepancy or an issue on the Upper Bidwell Park trails in Chico, California.',
		heading: 'Report a trail status or issue'
	},
	'/about': {
		title: 'About | Bidwell Trail Checker',
		description:
			'How Bidwell Trail Checker works: where the Upper Bidwell Park trail status comes from, what it means, and how to get alerts.',
		heading: 'About Bidwell Trail Checker'
	},
	'/unsubscribe': {
		title: `Unsubscribe | ${PAGE_TITLE}`,
		description: 'Unsubscribe from Bidwell Park trail status alerts.',
		noIndex: true
	},
	'/admin': {
		title: `Admin | ${PAGE_TITLE}`,
		description: 'Manage Bidwell Park trail status.',
		noIndex: true
	}
};

// heading + description for a page's server-rendered shell, from the same
// record as its metadata; undefined for routes without a shell
export function getPageContent(pathname: string): { heading: string; description: string } | undefined {
	const page = PAGE_ROUTES[pathname];
	return page?.heading ? { heading: page.heading, description: page.description } : undefined;
}

export function getPageMetadata(pathname: string, context: MetadataContext): PageMetadataProps {
	const canonical = new URL(pathname, context.siteUrl).href;
	const image = new URL('/og-image.jpg', context.siteUrl).href;
	if (pathname === '/') {
		const parsedDate = context.lastCheck ? new Date(context.lastCheck) : undefined;
		const checkedDate = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : undefined;
		const checkedAt = context.status !== 'Unknown' ? checkedDate?.toISOString() : undefined;
		const checkedText =
			checkedAt && checkedDate
				? ` Last checked ${new Intl.DateTimeFormat('en-US', {
						dateStyle: 'long',
						timeStyle: 'short',
						timeZone: 'America/Los_Angeles'
					}).format(checkedDate)}.`
				: '';
		const description =
			context.status === 'Unknown'
				? 'Current trail status for Upper Bidwell Park in Chico, California. Check the latest status before visiting.'
				: `${PARK_NAME} are currently ${context.status}.${checkedText}`;
		const parkId = `${canonical}#upper-bidwell-park`;
		return {
			title: context.status === 'Unknown' ? `${PAGE_TITLE} | Upper Bidwell Park` : `${PARK_NAME}: ${context.status} | ${PAGE_TITLE}`,
			description,
			canonical,
			image,
			structuredData: {
				'@context': 'https://schema.org',
				'@graph': [
					{
						'@type': 'WebSite',
						'@id': `${canonical}#website`,
						url: canonical,
						name: PAGE_TITLE,
						about: { '@id': parkId }
					},
					{
						'@type': 'Park',
						'@id': parkId,
						name: PARK_NAME,
						url: canonical,
						description,
						address: {
							'@type': 'PostalAddress',
							addressLocality: 'Chico',
							addressRegion: 'CA',
							addressCountry: 'US'
						},
						additionalProperty: {
							'@type': 'PropertyValue',
							name: 'Current trail status',
							value: context.status
						},
						...(checkedAt ? { dateModified: checkedAt } : {})
					}
				]
			}
		};
	}

	const page = PAGE_ROUTES[pathname] ?? {
		title: PAGE_TITLE,
		description: 'Trail status and alerts for Upper Bidwell Park in Chico, California.',
		noIndex: true
	};
	return {
		title: page.title,
		description: page.description,
		...(page.noIndex ? { noIndex: true } : {}),
		canonical,
		image
	};
}

export const PageMetadata: React.FC<PageMetadataProps> = ({ title, description, canonical, image, noIndex, structuredData }) => (
	<>
		<title>{title}</title>
		<meta name="description" content={description} />
		<link rel="canonical" href={canonical} />
		<meta property="og:title" content={title} />
		<meta property="og:description" content={description} />
		<meta property="og:type" content="website" />
		<meta property="og:url" content={canonical} />
		<meta property="og:site_name" content={PAGE_TITLE} />
		<meta property="og:image" content={image} />
		<meta property="og:image:width" content="1200" />
		<meta property="og:image:height" content="630" />
		<meta property="og:image:alt" content="Bidwell Trail Checker — Upper Bidwell Park trails, Chico, California" />
		<meta name="twitter:card" content="summary_large_image" />
		<meta name="twitter:title" content={title} />
		<meta name="twitter:description" content={description} />
		<meta name="twitter:image" content={image} />
		{noIndex && <meta name="robots" content="noindex, nofollow" />}
		{structuredData && (
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replaceAll('<', '\\u003c') }}
			/>
		)}
	</>
);

export const ClientPageMetadata: React.FC<{ status: TrailStatus | 'Unknown'; lastCheck?: string; siteUrl: string }> = ({
	status,
	lastCheck,
	siteUrl
}) => {
	const { pathname } = useLocation();
	const [mounted, setMounted] = useState(false);

	useEffect(() => setMounted(true), []);

	return mounted ? <PageMetadata {...getPageMetadata(pathname, { status, lastCheck, siteUrl })} /> : null;
};

export const PageContent: React.FC<{ heading: string; description: string }> = ({ heading, description }) => (
	<main>
		<h1>{heading}</h1>
		<p>{description}</p>
	</main>
);

export function renderPageMetadata(pathname: string, status: string, lastCheck: string | undefined, siteUrl: string) {
	const knownStatus: TrailStatus | 'Unknown' = normalizeTrailStatus(status, 'Unknown');
	return getPageMetadata(pathname, { status: knownStatus, lastCheck, siteUrl });
}
