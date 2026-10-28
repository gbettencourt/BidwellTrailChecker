import React, { useEffect, useRef } from 'react';
import { getRandomInt } from '../util/Util';

interface CaptchaProps {
	chars: string;
}

const CHAR_WIDTH = 42;
const HEIGHT = 56;

export const Captcha: React.FC<CaptchaProps> = ({ chars }) => {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		const ctx = canvas?.getContext('2d');
		if (!ctx) return;

		// draw at device resolution so the digits stay crisp on high-dpi screens
		const scale = window.devicePixelRatio || 1;
		canvas.width = chars.length * CHAR_WIDTH * scale;
		canvas.height = HEIGHT * scale;
		ctx.scale(scale, scale);

		ctx.font = 'italic 600 34px Inter, Arial, sans-serif';
		// follow the surrounding text color so it reads in light and dark mode
		ctx.fillStyle = getComputedStyle(canvas).color;

		let x = 6;
		[...chars].forEach((char) => {
			ctx.fillText(char, x, getRandomInt(36, 48));
			x += CHAR_WIDTH;
		});
	}, [chars]);

	return <canvas ref={canvasRef} aria-label="verification code" style={{ width: chars.length * CHAR_WIDTH, height: HEIGHT, display: 'block' }} />;
};
