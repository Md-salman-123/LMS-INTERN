/**
 * Load .env before any other imports.
 * Must be imported first in server.js so JWT_SECRET etc. are set before auth/routes load.
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try multiple locations so it works whether run from backend/ or project root
const candidates = [
  resolve(__dirname, '../.env'),           // backend/.env (when run from backend/)
  resolve(process.cwd(), '.env'),          // cwd/.env
  resolve(process.cwd(), 'backend/.env'), // project root run
];

let loaded = false;
for (const envPath of candidates) {
  if (existsSync(envPath)) {
    const result = dotenv.config({ path: envPath });
    if (!result.error) {
      loaded = true;
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[loadEnv] Loaded .env from ${envPath}`);
      }
      break;
    }
  }
}

if (!loaded && process.env.NODE_ENV !== 'production') {
  dotenv.config(); // last resort: load from cwd (no path)
}
