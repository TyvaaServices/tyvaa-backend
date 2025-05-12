// const serviceAccount = require("./config/serviceAccountKey.json");
require('dotenv').config();
const {initializeApp, cert} = require("firebase-admin/app");
const router = require("./routes/notificationRouter");
const app = require('fastify')({logger: true});
const fs = require('fs');
const path = require('path');

// Décode la clé Base64 depuis. Env et la sauvegarde
// temporairement dans un fichier JSON utilisable par Firebase
const base64Key = process.env.FIREBASE_KEY_BASE64;
const jsonString = Buffer.from(base64Key, 'base64').toString('utf-8');
const keyPath = path.join(__dirname, 'temp_service_account.json');
fs.writeFileSync(keyPath, jsonString);

app.register(router);
const port = process.env.PORT || 2004;
app.listen({port, host: '0.0.0.0'}, (err, address) => {
    initializeApp({
            credential: cert(keyPath),
        });
});
