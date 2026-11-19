import { config } from 'dotenv';
import { join } from 'path';
// repo-root .env for local dev; no-op in Docker
config({ path: join(__dirname, '..', '..', '..', '.env') });
