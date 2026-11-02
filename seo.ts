type RenderedPage = {
	metadata: string;
	markup: string;
	styles?: string;
	initialData?: unknown;
};

function replaceMarker(html: string, marker: string, value: string) {
	if (!html.includes(marker)) throw new Error(`Could not find HTML template marker: ${marker}`);
	return html.replace(marker, value);
}

export function renderPage(html: string, page: RenderedPage) {
	const initialData = page.initialData === undefined ? '' : JSON.stringify(page.initialData).replaceAll('<', '\\u003c');
	let result = replaceMarker(html, '<!-- PAGE_METADATA -->', page.metadata);
	result = replaceMarker(result, '<!-- SSR_STYLES -->', page.styles ?? '');
	result = replaceMarker(result, '<!-- APP_INITIAL_DATA -->', initialData);
	return replaceMarker(result, '<!-- TRAIL_STATUS_CONTENT -->', page.markup);
}
