const { Sequelize, DataTypes } = require('sequelize'); 
const sequelize = require('../config/database');

const User = sequelize.define('User', {
    nome: {
        type: DataTypes.STRING,
        allowNull: false
    },
    telefone: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    senha: {
        type: DataTypes.STRING,
        allowNull: false
    },
    isAdmin: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    tableName: 'users',
    timestamps: false
});

module.exports = User;
