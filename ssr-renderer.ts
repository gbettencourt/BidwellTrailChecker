// the client owns this shape — it renders the app and parses the JSON on
// hydration — so the server imports it instead of keeping a second copy
import type { AppInitialData } from './client/src/App/app-data.js';

type ServerRenderer = {
	renderApp: (url: string, initialData: AppInitialData) => { markup: string; styles: string; metadata: string };
	renderMetadata: (pathname: string, status: string, lastCheck: string | undefined, siteUrl: string) => string;
	renderPageContent: (pathname: string) => string;
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

export async function renderPageContent(pathname: string) {
	const renderer = await loadRenderer();
	return renderer.renderPageContent(pathname);
}
