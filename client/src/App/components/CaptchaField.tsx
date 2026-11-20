import React, { useState } from 'react';
import { Box, Stack, TextField, Typography } from '@mui/material';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { Captcha } from './Captcha';
import { getRandomInt } from '../util/Util';

export const CAPTCHA_MESSAGE = 'Please enter the number shown';

// the code is a 4-digit number; parse as decimal so leading zeros still match
export const isCaptchaCorrect = (value: string, code: number) => parseInt(value, 10) === code;

// the code stays fixed for the life of the form; pass the server-seeded code
// (from initialData) when there is one so SSR and the client agree
export function useCaptcha(seed?: number) {
	const [code] = useState(() => seed ?? getRandomInt(1000, 9999));
	return {
		chars: code.toString(),
		verify: (value: string) => isCaptchaCorrect(value, code)
	};
}

interface CaptchaFieldProps {
	chars: string;
	fieldProps: UseFormRegisterReturn;
	error?: string;
}

export const CaptchaField: React.FC<CaptchaFieldProps> = ({ chars, fieldProps, error }) => (
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
				<Captcha chars={chars} />
			</Box>
			<TextField
				{...fieldProps}
				required
				id="captcha"
				type="number"
				label="Code"
				inputMode="numeric"
				error={!!error}
				helperText={error}
			/>
		</Stack>
	</Box>
);
