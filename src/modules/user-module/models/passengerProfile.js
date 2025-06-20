import { DataTypes } from 'sequelize';
import sequelize from '#config/db.js';


const PassengerProfile = sequelize.define("PassengerProfile", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    passengerNote: {
        type: DataTypes.FLOAT,
        allowNull: true,
        defaultValue: 0.0,
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
    },
});
export default PassengerProfile;
