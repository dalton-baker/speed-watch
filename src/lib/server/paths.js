import { env } from '$env/dynamic/private';
import path from 'node:path';

export const DATA_DIR = env.DATA_DIR || '/data';
export const DB_PATH = env.DB_PATH || path.join(DATA_DIR, 'speedtest.db');
export const CONFIG_PATH = env.CONFIG_PATH || path.join(DATA_DIR, 'config.json');
