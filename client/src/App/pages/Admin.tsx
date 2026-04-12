import { Box, Typography, Button, Stack, Chip, Paper, TextField, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { useEffect, useState } from 'react';

type OverrideValue = 'open' | 'closed' | 'auto';

interface TrailStatus {
	override: OverrideValue;
	autoStatus: 'open' | 'closed';
	effectiveStatus: 'open' | 'closed';
}

export function AdminPage() {
	const [password, setPassword] = useState('');
	const [token, setToken] = useState(localStorage.getItem('admin_token'));

	const login = async () => {
		const res = await fetch('/api/admin/login', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ password })
		});

		if (!res.ok) return;

		const data = await res.json();
		localStorage.setItem('admin_token', data.token);
		setToken(data.token);
	};

	if (!token) {
		return (
			<Box p={4}>
				<Paper sx={{ p: 3 }}>
					<Stack spacing={2}>
						<Typography variant="h5">Admin Login</Typography>

						<TextField
							type="password"
							label="Password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							fullWidth
						/>

						<Button variant="contained" onClick={login} fullWidth>
							Login
						</Button>
					</Stack>
				</Paper>
			</Box>
		);
	}

	return <AdminControls />;
}

function AdminControls() {
	const [override, setOverride] = useState<OverrideValue>('auto');
	const [loading, setLoading] = useState(true);

	const fetchStatus = async () => {
		const res = await fetch('/api/admin/status', {
			headers: {
				Authorization: `Bearer ${localStorage.getItem('admin_token')}`
			}
		});

		if (res.status === 401) {
			localStorage.removeItem('admin_token');
			window.location.reload();
			return;
		}

		const data = await res.json();
		setOverride(data.override);
		setLoading(false);
	};

	useEffect(() => {
		fetchStatus();
	}, []);

	const updateOverride = async (value: OverrideValue) => {
		setOverride(value);
	};

	const saveOverride = async () => {
		setLoading(true);

		await fetch('/api/admin/override', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${localStorage.getItem('admin_token')}`
			},
			body: JSON.stringify({ value: override })
		});

		await fetchStatus();
		setLoading(false);
	};

	if (loading) return <Box p={4}>Loading...</Box>;

	return (
		<Box p={4}>
			<Stack spacing={3}>
				<Typography variant="h5">Trail Control</Typography>

				{/* Status Display */}
				<Paper sx={{ p: 3 }}>
					<Stack spacing={1}>
						<Typography variant="body2">Mode: {override}</Typography>
					</Stack>
				</Paper>

				{/* Control */}
				<Paper sx={{ p: 3 }}>
					<Stack spacing={2}>
						<FormControl fullWidth>
							<InputLabel>Trail Mode</InputLabel>
							<Select
								value={override}
								label="Trail Mode"
								onChange={(e) => updateOverride(e.target.value as OverrideValue)}
								disabled={loading}>
								<MenuItem value="auto">Auto (follow scraper)</MenuItem>
								<MenuItem value="open">Force Open</MenuItem>
								<MenuItem value="closed">Force Closed</MenuItem>
							</Select>
						</FormControl>

						<Button onClick={saveOverride}>Save Override</Button>
					</Stack>
				</Paper>
			</Stack>
		</Box>
	);
}
