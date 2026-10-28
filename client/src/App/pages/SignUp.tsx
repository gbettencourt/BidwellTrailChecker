import React, { useEffect, useRef, useState } from 'react';
import MarkEmailReadRounded from '@mui/icons-material/MarkEmailReadRounded';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import { Alert, Box, Button, Collapse, FormControlLabel, Link, Paper, Stack, Switch, TextField, Typography } from '@mui/material';
import { useForm } from 'react-hook-form';
import { Captcha } from '../components/Captcha';
import { StatusCard } from '../components/StatusCard';
import { cleanPhoneNumber, formatPhoneNumber, getRandomInt, TRAIL_PAGE_URL } from '../util/Util';

interface FormValues {
	email: string;
	phone: string;
	captcha: string;
	sendSms: boolean;
}

export const SignUp: React.FC = () => {
	const [isRegistered, setIsRegistered] = useState(false);
	const [regError, setRegError] = useState('');
	const [trailStatus, setTrailStatus] = useState('');
	const [lastCheckTime, setLastCheckTime] = useState('');
	const [statusLoading, setStatusLoading] = useState(true);
	const captchaCode = useRef(getRandomInt(1000, 9999));

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
		const fetchTrailStatus = async () => {
			try {
				const res = await fetch('/api/trailstatus');
				const status = await res.json();
				setTrailStatus(status.trailStatus);
				setLastCheckTime(status.lastCheck);
			} catch (error) {
				console.error('Failed to fetch trail status:', error);
			} finally {
				setStatusLoading(false);
			}
		};

		fetchTrailStatus();
	}, []);

	const verifyCaptcha = (value: string) => parseInt(value) === captchaCode.current;

	const onSubmit = async (data: FormValues) => {
		setRegError('');

		if (!verifyCaptcha(data.captcha)) {
			setError('captcha', { type: 'manual', message: 'Please enter the number shown' });
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
			<StatusCard status={trailStatus} lastCheck={lastCheckTime} loading={statusLoading} />

			<Paper sx={{ p: { xs: 3, sm: 4 } }}>
				{isRegistered ? (
					<Stack spacing={1.5} sx={{ alignItems: 'center', textAlign: 'center', py: 2 }}>
						<MarkEmailReadRounded color="primary" sx={{ fontSize: 56 }} />
						<Typography variant="h5">You're signed up!</Typography>
						<Typography color="text.secondary">
							We'll let you know as soon as the trail status changes. Check your inbox for a confirmation email.
						</Typography>
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
											value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
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

								<Button variant="contained" size="large" type="submit" disabled={isSubmitting}>
									{isSubmitting ? 'Signing up…' : 'Sign up for alerts'}
								</Button>
							</Stack>
						</Box>
					</>
				)}
			</Paper>

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
