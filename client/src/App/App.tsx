import React, { ReactNode, useState } from 'react';
import { GitHub } from '@mui/icons-material';
import HistoryIcon from '@mui/icons-material/History';
import MenuIcon from '@mui/icons-material/Menu';
import BikeIcon from '@mui/icons-material/DirectionsBike';
import MapOutlined from '@mui/icons-material/MapOutlined';
import { AppBar, Toolbar, IconButton, Typography, Box, Button, Container, CssBaseline, Link, Menu, MenuItem, Stack } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { Route, Routes, BrowserRouter, MemoryRouter, Link as RouterLink, useLocation } from 'react-router-dom';
import { SignUp } from './pages/SignUp';
import { MapPage } from './pages/MapPage';
import { Unsubscribe } from './pages/Unsubscribe';
import { AdminPage } from './pages/Admin';
import { StatusHistory } from './pages/StatusHistory';
import { TrailReportPage } from './pages/TrailReport';
import { theme } from './theme';
import { TRAIL_PAGE_URL } from './util/Util';
import type { AppInitialData } from './app-data';
import { ClientPageMetadata } from './components/PageMetadata';

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
				<Route path="/map" element={<MapPage initialData={initialData} />} />
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

// header nav: Map, History, Report. On small screens the inline links
// collapse into a hamburger menu so the title and GitHub link keep room.
const NAV_ITEMS = [
	{ label: 'Map', to: '/map' },
	{ label: 'History', to: '/history' },
	{ label: 'Report', to: '/report' }
];

const Layout: React.FC<LayoutProps> = ({ children }) => {
	const isMap = useLocation().pathname.toLowerCase() === '/map';
	const [navAnchor, setNavAnchor] = useState<HTMLElement | null>(null);
	const navOpen = Boolean(navAnchor);

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
						<Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center' }}>
							<Button component={RouterLink} to="/map" color="inherit" startIcon={<MapOutlined />} sx={{ minWidth: 0 }}>
								Map
							</Button>
							<Button component={RouterLink} to="/history" color="inherit" startIcon={<HistoryIcon />} sx={{ minWidth: 0 }}>
								History
							</Button>
							<Button component={RouterLink} to="/report" color="inherit" sx={{ minWidth: 0 }}>
								Report
							</Button>
						</Box>
						<IconButton
							aria-label="Menu"
							aria-haspopup="true"
							aria-expanded={navOpen ? 'true' : undefined}
							color="inherit"
							onClick={(e) => setNavAnchor(e.currentTarget)}
							sx={{ display: { xs: 'flex', sm: 'none' } }}>
							<MenuIcon />
						</IconButton>
						<Menu anchorEl={navAnchor} open={navOpen} onClose={() => setNavAnchor(null)}>
							{NAV_ITEMS.map(({ label, to }) => (
								<MenuItem key={to} component={RouterLink} to={to} onClick={() => setNavAnchor(null)}>
									{label}
								</MenuItem>
							))}
						</Menu>
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
