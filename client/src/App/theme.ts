import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
	cssVariables: { colorSchemeSelector: 'media' },
	colorSchemes: {
		light: {
			palette: {
				primary: { main: '#2f6b4f' },
				secondary: { main: '#c26a2e' },
				success: { main: '#2e8b57' },
				error: { main: '#c0392b' },
				background: { default: '#f4f6f2', paper: '#ffffff' }
			}
		},
		dark: {
			palette: {
				primary: { main: '#7cc39b' },
				secondary: { main: '#e39a62' },
				success: { main: '#5cc98a' },
				error: { main: '#ef7a6d' },
				background: { default: '#0f1612', paper: '#18221c' }
			}
		}
	},
	shape: { borderRadius: 14 },
	typography: {
		fontFamily: '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
		h1: { fontWeight: 800, letterSpacing: '-0.03em' },
		h2: { fontWeight: 800, letterSpacing: '-0.02em' },
		h3: { fontWeight: 700, letterSpacing: '-0.02em' },
		h4: { fontWeight: 700, letterSpacing: '-0.01em' },
		h5: { fontWeight: 700 },
		h6: { fontWeight: 600 },
		button: { textTransform: 'none', fontWeight: 600 }
	},
	components: {
		MuiButton: {
			defaultProps: { disableElevation: true },
			styleOverrides: { root: { borderRadius: 10, paddingBlock: 10 } }
		},
		MuiPaper: {
			defaultProps: { elevation: 0 },
			styleOverrides: {
				root: ({ theme }) => ({
					border: `1px solid ${theme.vars.palette.divider}`
				})
			}
		},
		MuiAppBar: {
			styleOverrides: { root: { border: 'none' } }
		},
		MuiTextField: {
			defaultProps: { variant: 'outlined', fullWidth: true }
		}
	}
});
