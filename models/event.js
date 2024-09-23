const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./user'); // Corrigido o caminho para o modelo User

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
            model: 'users', // Nome da tabela de usuários
            key: 'id'
        }
    }
}, {
    tableName: 'events',
    timestamps: false
});

Event.associate = (models) => {
    Event.belongsTo(models.User, { foreignKey: 'userId', as: 'user' }); // Adicionei o alias 'user'
};

module.exports = Event;
