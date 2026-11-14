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
// Valentines, NYP, Disc Golf Course Access Road, Strava Town, Secret Trail
// Cheater Connector, Hwy 32 frontage trail connector, Hacksaw, JDP,
// Lower Secret Connector) have none.
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
	// unnamed trails south of the park, between the park boundary and CA 32, that stay open during closures.
	// names marked "Trailforks" below come from Trailforks' Upper Bidwell
	// Park trail pages (trailforks.com), matched by trailhead location,
	// length and elevation — not from OSM, which leaves these ways unnamed.
	// the Trailforks "Hwy 32 frontage trail connector" is 1.9 mi long; our
	// data holds only 0.73 mi of it, in five segments. Hacksaw, JDP and
	// Lower Secret Connector are lower-confidence Trailforks matches
	// (trailheads 0.37-0.7 mi from the way ends, lengths >10% off) that
	// Gary confirmed on 2026-11-14; JDP is marked decommissioned on
	// Trailforks but is still the local name for that way.
	'way/421269240': { name: 'Lower Secret Connector', alwaysOpen: true },
	'way/421270613': { alwaysOpen: true },
	'way/421270614': { name: 'Cat Run', alwaysOpen: true },
	'way/421271415': { name: 'Secret Trail', alwaysOpen: true },
	'way/421271416': { name: 'Secret Trail Cheater Connector', alwaysOpen: true },
	'way/421272154': { name: 'Valentines', alwaysOpen: true },
	'way/421272155': { alwaysOpen: true },
	'way/421272156': { alwaysOpen: true },
	'way/421272157': { name: 'Disc Golf Course Access Road', alwaysOpen: true },
	'way/421272504': { name: 'Hacksaw', alwaysOpen: true },
	'way/984073786': { name: 'NYP', alwaysOpen: true },
	'way/984073787': { name: 'JDP', alwaysOpen: true },
	'way/1164073446': { name: 'Hwy 32 frontage trail connector', alwaysOpen: true },
	'way/1164073447': { name: 'Hwy 32 frontage trail connector', alwaysOpen: true },
	'way/1164073448': { alwaysOpen: true },
	'way/1457058906': { name: 'Hwy 32 frontage trail connector', alwaysOpen: true },
	'way/1457058907': { name: 'Hwy 32 frontage trail connector', alwaysOpen: true },
	'way/1457058908': { name: 'Hwy 32 frontage trail connector', alwaysOpen: true },
	'way/1457059686': { alwaysOpen: true },
	'way/1457059687': { alwaysOpen: true }
};
