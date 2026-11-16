import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'node',
		// one worker process per test file: the server tests chdir and set
		// env vars in their setup hooks, which must not leak across files
		pool: 'forks',
		include: ['*.test.ts'],
		exclude: ['node_modules', 'dist', 'client']
	}
});
