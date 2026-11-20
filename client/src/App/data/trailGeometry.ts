import type { Feature, FeatureCollection, Geometry, LineString } from 'geojson';
import { TRAIL_INFO, TRAIL_DIFFICULTY, type TrailDifficulty } from './trailInfo';
import { haversineMi } from '../../../../shared/haversine.js';

// Pure trail-data logic, kept free of Leaflet and React so it can be tested
// without a map. TrailMap.tsx renders these results; it does not compute them.

export type TrailProps = {
	name?: string;
	highway?: string;
	surface?: string;
	alwaysOpen?: boolean;
};

export type Trails = FeatureCollection<LineString, TrailProps>;
export type TrailFeature = Feature<Geometry, TrailProps>;

// SVG stroke attributes can't use CSS variables, so these are plain colors that read on both map styles
export const TRAIL_TYPES: Record<string, { label: string; color: string; dashArray?: string }> = {
	path: { label: 'Trail', color: '#d9622b' },
	track: { label: 'Fire road', color: '#8a5a2b', dashArray: '8 6' }
};
export const DEFAULT_TYPE = TRAIL_TYPES.path;
// the always-open trail network south of the park
export const ALWAYS_OPEN_AREA = 'Strava Town';
// label for segments with no name at all
export const UNNAMED_TRAIL = 'Unnamed trail';

export const typeFor = (feature?: TrailFeature) => TRAIL_TYPES[feature?.properties?.highway ?? ''] ?? DEFAULT_TYPE;

// apply local names and always-open flags from trailInfo.ts
export const withLocalInfo = (trails: Trails): Trails => ({
	...trails,
	features: trails.features.map((feature) => {
		const info = TRAIL_INFO[String(feature.id)];
		return info ? { ...feature, properties: { ...feature.properties, ...info } } : feature;
	})
});

// display name for a trail segment: its OSM / local name, or a generic label
export const trailTitle = (feature: TrailFeature) => {
	const { name, alwaysOpen } = feature.properties;
	return name ?? (alwaysOpen ? `${ALWAYS_OPEN_AREA} trail` : UNNAMED_TRAIL);
};

// length of one trail segment in miles, from its GeoJSON coordinates
export const segmentLengthMi = (feature: TrailFeature) => {
	const coords = (feature.geometry as LineString).coordinates;
	let total = 0;
	for (let i = 1; i < coords.length; i++) {
		total += haversineMi(coords[i - 1][0], coords[i - 1][1], coords[i][0], coords[i][1]);
	}
	return total;
};

export const formatMiles = (mi: number) => `${mi >= 1 ? mi.toFixed(1) : mi.toFixed(2)} mi`;

export type TrailGroup = {
	name: string;
	features: TrailFeature[];
	representativeId: string;
	typeLabel: string;
	alwaysOpen: boolean;
	distanceMi: number;
	difficulty?: TrailDifficulty;
};

// group the (often split) segments of each named trail, so the list shows
// one entry per trail instead of one per OSM way. Unnamed segments are
// left out of the list — there is nothing to search for by name.
export const trailGroups = (trails: Trails): TrailGroup[] => {
	const byName = new Map<string, TrailFeature[]>();
	for (const feature of trails.features) {
		const title = trailTitle(feature);
		if (title === UNNAMED_TRAIL) continue;
		const group = byName.get(title) ?? [];
		group.push(feature);
		byName.set(title, group);
	}
	return [...byName.entries()]
		.map(([name, features]) => {
			// label the longest segment of the trail, so a name appears once
			// on the map instead of once per split segment
			const representative = [...features].sort(
				(a, b) =>
					((b.geometry as LineString).coordinates.length ?? 0) - ((a.geometry as LineString).coordinates.length ?? 0)
			)[0];
			return {
				name,
				features,
				representativeId: String(representative.id),
				typeLabel: typeFor(representative).label,
				alwaysOpen: features.some((f) => f.properties.alwaysOpen),
				difficulty: TRAIL_DIFFICULTY[name],
				// total length of all the trail's segments in the map data
				distanceMi: features.reduce((sum, f) => sum + segmentLengthMi(f), 0)
			};
		})
		.sort((a, b) => a.name.localeCompare(b.name));
};
