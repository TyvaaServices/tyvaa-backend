const sequelize = require('./index');
const {DataTypes} = require("sequelize");

const Auteur = sequelize.define("Auteur", {
    id:{
        type:DataTypes.INTEGER,
        primaryKey:true,
        autoIncrement:true
    },
    nom:{
        type:DataTypes.STRING
    },
});
module.exports = Auteur;