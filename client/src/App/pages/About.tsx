import React from 'react';
import { Link, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { TRAIL_PAGE_URL } from '../util/Util';

export const About: React.FC = () => (
	<Stack spacing={3}>
		<Stack spacing={0.5}>
			<Typography variant="h5" component="h1">
				About Bidwell Trail Checker
			</Typography>
			<Typography color="text.secondary">How the trail status works, where it comes from, and what it means.</Typography>
		</Stack>

		<Stack spacing={1}>
			<Typography variant="h6" component="h2">
				What this is
			</Typography>
			<Typography>
				Bidwell Trail Checker shows whether the trails in Upper Bidwell Park are open or closed, and can send you an email or text
				when the status changes.
			</Typography>
		</Stack>

		<Stack spacing={1}>
			<Typography variant="h6" component="h2">
				Where the status comes from
			</Typography>
			<Typography>
				The status comes from the{' '}
				<Link href={TRAIL_PAGE_URL} target="_blank" rel="noopener">
					City of Chico's trail status page
				</Link>
				, which manages the park. This site checks the City's page every 15 minutes and records each change on the{' '}
				<Link component={RouterLink} to="/history">
					history page
				</Link>
				.
			</Typography>
			<Typography>
				The City's status can lag behind real conditions — after heavy rain the trails may be soft or muddy while the site still
				reads Open. Always check the signs at the trailhead for the latest status before you ride.
			</Typography>
		</Stack>

		<Stack spacing={1}>
			<Typography variant="h6" component="h2">
				What the status covers
			</Typography>
			<Typography>
				The status covers the trails in Upper Bidwell Park. The{' '}
				<Link component={RouterLink} to="/map">
					map
				</Link>{' '}
				shows the bike-legal trails, including ones that stay open when the rest of the park is closed.
			</Typography>
		</Stack>

		<Stack spacing={1}>
			<Typography variant="h6" component="h2">
				Get notified
			</Typography>
			<Typography>
				<Link component={RouterLink} to="/">
					Sign up on the home page
				</Link>{' '}
				to get an email or text when the status changes.
			</Typography>
		</Stack>

		<Stack spacing={1}>
			<Typography variant="h6" component="h2">
				Something looks wrong?
			</Typography>
			<Typography>
				If the status looks wrong, or you spot an issue on a trail,{' '}
				<Link component={RouterLink} to="/report">
					report it
				</Link>
				.
			</Typography>
		</Stack>

		<Typography color="text.secondary">
			Built and run by{' '}
			<Link href="https://garybettencourt.com" target="_blank" rel="noopener">
				Gary Bettencourt
			</Link>
			, a Chico mountain biker.
		</Typography>
	</Stack>
);
