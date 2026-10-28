import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link as RouterLink } from 'react-router-dom';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';

type FormValues = {
	email: string;
};

export const Unsubscribe: React.FC = () => {
	const [unsubscribed, setUnsubscribed] = useState(false);
	const [regError, setRegError] = useState('');

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting }
	} = useForm<FormValues>({
		defaultValues: { email: '' }
	});

	const onSubmit = async (data: FormValues) => {
		setRegError('');
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
			) : (
				<>
					<Typography variant="h5" component="h1">
						Unsubscribe
					</Typography>
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
