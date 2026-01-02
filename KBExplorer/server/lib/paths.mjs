import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SERVER_DIR = path.resolve(__dirname, '..');

export const CLIENT_DIR = path.resolve(SERVER_DIR, '../client');
export const PACKS_DIR = path.resolve(SERVER_DIR, '../../config/Packs');

