/**
 * Local details layered on top of the OpenStreetMap trail data in public/trails.geojson.
 *
 * Keys are OSM way ids ("way/123") used internally to match trails to local details.
 * - name: shown instead of (or in place of a missing) OSM name
 * - alwaysOpen: stays open when the park closes its trails, highlighted by the map's toggle
 */
export type TrailInfo = {
	name?: string;
	alwaysOpen?: boolean;
};

// difficulty ratings from the City of Chico's "Explore Upper Bidwell Park"
// trails map (https://explore-butte.files.svdcdn.com/production/documents/upper-bidwell-park-trails-map-web.pdf),
// keyed by the trail name shown on our map. Only trails the map rates are
// listed — local names the map doesn't cover (Cat Run, Secret Trail,
// Valentines, NYP, Disc Golf Course Access Road, Strava Town) have none.
export type TrailDifficulty =
	| 'Easy'
	| 'Easy to Moderate'
	| 'Moderate'
	| 'Moderate to Difficult'
	| 'Difficult'
	| 'Easy to Difficult';

export const TRAIL_DIFFICULTY: Record<string, TrailDifficulty> = {
	'Annie Bidwell Trail': 'Easy to Difficult',
	'B Trail': 'Difficult',
	'Guardian Trail': 'Easy to Moderate',
	'Live Oak Trail': 'Difficult',
	'Lower Trail': 'Easy',
	Maidu: 'Moderate',
	'Manzanita Trail': 'Moderate',
	'Middle Trail': 'Easy to Moderate',
	'North Rim Trail': 'Moderate',
	'South Rim Trail': 'Moderate to Difficult',
	// the map calls it Ten Mile House Road; same route as our Ten Mile House Trail
	'Ten Mile House Trail': 'Moderate',
	'Upper Trail': 'Moderate'
};

export const TRAIL_INFO: Record<string, TrailInfo> = {
	// unnamed trails south of the park, between the park boundary and CA 32, that stay open during closures
	'way/421269240': { alwaysOpen: true },
	'way/421270613': { alwaysOpen: true },
	'way/421270614': { name: 'Cat Run', alwaysOpen: true },
	'way/421271415': { name: 'Secret Trail', alwaysOpen: true },
	'way/421271416': { alwaysOpen: true },
	'way/421272154': { name: 'Valentines', alwaysOpen: true },
	'way/421272155': { alwaysOpen: true },
	'way/421272156': { alwaysOpen: true },
	'way/421272157': { name: 'Disc Golf Course Access Road', alwaysOpen: true },
	'way/421272504': { alwaysOpen: true },
	'way/984073786': { name: 'NYP', alwaysOpen: true },
	'way/984073787': { alwaysOpen: true },
	'way/1164073446': { alwaysOpen: true },
	'way/1164073447': { alwaysOpen: true },
	'way/1164073448': { alwaysOpen: true },
	'way/1457058906': { alwaysOpen: true },
	'way/1457058907': { alwaysOpen: true },
	'way/1457058908': { alwaysOpen: true },
	'way/1457059686': { alwaysOpen: true },
	'way/1457059687': { alwaysOpen: true }
};
