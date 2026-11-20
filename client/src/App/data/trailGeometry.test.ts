import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TRAIL_DIFFICULTY, TRAIL_INFO } from './trailInfo';
import { formatMiles, segmentLengthMi, trailGroups, trailTitle, withLocalInfo, type TrailFeature, type Trails } from './trailGeometry';
import type { TrailElevation } from '../components/ElevationProfile';

// read as data, not modules: Vite only treats .json as JSON, and the trail
// data lives in a .geojson file. Vitest runs with the working directory at
// the client root, so the public files are reachable from there.
const trails = JSON.parse(readFileSync(join(process.cwd(), 'public/trails.geojson'), 'utf8')) as unknown as Trails;
const elevations = JSON.parse(readFileSync(join(process.cwd(), 'public/trail-elevations.json'), 'utf8')) as unknown as {
	trails: Record<string, TrailElevation>;
};

const feature = (id: string, properties: TrailFeature['properties'], coordinates: number[][] = [[0, 0]]): TrailFeature =>
	({
		type: 'Feature',
		id,
		properties,
		geometry: { type: 'LineString', coordinates }
	}) as TrailFeature;

describe('withLocalInfo', () => {
	it('applies local names and always-open flags by OSM way id', () => {
		const updated = withLocalInfo(trails);
		const cheater = updated.features.find((f) => String(f.id) === 'way/421271416');
		expect(cheater?.properties.name).toBe('Secret Trail Cheater Connector');
		expect(cheater?.properties.alwaysOpen).toBe(true);
	});

	it('leaves ways without local info untouched', () => {
		const updated = withLocalInfo(trails);
		const plain = updated.features.find((f) => String(f.id) === 'way/10289119');
		expect(plain?.properties.name).toBeUndefined();
		expect(plain?.properties.alwaysOpen).toBeUndefined();
	});
});

describe('trailTitle', () => {
	it('prefers the OSM or local name', () => {
		expect(trailTitle(feature('way/1', { name: 'South Rim Trail' }))).toBe('South Rim Trail');
	});

	it('labels unnamed always-open segments as the Strava Town trail', () => {
		expect(trailTitle(feature('way/1', { alwaysOpen: true }))).toBe('Strava Town trail');
	});

	it('labels other unnamed segments as Unnamed trail', () => {
		expect(trailTitle(feature('way/1', {}))).toBe('Unnamed trail');
	});
});

describe('segmentLengthMi', () => {
	it('measures one degree of latitude as about 69 miles', () => {
		const oneDegree = feature('way/1', {}, [
			[-121.75, 39.79],
			[-121.75, 40.79]
		]);
		expect(segmentLengthMi(oneDegree)).toBeCloseTo(69.09, 1);
	});

	it('sums every leg of a multi-point segment', () => {
		const twoLegs = feature('way/1', {}, [
			[-121.75, 39.79],
			[-121.75, 40.79],
			[-121.75, 41.79]
		]);
		expect(segmentLengthMi(twoLegs)).toBeCloseTo(138.19, 1);
	});

	it('is zero for a single point', () => {
		expect(segmentLengthMi(feature('way/1', {}, [[-121.75, 39.79]]))).toBe(0);
	});
});

describe('formatMiles', () => {
	it('shows one decimal for a mile or more, two below', () => {
		expect(formatMiles(2.06)).toBe('2.1 mi');
		expect(formatMiles(1)).toBe('1.0 mi');
		expect(formatMiles(0.48)).toBe('0.48 mi');
	});
});

describe('trailGroups on the real trail data', () => {
	const groups = trailGroups(withLocalInfo(trails));

	it('groups the 56 segments into 23 named trails', () => {
		expect(trails.features).toHaveLength(56);
		expect(groups).toHaveLength(23);
		const names = groups.map((g) => g.name);
		expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
	});

	it('gives every named trail a difficulty rating', () => {
		for (const group of groups) {
			expect(group.difficulty, `${group.name} has no difficulty rating`).toBeDefined();
		}
	});

	it('matches the known trail lengths', () => {
		const byName = new Map(groups.map((g) => [g.name, g.distanceMi]));
		expect(byName.get('South Rim Trail')).toBeCloseTo(2.06, 1);
		expect(byName.get('North Rim Trail')).toBeCloseTo(4.28, 1);
		// only the six still-unnamed always-open segments group as the
		// Strava Town trail; the named south-park segments are their own
		// trails, so this is 3.98 mi, not the 7.18 mi whole network
		expect(byName.get('Strava Town trail')).toBeCloseTo(3.98, 1);
		expect(byName.get('Hacksaw')).toBeCloseTo(0.87, 1);
		expect(byName.get('JDP')).toBeCloseTo(1.12, 1);
		expect(byName.get('Lower Secret Connector')).toBeCloseTo(0.31, 1);
	});

	it('marks the Strava Town network as always open', () => {
		const stravaTown = groups.find((g) => g.name === 'Strava Town trail');
		expect(stravaTown?.alwaysOpen).toBe(true);
		expect(stravaTown?.difficulty).toBe('Moderate');
	});

	it('labels each trail on one of its own segments', () => {
		for (const group of groups) {
			expect(group.features.some((f) => String(f.id) === group.representativeId)).toBe(true);
		}
	});

	it('has an elevation profile for every named trail', () => {
		for (const group of groups) {
			expect(elevations.trails[group.name], `${group.name} has no elevation profile`).toBeDefined();
		}
	});
});

describe('trail data integrity', () => {
	it('every local-info way id exists in the GeoJSON', () => {
		const ids = new Set(trails.features.map((f) => String(f.id)));
		for (const wayId of Object.keys(TRAIL_INFO)) {
			expect(ids.has(wayId), `${wayId} is in TRAIL_INFO but not in trails.geojson`).toBe(true);
		}
	});

	it('every difficulty rating is for a trail that exists', () => {
		const names = new Set(trailGroups(withLocalInfo(trails)).map((g) => g.name));
		for (const name of Object.keys(TRAIL_DIFFICULTY)) {
			expect(names.has(name), `${name} has a difficulty rating but is not a named trail`).toBe(true);
		}
	});
});
