import React from 'react';
import { renderToStaticMarkup, renderToString } from 'react-dom/server';
import { App } from './App/App';
import type { AppInitialData } from './App/app-data';
import { PageContent, PageMetadata, getPageContent, renderPageMetadata } from './App/components/PageMetadata';

export function renderApp(url: string, initialData: AppInitialData) {
	const rendered = renderToString(
		<React.StrictMode>
			<App initialUrl={url} initialData={initialData} />
		</React.StrictMode>
	);
	const styles: string[] = [];
	const markup = rendered.replace(/<style data-emotion="[^"]+">[\s\S]*?<\/style>/g, (style) => {
		styles.push(style);
		return '';
	});
	const metadata = renderToStaticMarkup(
		<PageMetadata {...renderPageMetadata(url, initialData.trailStatus, initialData.lastCheck, initialData.siteUrl)} />
	);

	return { markup, styles: styles.join(''), metadata };
}

export function renderPageContent(pathname: string) {
	const content = getPageContent(pathname);
	return content ? renderToStaticMarkup(<PageContent heading={content.heading} description={content.description} />) : '';
}

export function renderMetadata(pathname: string, status: string, lastCheck: string | undefined, siteUrl: string) {
	return renderToStaticMarkup(<PageMetadata {...renderPageMetadata(pathname, status, lastCheck, siteUrl)} />);
}
