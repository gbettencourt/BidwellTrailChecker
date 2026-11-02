import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
	plugins: [react()],
	ssr: {
		noExternal: true
	},
	server: {
		proxy: {
			'/api': process.env.API_URL ?? 'http://localhost:5000'
		}
	},
	build: {
		outDir: 'build'
	}
});
