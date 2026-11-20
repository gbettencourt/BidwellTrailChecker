import { Alert, Box, Button, Divider, Paper, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography, Skeleton } from '@mui/material';
import AutoModeRounded from '@mui/icons-material/AutoModeRounded';
import LockOpenRounded from '@mui/icons-material/LockOpenRounded';
import LockRounded from '@mui/icons-material/LockRounded';
import React, { useEffect, useRef, useState } from 'react';
import type { LogEntry, OverrideValue } from '../../../../shared-types.js';

type TestEmailStatus = 'open' | 'closed';
type TestChannel = 'email' | 'sms';

type TestNotificationState = {
	sending: TestChannel | null;
	result: { channel: TestChannel; success: boolean; message: string } | null;
};

const MODE_LABELS: Record<OverrideValue, string> = {
	auto: 'Following the city trail page',
	open: 'Forced open',
	closed: 'Forced closed'
};

// admin API call with the login token attached; a 401 means the token is
// stale, so sign out and reload to the login form. Returns null after a
// 401, so callers bail out instead of reading a dead response.
async function adminFetch(input: string, init?: Omit<RequestInit, 'headers'> & { headers?: Record<string, string> }): Promise<Response | null> {
	const res = await fetch(input, {
		...init,
		headers: { ...init?.headers, Authorization: `Bearer ${localStorage.getItem('admin_token')}` }
	});
	if (res.status === 401) {
		localStorage.removeItem('admin_token');
		window.location.reload();
		return null;
	}
	return res;
}

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
	const [testEmailStatus, setTestEmailStatus] = useState<TestEmailStatus>('open');
	const [testNotification, setTestNotification] = useState<TestNotificationState>({ sending: null, result: null });
	const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
	const [logPaused, setLogPaused] = useState(false);
	const [following, setFollowing] = useState(true);
	const logCursorRef = useRef(0);
	const logContainerRef = useRef<HTMLDivElement>(null);

	const fetchStatus = async () => {
		const res = await adminFetch('/api/admin/status');
		if (!res) return;

		const data = await res.json();
		setOverride(data.override);
		setSavedOverride(data.override);
		setLoading(false);
	};

	useEffect(() => {
		fetchStatus();
	}, []);

	const fetchLogs = async () => {
		const res = await adminFetch(`/api/admin/logs?since=${logCursorRef.current}`);
		if (!res) return;

		if (!res.ok) return;

		const data = await res.json();
		if (data.entries.length > 0) {
			setLogEntries((prev) => [...prev.slice(-999), ...data.entries]);
			logCursorRef.current = data.latestId;
		}
	};

	useEffect(() => {
		fetchLogs();
		if (logPaused) return;
		const id = setInterval(fetchLogs, 2000);
		return () => clearInterval(id);
	}, [logPaused]);

	useEffect(() => {
		if (following && logContainerRef.current) {
			logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
		}
	}, [logEntries, following]);

	const onLogScroll = () => {
		const el = logContainerRef.current;
		if (!el) return;
		if (el.scrollTop + el.clientHeight < el.scrollHeight - 40) setFollowing(false);
	};

	const jumpToLatest = () => {
		setFollowing(true);
		if (logContainerRef.current) {
			logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
		}
	};

	const saveOverride = async () => {
		setSaving(true);
		setSaved(false);

		await adminFetch('/api/admin/override', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ value: override })
		});

		await fetchStatus();
		setSaving(false);
		setSaved(true);
	};

	const sendTestNotification = async (channel: TestChannel) => {
		setTestNotification({ sending: channel, result: null });

		try {
			const res = await adminFetch(`/api/admin/test-${channel}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: channel === 'email' ? JSON.stringify({ status: testEmailStatus }) : undefined
			});

			if (!res) return;

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || `Failed to send test ${channel}`);
			}

			setTestNotification({
				sending: channel,
				result: {
					channel,
					success: true,
					message: channel === 'email' ? 'Test email sent to the configured admin email address.' : 'Test SMS sent to the configured admin account phone number.'
				}
			});
		} catch (error) {
			setTestNotification({
				sending: channel,
				result: {
					channel,
					success: false,
					message: error instanceof Error ? error.message : `Failed to send test ${channel}`
				}
			});
		} finally {
			setTestNotification((state) => ({ ...state, sending: null }));
		}
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

				<Divider />

				<Stack spacing={2}>
					<Box>
						<Typography variant="h6" component="h2">
							Test email
						</Typography>
						<Typography color="text.secondary" sx={{ mt: 0.5 }}>
							Send a sample trail status email to the configured admin email address.
						</Typography>
					</Box>
					<ToggleButtonGroup
						exclusive
						fullWidth
						color="primary"
						value={testEmailStatus}
						disabled={testNotification.sending !== null}
						onChange={(_e, value: TestEmailStatus | null) => {
							if (value) {
								setTestEmailStatus(value);
								setTestNotification({ sending: null, result: null });
							}
						}}
						sx={{ '& .MuiToggleButton-root': { textTransform: 'none', fontWeight: 600 } }}>
						<ToggleButton value="open">Open</ToggleButton>
						<ToggleButton value="closed">Closed</ToggleButton>
					</ToggleButtonGroup>
					{testNotification.result?.channel === 'email' && (
						<Alert severity={testNotification.result.success ? 'success' : 'error'}>{testNotification.result.message}</Alert>
					)}
					<Button variant="outlined" size="large" onClick={() => sendTestNotification('email')} disabled={testNotification.sending !== null}>
						{testNotification.sending === 'email' ? 'Sending…' : 'Send test email'}
					</Button>
				</Stack>

				<Divider />

				<Stack spacing={2}>
					<Box>
						<Typography variant="h6" component="h2">
							Test SMS
						</Typography>
						<Typography color="text.secondary" sx={{ mt: 0.5 }}>
							Send a sample text message to the phone number on the subscriber account matching the configured admin email address.
						</Typography>
					</Box>
					{testNotification.result?.channel === 'sms' && (
						<Alert severity={testNotification.result.success ? 'success' : 'error'}>{testNotification.result.message}</Alert>
					)}
					<Button variant="outlined" size="large" onClick={() => sendTestNotification('sms')} disabled={testNotification.sending !== null}>
						{testNotification.sending === 'sms' ? 'Sending…' : 'Send test SMS'}
					</Button>
				</Stack>

				<Divider />

				<Stack spacing={2}>
					<Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
						<Box>
							<Typography variant="h6" component="h2">
								Server logs
							</Typography>
							<Typography color="text.secondary" sx={{ mt: 0.5 }}>
								Live tail of app events — status checks, notifications, signups. {logPaused ? 'Paused.' : 'Updates every 2 seconds.'}
							</Typography>
						</Box>
						<Button variant="outlined" size="small" onClick={() => setLogPaused(!logPaused)} sx={{ flexShrink: 0 }}>
							{logPaused ? 'Resume' : 'Pause'}
						</Button>
					</Box>
					<Box
						ref={logContainerRef}
						onScroll={onLogScroll}
						sx={{
							maxHeight: 400,
							overflowY: 'auto',
							bgcolor: 'grey.900',
							color: 'grey.100',
							borderRadius: 1,
							p: 1.5,
							fontFamily: 'monospace',
							fontSize: '0.8rem',
							lineHeight: 1.6,
							whiteSpace: 'pre-wrap',
							wordBreak: 'break-word'
						}}>
						{logEntries.length === 0 ? (
							<Typography sx={{ color: 'grey.500', fontFamily: 'inherit', fontSize: 'inherit' }}>
								No log entries yet — entries appear as the server logs events.
							</Typography>
						) : (
							logEntries.map((entry) => (
								<Box
									key={entry.id}
									sx={{ color: entry.level === 'error' ? 'error.light' : entry.level === 'warn' ? 'warning.light' : 'inherit' }}>
									{new Date(entry.ts).toLocaleTimeString()} {entry.message}
								</Box>
							))
						)}
					</Box>
					{!following && (
						<Button variant="outlined" size="small" onClick={jumpToLatest} sx={{ alignSelf: 'flex-start' }}>
							Jump to latest
						</Button>
					)}
				</Stack>
			</Stack>
		</Paper>
	);
}
