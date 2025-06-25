import { DataTypes } from "sequelize";
import sequelize from "#config/db.js";

const DriverProfile = sequelize.define("ProfilChauffeur", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    driverNote: {
        type: DataTypes.FLOAT,
        allowNull: true,
        defaultValue: 0.0,
    },
    statusProfile: {
        type: DataTypes.ENUM("Active", "Suspended"),
        allowNull: false,
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
    },
});
export default DriverProfile;
