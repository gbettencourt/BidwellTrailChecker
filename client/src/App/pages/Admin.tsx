import { Alert, Box, Button, Paper, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography, Skeleton } from '@mui/material';
import AutoModeRounded from '@mui/icons-material/AutoModeRounded';
import LockOpenRounded from '@mui/icons-material/LockOpenRounded';
import LockRounded from '@mui/icons-material/LockRounded';
import React, { useEffect, useState } from 'react';

type OverrideValue = 'open' | 'closed' | 'auto';

const MODE_LABELS: Record<OverrideValue, string> = {
	auto: 'Following the city trail page',
	open: 'Forced open',
	closed: 'Forced closed'
};

export function AdminPage() {
	const [password, setPassword] = useState('');
	const [loginError, setLoginError] = useState('');
	const [token, setToken] = useState(localStorage.getItem('admin_token'));

	const login = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoginError('');
		const res = await fetch('/api/admin/login', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ password })
		});

		if (!res.ok) {
			setLoginError(res.status === 401 ? 'Incorrect password' : 'Login failed, please try again');
			return;
		}

		const data = await res.json();
		localStorage.setItem('admin_token', data.token);
		setToken(data.token);
	};

	if (!token) {
		return (
			<Paper sx={{ p: { xs: 3, sm: 4 } }}>
				<Box component="form" onSubmit={login}>
					<Stack spacing={2.5}>
						<Box>
							<Typography variant="h5" component="h1">
								Admin sign in
							</Typography>
							<Typography color="text.secondary" sx={{ mt: 0.5 }}>
								Manage the trail status override.
							</Typography>
						</Box>
						{loginError && <Alert severity="error">{loginError}</Alert>}
						<TextField
							type="password"
							label="Password"
							autoComplete="current-password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
						/>
						<Button variant="contained" size="large" type="submit">
							Sign in
						</Button>
					</Stack>
				</Box>
			</Paper>
		);
	}

	return <AdminControls />;
}

function AdminControls() {
	const [savedOverride, setSavedOverride] = useState<OverrideValue>('auto');
	const [override, setOverride] = useState<OverrideValue>('auto');
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);

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
		setSavedOverride(data.override);
		setLoading(false);
	};

	useEffect(() => {
		fetchStatus();
	}, []);

	const saveOverride = async () => {
		setSaving(true);
		setSaved(false);

		await fetch('/api/admin/override', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${localStorage.getItem('admin_token')}`
			},
			body: JSON.stringify({ value: override })
		});

		await fetchStatus();
		setSaving(false);
		setSaved(true);
	};

	return (
		<Paper sx={{ p: { xs: 3, sm: 4 } }}>
			<Stack spacing={3}>
				<Box>
					<Typography variant="h5" component="h1">
						Trail control
					</Typography>
					<Typography color="text.secondary" sx={{ mt: 0.5 }}>
						Current mode: {loading ? <Skeleton sx={{ display: 'inline-block' }} width={160} /> : <strong>{MODE_LABELS[savedOverride]}</strong>}
					</Typography>
				</Box>

				<ToggleButtonGroup
					exclusive
					fullWidth
					color="primary"
					value={override}
					disabled={loading || saving}
					onChange={(_e, value: OverrideValue | null) => {
						if (value) {
							setOverride(value);
							setSaved(false);
						}
					}}
					sx={{ '& .MuiToggleButton-root': { flexDirection: 'column', gap: 0.5, py: 1.5, textTransform: 'none', fontWeight: 600 } }}>
					<ToggleButton value="auto">
						<AutoModeRounded />
						Auto
					</ToggleButton>
					<ToggleButton value="open">
						<LockOpenRounded />
						Force open
					</ToggleButton>
					<ToggleButton value="closed">
						<LockRounded />
						Force closed
					</ToggleButton>
				</ToggleButtonGroup>

				{override !== 'auto' && override !== savedOverride && (
					<Alert severity="warning">Saving will immediately notify every subscriber that the trail is {override}.</Alert>
				)}
				{saved && <Alert severity="success">Override saved.</Alert>}

				<Button variant="contained" size="large" onClick={saveOverride} disabled={loading || saving || override === savedOverride}>
					{saving ? 'Saving…' : 'Save override'}
				</Button>
			</Stack>
		</Paper>
	);
}
