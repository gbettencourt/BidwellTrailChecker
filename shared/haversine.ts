// Great-circle distance between two points, shared by the client map
// (miles) and the elevation sampler script (meters). The core is the
// central angle in radians; multiply by the earth's radius in the unit
// you need. (The script imports this file directly — Node 26 strips
// types, so a .ts import works there.)

export const EARTH_RADIUS_MI = 3958.8;
export const EARTH_RADIUS_M = 6371000;

export const haversineAngle = (lon1: number, lat1: number, lon2: number, lat2: number): number => {
	const toRad = (d: number) => (d * Math.PI) / 180;
	const dLat = toRad(lat2 - lat1);
	const dLon = toRad(lon2 - lon1);
	return (
		2 *
		Math.asin(
			Math.sqrt(Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2)
		)
	);
};

export const haversineMi = (lon1: number, lat1: number, lon2: number, lat2: number): number =>
	EARTH_RADIUS_MI * haversineAngle(lon1, lat1, lon2, lat2);

export const haversineM = (lon1: number, lat1: number, lon2: number, lat2: number): number =>
	EARTH_RADIUS_M * haversineAngle(lon1, lat1, lon2, lat2);
