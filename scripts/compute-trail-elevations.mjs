// One-time elevation sampler for the trail map.
//
// Reads client/public/trails.geojson, stitches each named trail's OSM
// segments into one continuous path (falling back to its longest segment
// when they don't form a single path), samples elevations along it, and
// writes client/public/trail-elevations.json, which TrailMap fetches at
// runtime. Re-run after trails.geojson changes:
//
//   node scripts/compute-trail-elevations.mjs
//
// Elevation source: OpenTopoData ned10m (USGS 3DEP, 10 m) — free, no key,
// public instance limited to 100 locations/request, 1 request/second and
// 1,000 requests/day, so this script batches and throttles. If a chunk
// fails twice it falls back to the Open-Meteo elevation API (Copernicus
// DEM, 90 m) for that chunk. Elevations are smoothed with a moving
// average before gain/loss are computed, so DEM noise doesn't inflate
// the climbing.

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const SAMPLE_SPACING_M = 50;
const MAX_POINTS = 150;
const M_PER_MILE = 1609.344;
const FT_PER_M = 3.28084;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const haversineM = ([lon1, lat1], [lon2, lat2]) => {
	const toRad = (d) => (d * Math.PI) / 180;
	const dLat = toRad(lat2 - lat1);
	const dLon = toRad(lon2 - lon1);
	const a =
		Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
	return 6371000 * 2 * Math.asin(Math.sqrt(a));
};

const pathLengthM = (coords) => {
	let total = 0;
	for (let i = 1; i < coords.length; i++) total += haversineM(coords[i - 1], coords[i]);
	return total;
};

// local names / always-open flags from trailInfo.ts (same source TrailMap uses)
const parseTrailInfo = (text) => {
	const info = {};
	for (const m of text.matchAll(/'(way\/\d+)': \{([^}]*)\}/g)) {
		const name = /name: '([^']+)'/.exec(m[2]);
		info[m[1]] = { name: name?.[1] ?? null, alwaysOpen: m[2].includes('alwaysOpen: true') };
	}
	return info;
};

const trailTitle = (feature, info) => {
	const local = info[String(feature.id)];
	const name = feature.properties?.name ?? local?.name ?? null;
	const alwaysOpen = feature.properties?.alwaysOpen ?? local?.alwaysOpen ?? false;
	return name ?? (alwaysOpen ? 'Strava Town trail' : 'Unnamed trail');
};

const endKey = ([lon, lat]) => `${lon.toFixed(6)},${lat.toFixed(6)}`;

// join a trail's split segments into one continuous path, if they form one
const stitch = (segments) => {
	if (segments.length === 1) return segments[0];
	const longest = [...segments].sort((a, b) => pathLengthM(b) - pathLengthM(a))[0];
	const path = [...longest];
	const used = new Set([segments.indexOf(longest)]);
	let changed = true;
	while (changed) {
		changed = false;
		for (let i = 0; i < segments.length; i++) {
			if (used.has(i)) continue;
			const seg = segments[i];
			if (endKey(seg[seg.length - 1]) === endKey(path[0])) {
				path.unshift(...seg.slice(0, -1));
				used.add(i);
				changed = true;
			} else if (endKey(seg[0]) === endKey(path[0])) {
				path.unshift(...[...seg].reverse().slice(0, -1));
				used.add(i);
				changed = true;
			} else if (endKey(seg[0]) === endKey(path[path.length - 1])) {
				path.push(...seg.slice(1));
				used.add(i);
				changed = true;
			} else if (endKey(seg[seg.length - 1]) === endKey(path[path.length - 1])) {
				path.push(...[...seg].reverse().slice(1));
				used.add(i);
				changed = true;
			}
		}
	}
	const stitchedLen = pathLengthM(path);
	const totalLen = segments.reduce((sum, s) => sum + pathLengthM(s), 0);
	// only trust the stitch if it covers (nearly) the whole trail
	return stitchedLen >= 0.9 * totalLen ? path : longest;
};

// points along the path every ~SAMPLE_SPACING_M, plus the end
const samplePath = (coords) => {
	const total = pathLengthM(coords);
	const n = Math.min(MAX_POINTS, Math.max(2, Math.round(total / SAMPLE_SPACING_M) + 1));
	const step = total / (n - 1);
	const points = [];
	let segIdx = 0;
	let segStart = 0;
	let segLen = haversineM(coords[0], coords[1]);
	for (let k = 0; k < n; k++) {
		const target = Math.min(k * step, total);
		while (segIdx < coords.length - 2 && segStart + segLen < target) {
			segStart += segLen;
			segIdx++;
			segLen = haversineM(coords[segIdx], coords[segIdx + 1]);
		}
		const frac = segLen === 0 ? 0 : (target - segStart) / segLen;
		const [lon1, lat1] = coords[segIdx];
		const [lon2, lat2] = coords[segIdx + 1];
		points.push({ lon: lon1 + (lon2 - lon1) * frac, lat: lat1 + (lat2 - lat1) * frac, dMi: target / M_PER_MILE });
	}
	return points;
};

