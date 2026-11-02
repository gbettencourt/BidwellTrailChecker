import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import './index.css';
import { App } from './App/App';
import type { AppInitialData } from './App/app-data';

const container = document.getElementById('root');
if (!container) throw new Error('Failed to find the root element');
const initialDataElement = document.getElementById('app-initial-data');
const initialDataText = initialDataElement?.textContent?.trim();
const initialData =
	initialDataText && initialDataText !== '<!-- APP_INITIAL_DATA -->' ? (JSON.parse(initialDataText) as AppInitialData) : undefined;
const app = (
	<React.StrictMode>
		<App initialData={initialData} />
	</React.StrictMode>
);

if (initialData) hydrateRoot(container, app);
else createRoot(container).render(app);
