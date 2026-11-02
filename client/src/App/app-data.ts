import type { StatusEvent } from './util/Util';

export type AppInitialData = {
	trailStatus: string;
	lastCheck: string;
	statusSince: StatusEvent | null;
	captchaCode: number;
	renderedAt: number;
	siteUrl: string;
};
