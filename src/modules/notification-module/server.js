require('dotenv').config();
const { initializeApp, cert } = require('firebase-admin/app');
const router = require('./routes/notificationRouter');
const fs = require('fs');
const path = require('path');

module.exports = async function (fastify, opts) {
    const base64Key = process.env.FIREBASE_KEY_BASE64;
    if (!base64Key) {
        fastify.log.error('FIREBASE_KEY_BASE64 environment variable is not set. Skipping Firebase initialization.');
    } else {
        const jsonString = Buffer.from(base64Key, 'base64').toString('utf-8');
        const keyPath = path.join(__dirname, 'temp_service_account.json');
        if (!fs.existsSync(keyPath)) {
            fs.writeFileSync(keyPath, jsonString);
        fs.writeFileSync(keyPath, jsonString);
            initializeApp({
                credential: cert(keyPath),
            });
        }
    }
    fastify.register(router, { prefix: '/api/v1' });
};

