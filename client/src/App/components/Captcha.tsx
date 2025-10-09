import React, { useEffect, useRef } from 'react';
import { getRandomInt } from '../util/Util';

interface CaptchaProps {
	chars: string;
}

export const Captcha: React.FC<CaptchaProps> = ({ chars }) => {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);

	useEffect(() => {
		if (canvasRef.current) {
			const ctx = canvasRef.current.getContext('2d');
			if (ctx) {
				ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
				ctx.font = 'italic 40px Arial';
				ctx.fillStyle = '#7491A8';

				let x = 0;
				[...chars].forEach((char) => {
					ctx.fillText(char, x, getRandomInt(30, 75));
					x += 75;
				});
			}
		}
	}, [chars]);

	return <canvas ref={canvasRef} width={chars.length * 75} height={75} style={{ height: '75px' }} />;
};
