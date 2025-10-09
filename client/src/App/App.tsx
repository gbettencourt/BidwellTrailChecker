import React, { ReactNode } from 'react';
import { GitHub } from '@mui/icons-material';
import { AppBar, Toolbar, IconButton, Typography } from '@mui/material';
import { Route, Routes, BrowserRouter } from 'react-router-dom';
import { SignUp } from './pages/SignUp';
import { Unsubscribe } from './pages/Unsubscribe';

export const App: React.FC = () => {
	return (
		<BrowserRouter>
			<Routes>
				<Route
					path="/"
					element={
						<Layout>
							<SignUp />
						</Layout>
					}
				/>
				<Route
					path="/unsubscribe"
					element={
						<Layout>
							<Unsubscribe />
						</Layout>
					}
				/>
			</Routes>
		</BrowserRouter>
	);
};

type LayoutProps = {
	children: ReactNode;
};

const Layout: React.FC<LayoutProps> = ({ children }) => {
	return (
		<div>
			<AppBar position="sticky">
				<Toolbar>
					<Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
						Bidwell Trail Checker
					</Typography>

					<div>
						<IconButton
							size="large"
							aria-label="github link"
							color="inherit"
							href="https://github.com/gbettencourt/BidwellTrailChecker">
							<GitHub />
						</IconButton>
					</div>
				</Toolbar>
			</AppBar>
			{children}
		</div>
	);
};
