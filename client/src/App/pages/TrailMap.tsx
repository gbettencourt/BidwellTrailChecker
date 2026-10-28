import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, LayersControl, useMap } from 'react-leaflet';
import type { Feature, FeatureCollection, Geometry, LineString } from 'geojson';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Alert, Box, FormControlLabel, Paper, Skeleton, Stack, Switch, Typography } from '@mui/material';
import { TRAIL_INFO } from '../data/trailInfo';

type TrailProps = {
	name?: string;
	highway?: string;
	surface?: string;
	alwaysOpen?: boolean;
};

type Trails = FeatureCollection<LineString, TrailProps>;
type TrailFeature = Feature<Geometry, TrailProps>;

// SVG stroke attributes can't use CSS variables, so these are plain colors that read on both map styles
const TRAIL_TYPES: Record<string, { label: string; color: string }> = {
	path: { label: 'Trail', color: '#d9622b' },
	track: { label: 'Fire road', color: '#8a5a2b' }
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
			lineJoin: 'round'
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

const FitToTrails: React.FC<{ trails: Trails }> = ({ trails }) => {
	const map = useMap();
	useEffect(() => {
		const bounds = L.geoJSON(trails).getBounds();
		if (bounds.isValid()) map.fitBounds(bounds, { padding: [24, 24] });
	}, [map, trails]);
	return null;
};

const TrailMap: React.FC = () => {
	const [trails, setTrails] = useState<Trails>();
	const [error, setError] = useState(false);
	const [showAlwaysOpen, setShowAlwaysOpen] = useState(false);
	const [parkClosed, setParkClosed] = useState(false);

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

		// when the park trails are closed, start with the always-open trails highlighted
		fetch('/api/trailstatus')
			.then((res) => res.json())
			.then((status) => {
				if (status.trailStatus === 'Closed') {
					setParkClosed(true);
					setShowAlwaysOpen(true);
				}
			})
			.catch(() => {});
	}, []);

	const style = styleFor(showAlwaysOpen);

	const onEachTrail = (feature: TrailFeature, layer: L.Layer) => {
		const { name, surface, alwaysOpen } = feature.properties;
		const title = name ?? (alwaysOpen ? `${ALWAYS_OPEN_AREA} trail` : 'Unnamed trail');
		const details = [typeFor(feature).label, surface && `${surface} surface`].filter(Boolean).join(' · ');
		const openNote = alwaysOpen
			? `<br/><span style="color:${ALWAYS_OPEN_COLOR};font-weight:600">${ALWAYS_OPEN_AREA} · open during park closures</span>`
			: '';
		const osmId = `<br/><span style="opacity:.6;font-size:11px">OSM ${escapeHtml(String(feature.id ?? ''))}</span>`;
		layer.bindPopup(`<strong>${escapeHtml(title)}</strong><br/>${escapeHtml(details)}${openNote}${osmId}`);

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
			{parkClosed && (
				<Alert severity="warning">
					The park trails are closed right now. The {ALWAYS_OPEN_AREA} trails, highlighted in green, stay open during closures.
				</Alert>
			)}

			<FormControlLabel
				control={<Switch checked={showAlwaysOpen} onChange={(e) => setShowAlwaysOpen(e.target.checked)} color="success" />}
				label={`Highlight ${ALWAYS_OPEN_AREA}, which stays open when the park is closed`}
			/>

			<Paper
				sx={{
					overflow: 'hidden',
					height: { xs: '65vh', sm: '70vh' },
					minHeight: 360,
					position: 'relative',
					'& .leaflet-container': { height: '100%', fontFamily: 'inherit' },
					// darken the street map in dark mode so it doesn't glare (satellite imagery is left as is)
					'@media (prefers-color-scheme: dark)': {
						'& .street-tiles': { filter: 'invert(1) hue-rotate(180deg) brightness(0.85) contrast(0.9)' }
					}
				}}>
				{!trails && !error && <Skeleton variant="rectangular" sx={{ position: 'absolute', inset: 0, height: '100%', zIndex: 1000 }} />}
				<MapContainer center={[39.79, -121.75]} zoom={13} scrollWheelZoom>
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
				{[...Object.values(TRAIL_TYPES), { label: `${ALWAYS_OPEN_AREA} (open during closures)`, color: ALWAYS_OPEN_COLOR }].map(
					({ label, color }) => (
						<Stack key={label} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
							<Box sx={{ width: 22, height: 4, borderRadius: 2, bgcolor: color }} />
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
