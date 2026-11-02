type AppInitialData = {
	trailStatus: string;
	lastCheck: string;
	statusSince: { status: 'Open' | 'Closed'; at: string; source: 'auto' | 'manual' | 'email' } | null;
	captchaCode: number;
	renderedAt: number;
	siteUrl: string;
};

type ServerRenderer = {
	renderApp: (url: string, initialData: AppInitialData) => { markup: string; styles: string; metadata: string };
	renderMetadata: (pathname: string, status: string, lastCheck: string | undefined, siteUrl: string) => string;
	renderPageContent: (heading: string, description: string) => string;
};

async function loadRenderer() {
	const entryUrl = new URL('./client/build-ssr/entry-server.js', import.meta.url);
	return (await import(entryUrl.href)) as ServerRenderer;
}

export async function renderApp(url: string, initialData: AppInitialData) {
	const renderer = await loadRenderer();
	return renderer.renderApp(url, initialData);
}

export async function renderPageMetadata(pathname: string, status: string, lastCheck: string | undefined, siteUrl: string) {
	const renderer = await loadRenderer();
	return renderer.renderMetadata(pathname, status, lastCheck, siteUrl);
}

export async function renderPageContent(heading: string, description: string) {
	const renderer = await loadRenderer();
	return renderer.renderPageContent(heading, description);
}
