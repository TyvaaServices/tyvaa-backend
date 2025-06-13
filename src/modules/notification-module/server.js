require('dotenv').config();
const { initializeApp, cert } = require('firebase-admin/app');
const router = require('./routes/notificationRouter');
const fs = require('fs');
const path = require('path');

// Export as Fastify plugin
module.exports = async function (fastify, opts) {
    // Decode the Base64 key from env and save temporarily for Firebase
    const base64Key = process.env.FIREBASE_KEY_BASE64;
    if (!base64Key) {
        fastify.log.error('FIREBASE_KEY_BASE64 environment variable is not set. Skipping Firebase initialization.');
    } else {
        const jsonString = Buffer.from(base64Key, 'base64').toString('utf-8');
        const keyPath = path.join(__dirname, 'temp_service_account.json');
        fs.writeFileSync(keyPath, jsonString);

        // Initialize Firebase if not already initialized
        if (!initializeApp.apps || initializeApp.apps.length === 0) {
            initializeApp({
                credential: cert(keyPath),
            });
        }
    }
    // Register notification routes
    fastify.register(router, { prefix: '/api/v1' });
};
