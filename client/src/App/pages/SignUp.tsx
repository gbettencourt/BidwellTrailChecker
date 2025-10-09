import React, { useEffect, useRef, useState } from 'react';
import BikeIcon from '@mui/icons-material/DirectionsBike';
import { Avatar, Box, Button, Container, CssBaseline, FormControlLabel, Grid, Link, Switch, TextField, Typography } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { useForm } from 'react-hook-form';
import { Captcha } from '../components/Captcha';
import { cleanPhoneNumber, formatPhoneNumber, getRandomInt } from '../util/Util';

interface FormValues {
	email: string;
	phone: string;
	captcha: string;
	sendSms: boolean;
}

const theme = createTheme();

export const SignUp: React.FC = () => {
	const [isRegistered, setIsRegistered] = useState(false);
	const [regError, setRegError] = useState('');
	const [trailStatus, setTrailStatus] = useState('');
	const [lastCheckTime, setLastCheckTime] = useState('');
	const captchaCode = useRef(getRandomInt(1000, 9999));

	const {
		register,
		handleSubmit,
		watch,
		setError,
		clearErrors,
		formState: { errors }
	} = useForm<FormValues>({
		defaultValues: {
			email: '',
			phone: '',
			captcha: '',
			sendSms: false
		}
	});

	const sendSms = watch('sendSms');
	const phoneValue = watch('phone');

	useEffect(() => {
		const fetchTrailStatus = async () => {
			try {
				const res = await fetch('/api/trailstatus');
				const status = await res.json();
				setTrailStatus(status.trailStatus);
				setLastCheckTime(status.lastCheck);
			} catch (error) {
				console.error('Failed to fetch trail status:', error);
			}
		};

		fetchTrailStatus();
	}, []);

	const verifyCaptcha = (value: string) => parseInt(value) === captchaCode.current;

	const onSubmit = async (data: FormValues) => {
		if (!verifyCaptcha(data.captcha)) {
			setError('captcha', { type: 'manual', message: 'Please enter the number below' });
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
		<ThemeProvider theme={theme}>
			<Container component="main" maxWidth="xs">
				<CssBaseline />
				<Box sx={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
					<Avatar sx={{ m: 1, bgcolor: 'primary.main' }}>
						<BikeIcon />
					</Avatar>

					{regError && (
						<Typography component="h1" variant="h5">
							Unable to register {regError}
						</Typography>
					)}

					{isRegistered ? (
						<Typography component="h1" variant="h5">
							Your registration was successful!
						</Typography>
					) : (
						<>
							<Box mt={2} />
							<Typography component="h1" variant="h5">
								Current trail status: <span style={{ color: trailStatus === 'Open' ? 'green' : 'red' }}>{trailStatus}</span>
							</Typography>
							<Typography component="h6" variant="h6">
								Last checked: <span>{new Date(lastCheckTime).toLocaleString()}</span>
							</Typography>
							<Box mt={5} />
							<Typography component="h1" variant="h5">
								Enter your email address to get notifications when the Upper Bidwell Park trail status changes:
							</Typography>

							<Box component="form" noValidate sx={{ mt: 3 }} onSubmit={handleSubmit(onSubmit)}>
								<Grid container spacing={2}>
									<Grid item xs={12}>
										<TextField
											{...register('email', {
												required: 'Please enter a valid email',
												pattern: {
													value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
													message: 'Please enter a valid email'
												}
											})}
											variant="outlined"
											required
											fullWidth
											id="email"
											type="email"
											label="Email Address"
											autoComplete="email"
											error={!!errors.email}
											helperText={errors.email?.message}
										/>
									</Grid>

									<Grid item xs={12}>
										<FormControlLabel
											control={<Switch {...register('sendSms')} checked={sendSms} />}
											label="Receive Text Messages"
										/>
									</Grid>

									{sendSms && (
										<Grid item xs={12}>
											<TextField
												{...register('phone')}
												variant="outlined"
												required
												fullWidth
												id="phone"
												type="text"
												label="Phone Number"
												autoComplete="phone"
												value={phoneValue}
												onChange={(e) => {
													const formatted = formatPhoneNumber(e.target.value);
													e.target.value = formatted; // update value for RHF
												}}
												error={!!errors.phone}
												helperText={errors.phone?.message}
											/>
										</Grid>
									)}
								</Grid>

								<Grid container sx={{ mt: 2 }}>
									<Grid item xs={12}>
										<TextField
											{...register('captcha', { required: 'Please enter the number below' })}
											variant="outlined"
											required
											fullWidth
											id="captcha"
											type="number"
											label="Enter Code Below"
											error={!!errors.captcha}
											helperText={errors.captcha?.message}
										/>
									</Grid>
									<Grid item xs={12} sx={{ mt: 2 }}>
										<Captcha chars={captchaCode.current.toString()} />
									</Grid>
								</Grid>

								<Button fullWidth variant="contained" color="primary" sx={{ mt: 1, mb: 2 }} type="submit">
									Sign Up
								</Button>
							</Box>
						</>
					)}
				</Box>

				<Box mt={2}>
					<Link href="Unsubscribe">Unsubscribe</Link>
				</Box>
				<Box>
					<Link href="https://chico.ca.us/Our-Community/Parks-Recreation-and-Experience-the-Outdoors/Park-Trails/Trail-Gate--Facility-Status-and-Hours/index.html">
						Park Trail Page
					</Link>
				</Box>
			</Container>
		</ThemeProvider>
	);
};
