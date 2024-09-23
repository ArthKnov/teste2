const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const Event = sequelize.define('Event', {
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    start: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    end: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: User,
            key: 'id'
        }
    }
}, {
    tableName: 'events',
    timestamps: false
});

module.exports = Event;
