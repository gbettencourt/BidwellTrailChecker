import React, { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { Captcha } from '../components/Captcha';
import { getRandomInt } from '../util/Util';

type FormValues = {
	email: string;
	captcha: string;
};

export const Unsubscribe: React.FC = () => {
	const [unsubscribed, setUnsubscribed] = useState(false);
	const [regError, setRegError] = useState('');

	// signed link from an email: /unsubscribe?u=<user id>&t=<token>
	const [searchParams] = useSearchParams();
	const linkUser = searchParams.get('u');
	const linkToken = searchParams.get('t');
	const [linkError, setLinkError] = useState('');
	const [linkSubmitting, setLinkSubmitting] = useState(false);
	const captchaCode = useRef(getRandomInt(1000, 9999));

	const unsubscribeFromLink = async () => {
		setLinkSubmitting(true);
		try {
			const res = await fetch('/api/unsubscribe', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ u: linkUser, t: linkToken })
			});
			const result = await res.json();
			if (result.success) {
				setUnsubscribed(true);
			} else {
				setLinkError(result.error ?? 'This unsubscribe link is invalid.');
			}
		} catch (err) {
			console.error('Unsubscribe failed:', err);
			setLinkError('An unexpected error occurred.');
		} finally {
			setLinkSubmitting(false);
		}
	};

	const {
		register,
		handleSubmit,
		setError,
		clearErrors,
		formState: { errors, isSubmitting }
	} = useForm<FormValues>({
		defaultValues: { email: '', captcha: '' }
	});

	const onSubmit = async (data: FormValues) => {
		setRegError('');
		if (parseInt(data.captcha) !== captchaCode.current) {
			setError('captcha', { type: 'manual', message: 'Please enter the number shown' });
			return;
		}
		clearErrors('captcha');

		try {
			const res = await fetch('/api/rmemail', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: data.email })
			});

			const result = await res.json();

			if (result.success) {
				setUnsubscribed(true);
			} else {
				setRegError(result.error);
			}
		} catch (err) {
			console.error('Unsubscribe failed:', err);
			setRegError('An unexpected error occurred');
		}
	};

	return (
		<Paper sx={{ p: { xs: 3, sm: 4 } }}>
			{unsubscribed ? (
				<Stack spacing={1.5} sx={{ alignItems: 'center', textAlign: 'center', py: 2 }}>
					<CheckCircleRounded color="primary" sx={{ fontSize: 56 }} />
					<Typography variant="h5">You've been unsubscribed</Typography>
					<Typography color="text.secondary">You won't get any more trail status updates.</Typography>
					<Button component={RouterLink} to="/" sx={{ mt: 1 }}>
						Back to trail status
					</Button>
				</Stack>
			) : linkUser && linkToken && !linkError ? (
				// arrived from the unsubscribe link in an email: confirm first, since mail scanners open links on their own
				<Stack spacing={2.5}>
					<Box>
						<Typography variant="h5" component="h1">
							Unsubscribe from trail alerts?
						</Typography>
						<Typography color="text.secondary" sx={{ mt: 0.5 }}>
							You'll stop getting trail status emails and texts. You can sign up again any time.
						</Typography>
					</Box>
					<Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={1.5} sx={{ justifyContent: 'flex-end' }}>
						<Button variant="outlined" component={RouterLink} to="/">
							Keep my alerts
						</Button>
						<Button variant="contained" color="error" onClick={unsubscribeFromLink} disabled={linkSubmitting}>
							Unsubscribe
						</Button>
					</Stack>
				</Stack>
			) : (
				<>
					<Typography variant="h5" component="h1">
						Unsubscribe
					</Typography>
					{linkError && (
						<Alert severity="warning" sx={{ mt: 2 }}>
							{linkError} You can still unsubscribe with your email address below.
						</Alert>
					)}
					<Typography color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>
						Enter the email you signed up with to stop receiving trail status emails and texts.
					</Typography>
					<Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
						<Stack spacing={2.5}>
							{regError && <Alert severity="error">{regError}</Alert>}
							<TextField
								required
								id="email"
								label="Email address"
								type="email"
								autoComplete="email"
								error={!!errors.email}
								helperText={errors.email ? 'Please enter a valid email address' : ''}
								{...register('email', {
									required: true,
									pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
								})}
							/>
							<Box>
								<Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
									Enter the number below to show you're human
								</Typography>
								<Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'flex-start' } }}>
									<Box
										sx={{
											border: 1,
											borderColor: 'divider',
											borderRadius: '10px',
											bgcolor: 'action.hover',
											color: 'primary.main',
											px: 1,
											display: 'flex',
											justifyContent: 'center',
											flexShrink: 0
										}}>
										<Captcha chars={captchaCode.current.toString()} />
									</Box>
									<TextField
										{...register('captcha', { required: 'Please enter the number shown' })}
										required
										id="captcha"
										type="number"
										label="Code"
										inputMode="numeric"
										error={!!errors.captcha}
										helperText={errors.captcha?.message}
									/>
								</Stack>
							</Box>
							<Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={1.5} sx={{ justifyContent: 'flex-end' }}>
								<Button variant="outlined" component={RouterLink} to="/">
									Cancel
								</Button>
								<Button type="submit" variant="contained" color="error" disabled={isSubmitting}>
									Unsubscribe
								</Button>
							</Stack>
						</Stack>
					</Box>
				</>
			)}
		</Paper>
	);
};