const fetchElevations = async (points) => {
	const locations = points.map((p) => `${p.lat},${p.lon}`).join('|');
	const url = `https://api.opentopodata.org/v1/ned10m?locations=${locations}`;
	for (let attempt = 0; attempt < 2; attempt++) {
		try {
			const res = await fetch(url);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = await res.json();
			const values = data.results?.map((r) => r.elevation);
			if (!values || values.length !== points.length || values.some((v) => v == null)) {
				throw new Error('incomplete results');
			}
			return values;
		} catch (e) {
			console.error(`  OpenTopoData attempt ${attempt + 1} failed: ${e.message}`);
			await sleep(2000);
		}
	}
	// fallback: Open-Meteo elevation API (Copernicus DEM, 90 m)
	const lats = points.map((p) => p.lat).join(',');
	const lons = points.map((p) => p.lon).join(',');
	const res = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lons}`);
	if (!res.ok) throw new Error(`Open-Meteo fallback failed: HTTP ${res.status}`);
	const data = await res.json();
	if (!data.elevation || data.elevation.length !== points.length) throw new Error('Open-Meteo incomplete results');
	return data.elevation;
};

const smooth = (values, window = 5) => {
	const half = Math.floor(window / 2);
	return values.map((_, i) => {
		const slice = values.slice(Math.max(0, i - half), Math.min(values.length, i + half + 1));
		return slice.reduce((a, b) => a + b, 0) / slice.length;
	});
};

const main = async () => {
	const geojson = JSON.parse(await readFile(join(root, 'client/public/trails.geojson'), 'utf8'));
	const trailInfo = parseTrailInfo(await readFile(join(root, 'client/src/App/data/trailInfo.ts'), 'utf8'));

	const groups = new Map();
	for (const feature of geojson.features) {
		const title = trailTitle(feature, trailInfo);
		if (title === 'Unnamed trail') continue;
		const group = groups.get(title) ?? [];
		group.push(feature.geometry.coordinates);
		groups.set(title, group);
	}

	// sample every named trail, then fetch elevations in batches of 100
	const jobs = [];
	for (const [name, segments] of [...groups.entries()].sort()) {
		const path = stitch(segments);
		const points = samplePath(path);
		jobs.push({ name, points, pathLenM: pathLengthM(path) });
	}
	const allPoints = jobs.flatMap((j) => j.points);
	console.log(`${jobs.length} trails, ${allPoints.length} sample points`);
	let offset = 0;
	for (let i = 0; i < allPoints.length; i += 100) {
		const chunk = allPoints.slice(i, i + 100);
		const values = await fetchElevations(chunk);
		chunk.forEach((p, k) => (p.elevM = values[k]));
		offset += chunk.length;
		console.log(`  fetched ${offset}/${allPoints.length}`);
		if (i + 100 < allPoints.length) await sleep(1100); // OpenTopoData: 1 request/second
	}

	const trails = {};
	for (const { name, points } of jobs) {
		const smoothed = smooth(points.map((p) => p.elevM));
		const feet = smoothed.map((m) => m * FT_PER_M);
		let gain = 0;
		let loss = 0;
		for (let i = 1; i < feet.length; i++) {
			const diff = feet[i] - feet[i - 1];
			if (diff > 0) gain += diff;
			else loss -= diff;
		}
		trails[name] = {
			distanceMi: Math.round(points[points.length - 1].dMi * 100) / 100,
			gainFt: Math.round(gain),
			lossFt: Math.round(loss),
			minFt: Math.round(Math.min(...feet)),
			maxFt: Math.round(Math.max(...feet)),
			points: points.map((p, i) => ({ d: Math.round(p.dMi * 1000) / 1000, e: Math.round(feet[i]) }))
		};
		console.log(
			`${name}: ${trails[name].distanceMi} mi, +${trails[name].gainFt} ft / -${trails[name].lossFt} ft, ${trails[name].minFt}–${trails[name].maxFt} ft`
		);
	}

	const out = {
		generatedAt: new Date().toISOString(),
		source: 'OpenTopoData ned10m (USGS 3DEP), smoothed; Open-Meteo Copernicus DEM fallback',
		trails
	};
	await writeFile(join(root, 'client/public/trail-elevations.json'), JSON.stringify(out, null, 2) + '\n');
	console.log('wrote client/public/trail-elevations.json');
};

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
