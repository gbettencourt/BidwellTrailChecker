import React, { useEffect, useState } from 'react';
import MarkEmailReadRounded from '@mui/icons-material/MarkEmailReadRounded';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import { Alert, Box, Button, Collapse, FormControlLabel, Link, Paper, Stack, Switch, TextField, Typography } from '@mui/material';
import { useForm } from 'react-hook-form';
import { Link as RouterLink } from 'react-router-dom';
import { CAPTCHA_MESSAGE, CaptchaField, useCaptcha } from '../components/CaptchaField';
import { StatusCard } from '../components/StatusCard';
import { useTrailStatus } from '../hooks/useTrailStatus';
import { apiGet } from '../util/api';
import { cleanPhoneNumber, EMAIL_PATTERN, extractEmailAddress, formatPhoneNumber, TRAIL_PAGE_URL } from '../util/Util';
import type { StatusEvent, StatusHistory } from '../../../../shared-types.js';
import type { AppInitialData } from '../app-data';

interface FormValues {
	email: string;
	phone: string;
	captcha: string;
	sendSms: boolean;
}

export const SignUp: React.FC<{ initialData?: AppInitialData }> = ({ initialData }) => {
	const [isRegistered, setIsRegistered] = useState(false);
	const [regError, setRegError] = useState('');
	const { status: trailStatus, lastCheck: lastCheckTime, loading: statusLoading } = useTrailStatus(initialData);
	const [statusSince, setStatusSince] = useState<StatusEvent | null>(initialData?.statusSince ?? null);
	const [now, setNow] = useState(initialData?.renderedAt ?? Date.now());
	const captcha = useCaptcha(initialData?.captchaCode);

	const {
		register,
		handleSubmit,
		watch,
		setError,
		clearErrors,
		setValue,
		formState: { errors, isSubmitting }
	} = useForm<FormValues>({
		defaultValues: {
			email: '',
			phone: '',
			captcha: '',
			sendSms: false
		}
	});

	const sendSms = watch('sendSms');

	useEffect(() => {
		setNow(Date.now());

		apiGet<StatusHistory>('/api/statushistory')
			.then((history) => setStatusSince(history.current))
			.catch((error) => console.error('Failed to fetch status history:', error));
	}, []);

	const onSubmit = async (data: FormValues) => {
		setRegError('');

		if (!captcha.verify(data.captcha)) {
			setError('captcha', { type: 'manual', message: CAPTCHA_MESSAGE });
			return;
		} else {
			clearErrors('captcha');
		}

		if (sendSms) {
			const cleanPhone = cleanPhoneNumber(data.phone);
			if (!data.phone || cleanPhone.length !== 10) {
				setError('phone', { type: 'manual', message: 'Please enter a valid phone number' });
				return;
			} else {
				clearErrors('phone');
			}
		}

		const postData = {
			email: data.email,
			phone: data.sendSms ? cleanPhoneNumber(data.phone) : ''
		};

		try {
			const res = await fetch('/api/registeremail', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(postData)
			});

			const result = await res.json();

			if (result.success) {
				setIsRegistered(true);
			} else {
				setRegError(result.error);
			}
		} catch (error) {
			setRegError('An unexpected error occurred');
			console.error(error);
		}
	};

	return (
		<Stack spacing={3}>
			<StatusCard
				status={trailStatus}
				lastCheck={lastCheckTime}
				loading={statusLoading}
				since={statusSince?.status === trailStatus ? statusSince.at : undefined}
				now={now}
			/>

			<Paper sx={{ p: { xs: 3, sm: 4 } }}>
				{isRegistered ? (
					<Stack spacing={1.5} sx={{ alignItems: 'center', textAlign: 'center', py: 2 }}>
						<MarkEmailReadRounded color="primary" sx={{ fontSize: 56 }} />
						<Typography variant="h5">You're signed up!</Typography>
						<Typography color="text.secondary">
							We'll let you know as soon as the trail status changes. Check your inbox for a confirmation email.
						</Typography>
						{initialData?.notificationFromEmail && (
							<Typography color="text.secondary">
								Our emails come from{' '}
								<Link href={`mailto:${extractEmailAddress(initialData.notificationFromEmail)}`}>
									{initialData.notificationFromEmail}
								</Link>{' '}
								— if the confirmation lands in spam, add that address to your contacts so you don't miss trail alerts.
							</Typography>
						)}
					</Stack>
				) : (
					<>
						<Typography variant="h5" component="h1">
							Get notified
						</Typography>
						<Typography color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>
							We'll email you, or text you if you like, whenever the Upper Bidwell Park trails open or close.
						</Typography>

						<Box component="form" noValidate onSubmit={handleSubmit(onSubmit)}>
							<Stack spacing={2.5}>
								{regError && <Alert severity="error">Unable to register: {regError}</Alert>}

								<TextField
									{...register('email', {
										required: 'Please enter a valid email',
										pattern: {
											value: EMAIL_PATTERN,
											message: 'Please enter a valid email'
										}
									})}
									required
									id="email"
									type="email"
									label="Email address"
									autoComplete="email"
									error={!!errors.email}
									helperText={errors.email?.message}
								/>

								<Box>
									<FormControlLabel
										control={<Switch {...register('sendSms')} checked={sendSms} />}
										label="Also send me text messages"
									/>
									<Collapse in={sendSms} unmountOnExit>
										<TextField
											{...register('phone')}
											required
											id="phone"
											type="tel"
											label="Mobile number"
											autoComplete="tel"
											sx={{ mt: 1.5 }}
											onChange={(e) => {
												const formatted = formatPhoneNumber(e.target.value);
												setValue('phone', formatted, { shouldValidate: true });
											}}
											error={!!errors.phone}
											helperText={errors.phone?.message}
										/>
									</Collapse>
								</Box>

								<CaptchaField
									chars={captcha.chars}
									fieldProps={register('captcha', { required: CAPTCHA_MESSAGE })}
									error={errors.captcha?.message}
								/>

								<Button variant="contained" size="large" type="submit" disabled={isSubmitting}>
									{isSubmitting ? 'Signing up…' : 'Sign up for alerts'}
								</Button>
							</Stack>
						</Box>
					</>
				)}
			</Paper>

			<Typography sx={{ px: { xs: 0.5, sm: 1 } }}>
				Bidwell Trail Checker shows whether the trails in Upper Bidwell Park are open or closed, for mountain bikers in Chico,
				California. The status comes from the City of Chico and is checked every 15 minutes — sign up for an email or text alert and
				you&apos;ll know the moment it changes. The{' '}
				<Link component={RouterLink} to="/map">
					map
				</Link>{' '}
				shows the 23 bike-legal trails, including the ones that stay open when the rest of the park is closed, and the{' '}
				<Link component={RouterLink} to="/history">
					history page
				</Link>{' '}
				records every opening and closure back to January 2020.
			</Typography>

			<Stack direction="row" spacing={1.25} sx={{ px: { xs: 0.5, sm: 1 }, color: 'text.secondary' }}>
				<InfoOutlined fontSize="small" sx={{ mt: '2px' }} />
				<Typography variant="body2">
					Trail status is taken from the{' '}
					<Link href={TRAIL_PAGE_URL} target="_blank" rel="noopener" color="inherit">
						City of Chico's trail status page
					</Link>{' '}
					and may not always be up to date. Always check the signs at the trailhead for the latest status before you ride.
				</Typography>
			</Stack>
		</Stack>
	);
};
