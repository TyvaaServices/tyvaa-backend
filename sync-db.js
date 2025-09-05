// Script to sync database and test booking
import sequelize from './src/config/db.js';
import './src/config/index.js'; // Load all associations

async function syncDatabase() {
    try {
        console.log('Syncing database...');
        await sequelize.sync({ alter: true }); // Use alter to modify existing tables
        console.log('Database synced successfully');
    } catch (error) {
        console.error('Database sync failed:', error);
    } finally {
        await sequelize.close();
    }
}

syncDatabase();
