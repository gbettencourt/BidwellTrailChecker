import React, { useEffect, useRef } from 'react';
import { getRandomInt } from '../util/Util';

export function Captcha(props) {
	const containerRef = useRef();
	useEffect(() => {
		var ctx = containerRef.current.getContext('2d');
		ctx.font = 'italic 40px Arial';
		ctx.fillStyle = '#7491A8';
		let x = 0;
		[...props.chars].forEach((char) => {
			ctx.fillText(char, x, getRandomInt(30, 75));
			x += 75;
		});
	}, [props.chars]);
	return <canvas ref={containerRef} style={{ height: '75px' }}></canvas>;
}
