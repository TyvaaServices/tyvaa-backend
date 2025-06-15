const {Sequelize} = require('sequelize');
require('dotenv').config();


const sequelize = new Sequelize(process.env.DATABASE_URL||"postgres://postgres:oulimata2@localhost:5432/testage", {
    dialect: 'postgres',
    protocol: 'postgres',
    logging: true,
    sync:{alter:true}
});

module.exports = sequelize;
