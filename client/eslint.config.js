import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
	{ ignores: ['build/', 'build-ssr/'] },
	js.configs.recommended,
	...tseslint.configs.recommended,
	reactHooks.configs.flat.recommended,
	eslintConfigPrettier,
	{
		files: ['**/*.{ts,tsx}'],
		languageOptions: {
			parserOptions: { ecmaFeatures: { jsx: true } },
			globals: { ...globals.browser }
		}
	},
	{
		// data fetching in effects and date formatting in render are this
		// codebase's established patterns, and there's no React Compiler in
		// use — these three rules are written for it
		rules: {
			'react-hooks/set-state-in-effect': 'off',
			'react-hooks/purity': 'off',
			'react-hooks/incompatible-library': 'off'
		}
	}
);
