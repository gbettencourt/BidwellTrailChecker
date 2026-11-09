import React, { lazy, ReactNode, Suspense } from 'react';
import { GitHub } from '@mui/icons-material';
import BikeIcon from '@mui/icons-material/DirectionsBike';
import MapOutlined from '@mui/icons-material/MapOutlined';
import { AppBar, Toolbar, IconButton, Typography, Box, Button, Container, CssBaseline, Link, Stack, Skeleton } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { Route, Routes, BrowserRouter, MemoryRouter, Link as RouterLink, useLocation } from 'react-router-dom';
import { SignUp } from './pages/SignUp';
import { Unsubscribe } from './pages/Unsubscribe';
import { AdminPage } from './pages/Admin';
import { StatusHistory } from './pages/StatusHistory';
import { TrailReportPage } from './pages/TrailReport';
import { theme } from './theme';
import { TRAIL_PAGE_URL } from './util/Util';
import type { AppInitialData } from './app-data';
import { ClientPageMetadata } from './components/PageMetadata';

// Leaflet is large, so only load it when someone opens the map
const TrailMap = lazy(() => import('./pages/TrailMap'));

type AppProps = {
	initialUrl?: string;
	initialData?: AppInitialData;
};

export const App: React.FC<AppProps> = ({ initialUrl, initialData }) => {
	const routes = (
		<Layout>
			<Routes>
				<Route path="/" element={<SignUp initialData={initialData} />} />
				<Route path="/unsubscribe" element={<Unsubscribe />} />
				<Route path="/admin" element={<AdminPage />} />
				<Route path="/history" element={<StatusHistory />} />
				<Route path="/report" element={<TrailReportPage />} />
				<Route
					path="/map"
					element={
						<Suspense fallback={<Skeleton variant="rounded" height="70vh" />}>
							<TrailMap />
						</Suspense>
					}
				/>
			</Routes>
		</Layout>
	);
	const metadataSiteUrl = initialData?.siteUrl ?? (initialUrl ? 'https://chicomtb.com' : window.location.origin);
	const metadata = (
		<ClientPageMetadata
			status={initialData?.trailStatus === 'Open' || initialData?.trailStatus === 'Closed' ? initialData.trailStatus : 'Unknown'}
			lastCheck={initialData?.lastCheck}
			siteUrl={metadataSiteUrl}
		/>
	);

	return (
		<ThemeProvider theme={theme}>
			<CssBaseline />
			{initialUrl ? (
				<MemoryRouter initialEntries={[initialUrl]}>
					{metadata}
					{routes}
				</MemoryRouter>
			) : (
				<BrowserRouter>
					{metadata}
					{routes}
				</BrowserRouter>
			)}
		</ThemeProvider>
	);
};

type LayoutProps = {
	children: ReactNode;
};

const Layout: React.FC<LayoutProps> = ({ children }) => {
	const isMap = useLocation().pathname.toLowerCase() === '/map';

	return (
		<Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
			<AppBar
				position="sticky"
				color="transparent"
				sx={{
					backdropFilter: 'blur(12px)',
					backgroundColor: 'rgba(var(--mui-palette-background-defaultChannel) / 0.8)',
					borderBottom: 1,
					borderColor: 'divider'
				}}>
				<Container maxWidth="md">
					<Toolbar disableGutters>
						<Box
							component={RouterLink}
							to="/"
							sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexGrow: 1, color: 'text.primary', textDecoration: 'none' }}>
							<Box
								sx={{
									width: 36,
									height: 36,
									borderRadius: '10px',
									display: 'grid',
									placeItems: 'center',
									bgcolor: 'primary.main',
									color: 'primary.contrastText'
								}}>
								<BikeIcon fontSize="small" />
							</Box>
							<Typography variant="h6" component="span" sx={{ fontSize: { xs: '1.05rem', sm: '1.25rem' } }}>
								Bidwell Trail Checker
							</Typography>
						</Box>
						<Button component={RouterLink} to="/map" color="inherit" startIcon={<MapOutlined />} sx={{ minWidth: 0 }}>
							Map
						</Button>
						<Button component={RouterLink} to="/report" color="inherit" sx={{ minWidth: 0 }}>
							Report
						</Button>
						<IconButton aria-label="GitHub repository" color="inherit" href="https://github.com/gbettencourt/BidwellTrailChecker">
							<GitHub />
						</IconButton>
					</Toolbar>
				</Container>
			</AppBar>

			<Container component="main" maxWidth={isMap ? 'lg' : 'sm'} sx={{ flexGrow: 1, py: { xs: 4, sm: 6 } }}>
				{children}
			</Container>

			<Box component="footer" sx={{ borderTop: 1, borderColor: 'divider', py: 3 }}>
				<Container maxWidth="md">
					<Stack
						direction={{ xs: 'column', sm: 'row' }}
						spacing={{ xs: 1, sm: 3 }}
						sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}>
						<Typography variant="body2" color="text.secondary">
							Trail status for Upper Bidwell Park, Chico CA
						</Typography>
						<Stack direction="row" spacing={3}>
							<Link component={RouterLink} to="/unsubscribe" variant="body2" color="text.secondary" underline="hover">
								Unsubscribe
							</Link>
							<Link component={RouterLink} to="/report" variant="body2" color="text.secondary" underline="hover">
								Report a trail issue
							</Link>
							<Link href={TRAIL_PAGE_URL} target="_blank" rel="noopener" variant="body2" color="text.secondary" underline="hover">
								City trail page
							</Link>
						</Stack>
					</Stack>
				</Container>
			</Box>
		</Box>
	);
};
