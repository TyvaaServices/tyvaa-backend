import dotenv from 'dotenv'
dotenv.config();
import { initializeApp, cert } from 'firebase-admin/app';
import router from './routes/notificationRouter.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export default async function (fastify, opts) {
    const base64Key = process.env.FIREBASE_KEY_BASE64;
    if (!base64Key) {
        fastify.log.error('FIREBASE_KEY_BASE64 environment variable is not set. Skipping Firebase initialization.');
    } else {
        const jsonString = Buffer.from(base64Key, 'base64').toString('utf-8');
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const keyPath = path.join(__dirname, 'temp_service_account.json');
        if (!fs.existsSync(keyPath)) {
            fs.writeFileSync(keyPath, jsonString);
            initializeApp({
                credential: cert(keyPath),
            });
        }
    }
    fastify.register(router, { prefix: '/api/v1' });
};
