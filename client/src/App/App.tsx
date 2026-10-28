import React, { ReactNode } from 'react';
import { GitHub } from '@mui/icons-material';
import BikeIcon from '@mui/icons-material/DirectionsBike';
import { AppBar, Toolbar, IconButton, Typography, Box, Container, CssBaseline, Link, Stack } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { Route, Routes, BrowserRouter, Link as RouterLink } from 'react-router-dom';
import { SignUp } from './pages/SignUp';
import { Unsubscribe } from './pages/Unsubscribe';
import { AdminPage } from './pages/Admin';
import { theme } from './theme';

export const TRAIL_PAGE_URL =
	'https://chico.ca.us/Our-Community/Parks-Recreation-and-Experience-the-Outdoors/Park-Trails/Trail-Gate--Facility-Status-and-Hours/index.html';

export const App: React.FC = () => {
	return (
		<ThemeProvider theme={theme}>
			<CssBaseline />
			<BrowserRouter>
				<Layout>
					<Routes>
						<Route path="/" element={<SignUp />} />
						<Route path="/unsubscribe" element={<Unsubscribe />} />
						<Route path="/admin" element={<AdminPage />} />
					</Routes>
				</Layout>
			</BrowserRouter>
		</ThemeProvider>
	);
};

type LayoutProps = {
	children: ReactNode;
};

const Layout: React.FC<LayoutProps> = ({ children }) => {
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
							<Typography variant="h6" component="span">
								Bidwell Trail Checker
							</Typography>
						</Box>
						<IconButton aria-label="GitHub repository" color="inherit" href="https://github.com/gbettencourt/BidwellTrailChecker">
							<GitHub />
						</IconButton>
					</Toolbar>
				</Container>
			</AppBar>

			<Container component="main" maxWidth="sm" sx={{ flexGrow: 1, py: { xs: 4, sm: 6 } }}>
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
