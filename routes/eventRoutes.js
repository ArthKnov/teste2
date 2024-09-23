const express = require('express');
const router = express.Router();
const Event = require('../models/event'); // Modelo Event

// Rota para adicionar um evento
router.post('/add-event', async (req, res) => {
    const { title, start, end } = req.body;
    const userId = req.user ? req.user.id : null; // Obtém o ID do usuário autenticado

    if (!userId) {
        req.flash('error_msg', 'Você precisa estar logado para criar um evento.');
        return res.redirect('/login');
    }

    try {
        // Criar o evento associado ao usuário logado
        await Event.create({
            title: title,
            start: start,
            end: end,
            userId: userId // Certifique-se de que o userId está sendo adicionado corretamente
        });

        console.log('Evento criado com sucesso!');
        res.redirect('/profile'); // Redireciona para a página de perfil ou calendário
    } catch (error) {
        console.error('Erro ao criar evento:', error);
        res.status(500).send('Erro ao criar evento');
    }
});

module.exports = router;
