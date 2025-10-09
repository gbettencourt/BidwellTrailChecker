import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import BikeIcon from '@mui/icons-material/DirectionsBike';
import { Avatar, Box, Button, Container, CssBaseline, Grid, TextField, Typography } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';

type FormValues = {
	email: string;
};

export const Unsubscribe: React.FC = () => {
	const theme = createTheme();
	const [unsubscribed, setUnsubscribed] = useState(false);
	const [regError, setRegError] = useState('');

	const {
		register,
		handleSubmit,
		formState: { errors }
	} = useForm<FormValues>({
		defaultValues: { email: '' }
	});

	const onSubmit = async (data: FormValues) => {
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

	const handleCancelClick = () => {
		window.history.back();
	};

	return (
		<ThemeProvider theme={theme}>
			<Container component="main" maxWidth="xs">
				<CssBaseline />
				<Box
					sx={{
						marginTop: 8,
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center'
					}}>
					<Avatar sx={{ m: 1, bgcolor: 'primary.main' }}>
						<BikeIcon />
					</Avatar>

					{unsubscribed ? (
						<Typography component="h1" variant="h5">
							You have been unsubscribed
						</Typography>
					) : (
						<Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate sx={{ mt: 3 }}>
							<Grid container spacing={2}>
								<Grid item xs={12}>
									<TextField
										variant="outlined"
										required
										fullWidth
										id="email"
										label="Email Address"
										type="email"
										autoComplete="email"
										error={!!errors.email}
										helperText={errors.email ? 'Please enter a valid email address' : regError}
										{...register('email', {
											required: true,
											pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
										})}
									/>
								</Grid>
							</Grid>

							<Button type="submit" fullWidth variant="contained" color="primary" sx={{ mt: 3, mb: 2 }}>
								Unsubscribe
							</Button>

							<Button fullWidth variant="contained" color="primary" sx={{ mt: 1, mb: 2 }} onClick={handleCancelClick}>
								Cancel
							</Button>
						</Box>
					)}
				</Box>
				<Box mt={5}></Box>
			</Container>
		</ThemeProvider>
	);
};
