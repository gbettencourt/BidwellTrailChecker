import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, LayersControl, ScaleControl, useMap } from 'react-leaflet';
import type { Feature, FeatureCollection, Geometry, LineString } from 'geojson';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Alert, Box, FormControlLabel, List, ListItemButton, ListItemText, Paper, Skeleton, Stack, Switch, TextField, Typography } from '@mui/material';
import { TRAIL_INFO } from '../data/trailInfo';
import type { TrailStatusState } from '../components/TrailStatusBanner';

type TrailProps = {
	name?: string;
	highway?: string;
	surface?: string;
	alwaysOpen?: boolean;
};

type Trails = FeatureCollection<LineString, TrailProps>;
type TrailFeature = Feature<Geometry, TrailProps>;

// SVG stroke attributes can't use CSS variables, so these are plain colors that read on both map styles
const TRAIL_TYPES: Record<string, { label: string; color: string; dashArray?: string }> = {
	path: { label: 'Trail', color: '#d9622b' },
	track: { label: 'Fire road', color: '#8a5a2b', dashArray: '8 6' }
};
const DEFAULT_TYPE = TRAIL_TYPES.path;
const ALWAYS_OPEN_COLOR = '#1f9d55';
// the always-open trail network south of the park
const ALWAYS_OPEN_AREA = 'Strava Town';

const typeFor = (feature?: TrailFeature) => TRAIL_TYPES[feature?.properties?.highway ?? ''] ?? DEFAULT_TYPE;

const styleFor =
	(highlightOpen: boolean) =>
	(feature?: TrailFeature): L.PathOptions => {
		const alwaysOpen = feature?.properties?.alwaysOpen;
		const base: L.PathOptions = {
			color: alwaysOpen ? ALWAYS_OPEN_COLOR : typeFor(feature).color,
			weight: 4,
			opacity: 0.9,
			lineCap: 'round',
			lineJoin: 'round',
			dashArray: typeFor(feature).dashArray
		};
		if (!highlightOpen) return base;
		// fade everything else so the always-open trails stand out
		return alwaysOpen ? { ...base, weight: 6, opacity: 1 } : { ...base, opacity: 0.25 };
	};

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// apply local names and always-open flags from trailInfo.ts
const withLocalInfo = (trails: Trails): Trails => ({
	...trails,
	features: trails.features.map((feature) => {
		const info = TRAIL_INFO[String(feature.id)];
		return info ? { ...feature, properties: { ...feature.properties, ...info } } : feature;
	})
});

// display name for a trail segment: its OSM / local name, or a generic label
const trailTitle = (feature: TrailFeature) => {
	const { name, alwaysOpen } = feature.properties;
	return name ?? (alwaysOpen ? `${ALWAYS_OPEN_AREA} trail` : 'Unnamed trail');
};

// length of one trail segment in miles, from its GeoJSON coordinates
const segmentLengthMi = (feature: TrailFeature) => {
	const coords = (feature.geometry as LineString).coordinates;
	let total = 0;
	for (let i = 1; i < coords.length; i++) {
		const [lon1, lat1] = coords[i - 1].map((d) => (d * Math.PI) / 180);
		const [lon2, lat2] = coords[i].map((d) => (d * Math.PI) / 180);
		const dLat = lat2 - lat1;
		const dLon = lon2 - lon1;
		total += 3958.8 * 2 * Math.asin(Math.sqrt(Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2));
	}
	return total;
};

const formatMiles = (mi: number) => `${mi >= 1 ? mi.toFixed(1) : mi.toFixed(2)} mi`;

type TrailGroup = {
	name: string;
	features: TrailFeature[];
	representativeId: string;
	typeLabel: string;
	alwaysOpen: boolean;
	distanceMi: number;
};

// group the (often split) segments of each named trail, so the list shows
// one entry per trail instead of one per OSM way. Unnamed segments are
// left out of the list — there is nothing to search for by name.
const trailGroups = (trails: Trails): TrailGroup[] => {
	const byName = new Map<string, TrailFeature[]>();
	for (const feature of trails.features) {
		const title = trailTitle(feature);
		if (title === 'Unnamed trail') continue;
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
				// total length of all the trail's segments in the map data
				distanceMi: features.reduce((sum, f) => sum + segmentLengthMi(f), 0)
			};
		})
		.sort((a, b) => a.name.localeCompare(b.name));
};

