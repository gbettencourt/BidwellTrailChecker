import path from 'path';
import fs from 'fs';
import type { OverrideValue } from './shared-types.js';

const DATA_FILE = path.join(process.cwd(), 'trailOverride.json');

export function readOverride(): OverrideValue {
	try {
		if (!fs.existsSync(DATA_FILE)) return 'auto';
		const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
		return data.override ?? 'auto';
	} catch {
		return 'auto';
	}
}

export function writeOverride(value: OverrideValue) {
	fs.writeFileSync(DATA_FILE, JSON.stringify({ override: value }, null, 2));
}
