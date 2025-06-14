const {Sequelize} = require('sequelize');
require('dotenv').config();


const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    protocol: 'postgres',
    logging: true,
    sync:{alter:true}
});

module.exports = sequelize;
module.exports = sequelize;