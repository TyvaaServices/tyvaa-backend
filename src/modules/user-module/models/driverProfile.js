const {DataTypes} = require('sequelize');
const sequelize = require('./../../../config/db');


const profilChauffeur = sequelize.define("ProfilChauffeur", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    noteChauffeur: {
        type: DataTypes.FLOAT,
        allowNull: true,
        defaultValue: 0.0,
    },
    statusProfil:{
        type: DataTypes.ENUM('Active', 'Suspended'),
        allowNull: false,
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
    },
});
module.exports = profilChauffeur;