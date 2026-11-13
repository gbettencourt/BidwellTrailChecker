import React from 'react';
import { Box, IconButton, Paper, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

export type ElevationPoint = { d: number; e: number };

export type TrailElevation = {
	distanceMi: number;
	gainFt: number;
	lossFt: number;
	minFt: number;
	maxFt: number;
	points: ElevationPoint[];
};

const WIDTH = 300;
const HEIGHT = 110;
const PAD_X = 4;
const PAD_TOP = 14;
const PAD_BOTTOM = 18;

// elevation profile chart for one trail, from the precomputed data in
// trail-elevations.json (see scripts/compute-trail-elevations.mjs)
const ElevationProfile: React.FC<{
	name: string;
	distanceMi: number;
	elevation?: TrailElevation;
	onClose: () => void;
}> = ({ name, distanceMi, elevation, onClose }) => {
	const stats = [
		{ label: 'Distance', value: `${distanceMi >= 1 ? distanceMi.toFixed(1) : distanceMi.toFixed(2)} mi` },
		{ label: 'Elevation gain', value: elevation ? `↑${elevation.gainFt.toLocaleString()} ft` : '—' },
		{ label: 'Elevation loss', value: elevation ? `↓${elevation.lossFt.toLocaleString()} ft` : '—' },
		{ label: 'High / low', value: elevation ? `${elevation.maxFt.toLocaleString()} / ${elevation.minFt.toLocaleString()} ft` : '—' }
	];

	const points = elevation?.points ?? [];
	const maxD = points.length ? points[points.length - 1].d : 0;
	const range = elevation ? elevation.maxFt - elevation.minFt || 1 : 1;
	const x = (d: number) => PAD_X + (d / (maxD || 1)) * (WIDTH - PAD_X * 2);
	const y = (e: number) => PAD_TOP + (1 - (elevation ? (e - elevation.minFt) / range : 0)) * (HEIGHT - PAD_TOP - PAD_BOTTOM);
	const line =
		points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.d).toFixed(1)},${y(p.e).toFixed(1)}`).join(' ') || `M${x(0)},${y(0)}`;
	const area = `${line} L${x(maxD).toFixed(1)},${HEIGHT - PAD_BOTTOM} L${x(0).toFixed(1)},${HEIGHT - PAD_BOTTOM} Z`;
	// the profiled path is shorter than the trail when its segments don't
	// form one continuous route (the Strava Town network); say so
	const partial = elevation && Math.abs(elevation.distanceMi - distanceMi) > 0.1;

	return (
		<Paper variant="outlined" sx={{ p: 2 }}>
			<Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
				<Typography variant="h6" component="h2">
					{name}
				</Typography>
				<IconButton size="small" onClick={onClose} aria-label="Close trail details">
					<CloseIcon fontSize="small" />
				</IconButton>
			</Stack>
			<Stack direction="row" spacing={3} sx={{ flexWrap: 'wrap', rowGap: 0.5, mt: 0.5 }}>
				{stats.map(({ label, value }) => (
					<Box key={label}>
						<Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
							{label}
						</Typography>
						<Typography variant="body2" sx={{ fontWeight: 600 }}>
							{value}
						</Typography>
					</Box>
				))}
			</Stack>
			{elevation ? (
				<Box sx={{ mt: 1 }}>
					<svg
						viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
						width="100%"
						height={HEIGHT}
						role="img"
						aria-label={`Elevation profile for ${name}: ${elevation.gainFt} feet of climbing over ${distanceMi.toFixed(1)} miles`}
					>
						<path d={area} fill="rgba(25, 118, 210, 0.15)" />
						<path d={line} fill="none" stroke="#1976d2" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
						<text x={PAD_X} y={10} fontSize={9} fill="#666">
							{elevation.maxFt.toLocaleString()} ft
						</text>
						<text x={PAD_X} y={HEIGHT - 4} fontSize={9} fill="#666">
							0 mi
						</text>
						<text x={WIDTH - PAD_X} y={HEIGHT - 4} fontSize={9} fill="#666" textAnchor="end">
							{maxD.toFixed(1)} mi
						</text>
					</svg>
					{partial && (
						<Typography variant="caption" color="text.secondary">
							Profile covers the longest continuous stretch ({elevation.distanceMi.toFixed(1)} mi of {distanceMi.toFixed(1)} mi).
						</Typography>
					)}
				</Box>
			) : (
				<Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
					Elevation data isn't available for this trail yet.
				</Typography>
			)}
		</Paper>
	);
};

export default ElevationProfile;
