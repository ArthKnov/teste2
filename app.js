const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const passport = require('./config/passport'); // Importa o Passport
const flash = require('connect-flash');
const Sequelize = require('sequelize');
const handlebars = require('express-handlebars');
const moment = require('moment');
require('dotenv').config();

const app = express();

// Conexão com o Banco de Dados
const sequelize = require('./config/database');

// Configurações do Handlebars
const hbs = handlebars.create({
    helpers: {
        diffInDays: (date) => {
            const eventDate = moment(date);
            const today = moment();
            return eventDate.diff(today, 'days');
        }
    }
});
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({ secret: 'seu-segredo', resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// Rota para a página inicial (GET)
app.get('/', (req, res) => {
    res.render('primeira_pagina'); // Renderiza a página inicial
});

// Rota para a página de cadastro (GET)
app.get('/cadastrar-form', (req, res) => {
    res.render('cadastrar', { error: req.flash('error_msg') });
});

// Rota para a página de agendamento (GET)
app.get('/agendamento', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login'); // Redirecionar para login se o usuário não estiver autenticado
    }
    res.render('agendamento'); // Renderiza a página de agendamento
});

// Rota para o cadastro (POST)
app.post('/cadastrar', async (req, res) => {
    const { nome, telefone, email, senha } = req.body;

    try {
        // Verificar se o email já está registrado
        const userExists = await Cadastro.findOne({ where: { email: email } });
        if (userExists) {
            req.flash('error_msg', 'Email já registrado!');
            return res.redirect('/cadastrar-form');
        }

        // Hash da senha
        const hashedPassword = await bcrypt.hash(senha, 10);

        // Criar novo usuário
        await Cadastro.create({
            nome: nome,
            telefone: telefone,
            email: email,
            senha: hashedPassword
        });

        console.log('Dados Cadastrados com sucesso!');
        res.redirect('/login'); // Redirecionar para a página de login após o cadastro
    } catch (error) {
        console.error('Erro ao gravar os dados na entidade:', error);
        res.send('Erro ao gravar os dados na entidade');
    }
});

// Rota para a página de login (GET)
app.get('/login', (req, res) => {
    res.render('login', { error: req.flash('error_msg') });
});

// Rota para o login (POST)
app.post('/login', passport.authenticate('local', {
    successRedirect: '/agendamento',
    failureRedirect: '/login',
    failureFlash: true
}));

// Inicializar servidor
app.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
});