const FitToTrails: React.FC<{ trails: Trails }> = ({ trails }) => {
	const map = useMap();
	useEffect(() => {
		const bounds = L.geoJSON(trails).getBounds();
		if (bounds.isValid()) map.fitBounds(bounds, { padding: [24, 24] });
	}, [map, trails]);
	return null;
};

// captures the Leaflet map instance so the trail list can zoom to a trail
const CaptureMap: React.FC<{ onMap: (map: L.Map) => void }> = ({ onMap }) => {
	const map = useMap();
	useEffect(() => {
		onMap(map);
	}, [map, onMap]);
	return null;
};

const TrailMap: React.FC<{ status?: TrailStatusState }> = ({ status }) => {
	const [trails, setTrails] = useState<Trails>();
	const [error, setError] = useState(false);
	const [showAlwaysOpen, setShowAlwaysOpen] = useState(false);
	const [query, setQuery] = useState('');
	const [selectedName, setSelectedName] = useState<string | null>(null);
	const mapRef = useRef<L.Map | null>(null);
	const layersRef = useRef(new Map<string, L.Layer>());

	useEffect(() => {
		fetch('/trails.geojson')
			.then((res) => {
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				return res.json();
			})
			.then((data: Trails) => setTrails(withLocalInfo(data)))
			.catch((e) => {
				console.error('Failed to load trails:', e);
				setError(true);
			});

	}, []);

	// when the park trails are closed, start with the always-open trails highlighted
	useEffect(() => {
		if (status === 'Closed') setShowAlwaysOpen(true);
	}, [status]);

	const style = styleFor(showAlwaysOpen);

	const groups = useMemo(() => (trails ? trailGroups(trails) : []), [trails]);
	const representativeIds = useMemo(() => new Set(groups.map((g) => g.representativeId)), [groups]);
	const trailDistanceByName = useMemo(() => new Map(groups.map((g) => [g.name, g.distanceMi])), [groups]);
	const filteredGroups = useMemo(() => {
		const q = query.trim().toLowerCase();
		return q ? groups.filter((g) => g.name.toLowerCase().includes(q)) : groups;
	}, [groups, query]);

	// zoom to a trail from the list and open its popup
	const selectTrail = (group: TrailGroup) => {
		setSelectedName(group.name);
		const map = mapRef.current;
		if (!map) return;
		const bounds = L.geoJSON({ type: 'FeatureCollection', features: group.features } as Trails).getBounds();
		if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40] });
		const layer = layersRef.current.get(group.representativeId);
		if (layer) layer.openPopup();
	};

	const onEachTrail = (feature: TrailFeature, layer: L.Layer) => {
		const { surface, alwaysOpen } = feature.properties;
		const title = trailTitle(feature);
		layersRef.current.set(String(feature.id), layer);
		// print the trail name on the map once per trail, on its longest segment
		if (title !== 'Unnamed trail' && representativeIds.has(String(feature.id))) {
			layer.bindTooltip(title, { permanent: true, direction: 'center', className: 'trail-label', interactive: false });
		}
		const distanceMi = title === 'Unnamed trail' ? segmentLengthMi(feature) : (trailDistanceByName.get(title) ?? segmentLengthMi(feature));
		const details = [typeFor(feature).label, formatMiles(distanceMi), surface && `${surface} surface`].filter(Boolean).join(' · ');
		const openNote = alwaysOpen
			? `<br/><span style="color:${ALWAYS_OPEN_COLOR};font-weight:600">${ALWAYS_OPEN_AREA} · open during park closures</span>`
			: '';
		layer.bindPopup(`<strong>${escapeHtml(title)}</strong><br/>${escapeHtml(details)}${openNote}`);

		const path = layer as L.Path;
		if (showAlwaysOpen && alwaysOpen) layer.on('add', () => path.bringToFront());
		layer.on({
			mouseover: () => path.setStyle({ weight: 7, opacity: 1 }),
			mouseout: () => path.setStyle(style(feature))
		});
	};

	return (
		<Stack spacing={2.5}>
			<Box>
				<Typography variant="h4" component="h1">
					Trail map
				</Typography>
				<Typography color="text.secondary" sx={{ mt: 0.5 }}>
					Bike-legal trails in Upper Bidwell Park. Tap a trail for its name.
				</Typography>
			</Box>

			{error && <Alert severity="error">The trail map couldn't be loaded. Please try again later.</Alert>}

			<FormControlLabel
				control={<Switch checked={showAlwaysOpen} onChange={(e) => setShowAlwaysOpen(e.target.checked)} color="success" />}
				label={`Highlight ${ALWAYS_OPEN_AREA}, which stays open when the park is closed`}
			/>

			{trails && (
				<Paper variant="outlined" sx={{ p: 2 }}>
					<TextField
						fullWidth
						label="Find a trail"
						placeholder="Search trails…"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						size="small"
					/>
					<List dense sx={{ maxHeight: 220, overflow: 'auto', mt: 1 }}>
						{filteredGroups.map((group) => (
							<ListItemButton key={group.name} selected={selectedName === group.name} onClick={() => selectTrail(group)}>
								<ListItemText
										primary={group.name}
										secondary={`${group.typeLabel} · ${formatMiles(group.distanceMi)}${group.alwaysOpen ? ' · Stays open during park closures' : ''}`}
									/>
							</ListItemButton>
						))}
						{filteredGroups.length === 0 && (
							<Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 1 }}>
								No trails match &ldquo;{query.trim()}&rdquo;.
							</Typography>
						)}
					</List>
					<Typography variant="body2" color="text.secondary">
						{filteredGroups.length} of {groups.length} trails
					</Typography>
				</Paper>
			)}

			<Paper
				sx={{
					overflow: 'hidden',
					height: { xs: '65vh', sm: '70vh' },
					minHeight: 360,
					position: 'relative',
					'& .leaflet-container': { height: '100%', fontFamily: 'inherit' },
					// permanent trail-name labels drawn on the map
					'& .trail-label': {
						background: 'rgba(255, 255, 255, 0.88)',
						border: '1px solid rgba(0, 0, 0, 0.15)',
						borderRadius: 4,
						boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
						color: '#222',
						fontSize: 11,
						fontWeight: 600,
						padding: '1px 5px'
					},
					'& .trail-label::before': { display: 'none' },
					// darken the street map in dark mode so it doesn't glare (satellite imagery is left as is)
					'@media (prefers-color-scheme: dark)': {
						'& .street-tiles': { filter: 'invert(1) hue-rotate(180deg) brightness(0.85) contrast(0.9)' }
					}
				}}>
				{!trails && !error && <Skeleton variant="rectangular" sx={{ position: 'absolute', inset: 0, height: '100%', zIndex: 1000 }} />}
				<MapContainer center={[39.79, -121.75]} zoom={13} scrollWheelZoom>
					<CaptureMap onMap={(map) => { mapRef.current = map; }} />
					<ScaleControl position="bottomleft" />
					<LayersControl position="topright">
						<LayersControl.BaseLayer checked name="Map">
							<TileLayer
								className="street-tiles"
								attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
								url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
								maxZoom={19}
							/>
						</LayersControl.BaseLayer>
						<LayersControl.BaseLayer name="Satellite">
							<TileLayer
								attribution="Imagery &copy; Esri, Maxar, Earthstar Geographics &amp; the GIS User Community; trails &copy; OpenStreetMap contributors"
								url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
								maxZoom={19}
								maxNativeZoom={18}
							/>
						</LayersControl.BaseLayer>
					</LayersControl>
					{trails && (
						<>
							{/* remount on toggle so popups, hover handlers and draw order pick up the new style */}
							<GeoJSON key={String(showAlwaysOpen)} data={trails} style={style} onEachFeature={onEachTrail} />
							<FitToTrails trails={trails} />
						</>
					)}
				</MapContainer>
			</Paper>

			<Stack direction="row" spacing={2.5} sx={{ flexWrap: 'wrap', rowGap: 1, px: 0.5 }}>
				{[...Object.values(TRAIL_TYPES), { label: `${ALWAYS_OPEN_AREA} (open during closures)`, color: ALWAYS_OPEN_COLOR, dashArray: undefined }].map(
					({ label, color, dashArray }: { label: string; color: string; dashArray?: string }) => (
						<Stack key={label} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
							<Box
								sx={{
									width: 22,
									height: dashArray ? 0 : 4,
									borderRadius: 2,
									bgcolor: dashArray ? 'transparent' : color,
									borderTop: dashArray ? `3px dashed ${color}` : 'none'
								}}
							/>
							<Typography variant="body2" color="text.secondary">
								{label}
							</Typography>
						</Stack>
					)
				)}
			</Stack>

			<Typography variant="body2" color="text.secondary" sx={{ px: 0.5 }}>
				Trail data from OpenStreetMap and may be incomplete. Follow posted signs and closures at the park.
			</Typography>
		</Stack>
	);
};

export default TrailMap;
