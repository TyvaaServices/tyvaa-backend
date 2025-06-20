import {Sequelize} from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize(process.env.DATABASE_URL || "postgresql://postgres:oulimata2@localhost:5432/testage", {
    dialect: 'postgres',
    protocol: 'postgres',
});

export default sequelize;
