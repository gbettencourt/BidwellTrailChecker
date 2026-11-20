import React, { useState } from 'react';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import { Alert, Box, Button, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { useForm } from 'react-hook-form';
import { CAPTCHA_MESSAGE, CaptchaField, useCaptcha } from '../components/CaptchaField';
import { TrailStatusBanner } from '../components/TrailStatusBanner';
import { useTrailStatus } from '../hooks/useTrailStatus';
import { EMAIL_PATTERN } from '../util/Util';

type ReportType = 'status' | 'issue';

interface FormValues {
	type: ReportType;
	observedStatus: 'open' | 'closed';
	location: string;
	observedAt: string;
	details?: string;
	email: string;
	captcha: string;
}

export const TrailReportPage: React.FC = () => {
	const [submitted, setSubmitted] = useState(false);
	const [submitError, setSubmitError] = useState('');
	// what the site currently shows, so a reporter can compare it with the signs
	const { status, retry: fetchStatus } = useTrailStatus();
	const captcha = useCaptcha();

	const {
		register,
		handleSubmit,
		watch,
		setError,
		clearErrors,
		formState: { errors, isSubmitting }
	} = useForm<FormValues>({
		defaultValues: {
			type: 'status',
			observedStatus: 'open',
			location: '',
			observedAt: '',
			details: '',
			email: '',
			captcha: ''
		}
	});

	const reportType = watch('type');

	const onSubmit = async (data: FormValues) => {
		setSubmitError('');
		if (!captcha.verify(data.captcha)) {
			setError('captcha', { type: 'manual', message: CAPTCHA_MESSAGE });
			return;
		}
		clearErrors('captcha');

		try {
			const response = await fetch('/api/trail-report', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data)
			});
			const result = await response.json();
			if (!response.ok || !result.success) {
				throw new Error(result.error || 'Unable to send your report.');
			}
			setSubmitted(true);
		} catch (error) {
			setSubmitError(error instanceof Error ? error.message : 'An unexpected error occurred.');
		}
	};

	if (submitted) {
		return (
			<Paper sx={{ p: { xs: 3, sm: 4 } }}>
				<Stack spacing={1.5} sx={{ alignItems: 'center', textAlign: 'center', py: 2 }}>
					<CheckCircleRounded color="primary" sx={{ fontSize: 56 }} />
					<Typography variant="h5">Thanks for the report</Typography>
					<Typography color="text.secondary">Your information has been sent to the trail checker administrator.</Typography>
					<Button href="/" sx={{ mt: 1 }}>
						Back to trail status
					</Button>
				</Stack>
			</Paper>
		);
	}

	return (
		<Paper sx={{ p: { xs: 3, sm: 4 } }}>
			<Stack spacing={2.5}>
				<Box>
					<Typography variant="h5" component="h1">
						Report a trail status or issue
					</Typography>
					<Typography color="text.secondary" sx={{ mt: 0.5 }}>
						Let us know if trailhead signs disagree with the city status page, or report a problem such as a downed tree.
					</Typography>
				</Box>

				<TrailStatusBanner status={status} onRetry={fetchStatus} />

				<Alert severity="info">
					Reports are sent to the site administrator for review. They do not automatically change the status shown here.
				</Alert>

				<Box component="form" noValidate onSubmit={handleSubmit(onSubmit)}>
					<Stack spacing={2.5}>
						{submitError && <Alert severity="error">{submitError}</Alert>}

						<TextField select label="What are you reporting?" {...register('type', { required: true })}>
							<MenuItem value="status">Trail status differs from the signs</MenuItem>
							<MenuItem value="issue">A trail issue</MenuItem>
						</TextField>

						{reportType === 'status' && (
							<TextField select label="What do the signs say?" {...register('observedStatus', { required: true })}>
								<MenuItem value="open">Open</MenuItem>
								<MenuItem value="closed">Closed</MenuItem>
							</TextField>
						)}

						<TextField
							required
							label="Trail or location"
							placeholder="For example, the trailhead or nearest cross street"
							error={!!errors.location}
							helperText={errors.location?.message}
							// keep these limits in sync with the /api/trail-report validators in
							// index.ts — the client mirrors them so bad input fails fast, but the
							// server is the authority
							{...register('location', {
								required: 'Please enter a trail or location',
								minLength: { value: 2, message: 'Please enter a little more detail' },
								maxLength: { value: 120, message: 'Please keep the location under 120 characters' }
							})}
						/>

						<TextField
							label="When did you observe this?"
							type="datetime-local"
							slotProps={{ inputLabel: { shrink: true } }}
							{...register('observedAt')}
						/>

						{reportType === 'issue' && (
							<TextField
								required
								label="Describe the issue"
								multiline
								minRows={3}
								error={!!errors.details}
								helperText={errors.details?.message ?? 'Please do not include sensitive personal information.'}
								{...register('details', {
									required: 'Please describe the issue',
									minLength: { value: 5, message: 'Please add a little more detail' },
									maxLength: { value: 2000, message: 'Please keep your description under 2000 characters' }
								})}
							/>
						)}

						<TextField
							label="Your email (optional)"
							type="email"
							autoComplete="email"
							helperText={
								errors.email?.message ?? 'Include this if you are comfortable being contacted for more information.'
							}
							error={!!errors.email}
							{...register('email', {
								pattern: { value: EMAIL_PATTERN, message: 'Please enter a valid email address' }
							})}
						/>

						<CaptchaField
							chars={captcha.chars}
							fieldProps={register('captcha', { required: CAPTCHA_MESSAGE })}
							error={errors.captcha?.message}
						/>

						<Button variant="contained" size="large" type="submit" disabled={isSubmitting}>
							{isSubmitting ? 'Sending report…' : 'Send report'}
						</Button>
					</Stack>
				</Box>
			</Stack>
		</Paper>
	);
};
