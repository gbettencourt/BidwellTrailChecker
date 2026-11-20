import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CAPTCHA_MESSAGE, CaptchaField, isCaptchaCorrect, useCaptcha } from './CaptchaField';

const fieldProps = {
	name: 'captcha',
	onChange: async () => {},
	onBlur: async () => {},
	ref: () => {}
};

describe('CaptchaField', () => {
	it('accepts the matching number and rejects anything else', () => {
		expect(isCaptchaCorrect('1234', 1234)).toBe(true);
		expect(isCaptchaCorrect('1235', 1234)).toBe(false);
		expect(isCaptchaCorrect('', 1234)).toBe(false);
		expect(isCaptchaCorrect('abcd', 1234)).toBe(false);
	});

	it('matches numbers with leading zeros', () => {
		expect(isCaptchaCorrect('01234', 1234)).toBe(true);
	});

	it('uses the seeded code and verifies against it', () => {
		const Probe: React.FC = () => {
			const captcha = useCaptcha(1234);
			return (
				<div>
					<span data-testid="chars">{captcha.chars}</span>
					<span data-testid="verified">{String(captcha.verify('1234'))}</span>
					<span data-testid="rejected">{String(captcha.verify('9999'))}</span>
				</div>
			);
		};
		render(<Probe />);
		expect(screen.getByTestId('chars')).toHaveTextContent('1234');
		expect(screen.getByTestId('verified')).toHaveTextContent('true');
		expect(screen.getByTestId('rejected')).toHaveTextContent('false');
	});

	it('renders the code image, the input, and the error message', () => {
		render(<CaptchaField chars="1234" fieldProps={fieldProps} error={CAPTCHA_MESSAGE} />);
		expect(screen.getByLabelText('verification code')).toBeTruthy();
		expect(screen.getByRole('spinbutton')).toBeTruthy();
		expect(screen.getByText(CAPTCHA_MESSAGE)).toBeTruthy();
	});
});
