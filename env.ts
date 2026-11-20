import dotenv from 'dotenv';

// Load .env at import time, before any module reads process.env at the
// top level (admin-router does). ESM evaluates imports before the entry
// point's body runs, so a dotenv.config() call in index.ts would be too
// late — and ESM caches the module, so importing it from several places
// still configures dotenv a single time.
dotenv.config();
