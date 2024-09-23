const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const passport = require('./config/passport');
const flash = require('connect-flash');
const Sequelize = require('sequelize');
const bcrypt = require('bcrypt');
const exphbs = require('express-handlebars');
const moment = require('moment');
require('dotenv').config();

const app = express();

// Conexão com o Banco de Dados
const sequelize = require('./config/database');
const User = require('./models/user');
const Event = require('./models/event');
const eventRouter = require('./routes/eventRoutes');

// Associe os modelos
User.associate({ Event });
Event.associate({ User });

// Configurações do Handlebars
const hbs = exphbs.create({
    helpers: {
        formatDate: (date) => moment(date).format('DD/MM/YYYY, HH:mm:ss'),
        diffInDays: (date) => {
            const eventDate = moment(date);
            const today = moment();
            return eventDate.diff(today, 'days');
        },
        lt: (a, b) => a < b
    },
    runtimeOptions: {
        allowProtoPropertiesByDefault: true,
        allowProtoMethodsByDefault: true
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

// Função para verificar se o usuário é admin
function isAdmin(req, res, next) {
    if (req.user && req.user.isAdmin) {
        return next();
    }
    req.flash('error_msg', 'Acesso restrito.');
    res.redirect('/profile');
}

// Middleware para garantir que o usuário está autenticado
function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}

// Rota para a página inicial (GET)
app.get('/', (req, res) => {
    res.render('primeira_pagina');
});

// Rota para a página de cadastro (GET)
app.get('/cadastrar-form', (req, res) => {
    res.render('cadastrar', { error: req.flash('error_msg') });
});

// Rota para a página de agendamento (GET)
app.get('/agendamento', isAuthenticated, (req, res) => {
    res.render('agendamento');
});

// Rota para a página de calendário (somente para admin)
app.get('/calendar', isAdmin, async (req, res) => {
    try {
        const events = await Event.findAll({
            include: [{ model: User, as: 'user' }]
        });

        // Formata os eventos para o formato esperado pelo FullCalendar
        const formattedEvents = events.map(event => ({
            id: event.id,
            title: event.title,
            start: new Date(event.start).toISOString(),
            end: event.end ? new Date(event.end).toISOString() : null,
            extendedProps: {
                user: event.user ? event.user.nome : 'Desconhecido',
                telefone: event.user ? event.user.telefone : 'N/A',
                email: event.user ? event.user.email : 'N/A'
            }
        }));

        // Renderiza a página do calendário com os eventos formatados
        res.render('calendar', { events: formattedEvents });
    } catch (error) {
        console.error('Erro ao buscar eventos:', error);
        res.status(500).send('Erro ao carregar o calendário');
    }
});

// Rota para o cadastro (POST)
app.post('/cadastrar', async (req, res) => {
    const { nome, telefone, email, senha } = req.body;

    try {
        const userExists = await User.findOne({ where: { email } });
        if (userExists) {
            req.flash('error_msg', 'Email já registrado!');
            return res.redirect('/cadastrar-form');
        }

        const hashedPassword = await bcrypt.hash(senha, 10);
        await User.create({ nome, telefone, email, senha: hashedPassword });

        console.log('Dados Cadastrados com sucesso!');
        res.redirect('/login');
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
    failureRedirect: '/login',
    failureFlash: true
}), (req, res) => {
    console.log('Usuário autenticado:', req.user);
    req.session.user = {
        id: req.user.id,
        username: req.user.nome,
        isAdmin: req.user.isAdmin
    };
    res.redirect(req.user.isAdmin ? '/calendar' : '/agendamento');
});

// Rota de logout
app.get('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        res.redirect('/'); // Redireciona para a página inicial
    });
});

// Adicionar o router de eventos
app.use('/', eventRouter);

// Conectar ao banco de dados e sincronizar
sequelize.authenticate()
    .then(() => {
        console.log('Conectado ao banco de dados');
        return sequelize.sync({ force: false });
    })
    .then(() => {
        console.log('Tabelas sincronizadas');
    })
    .catch(err => {
        console.error('Erro ao conectar ou sincronizar com o banco de dados:', err);
    });

// Rota para editar evento
app.post('/edit-event/:id', async (req, res) => {
    const { title, start, end } = req.body;
    const eventId = req.params.id;

    try {
        await Event.update({ title, start, end }, { where: { id: eventId } });
        res.status(200).send('Evento atualizado com sucesso');
    } catch (error) {
        console.error('Erro ao atualizar evento:', error);
        res.status(500).send('Erro ao atualizar evento');
    }
});

// Rota de perfil
app.get('/profile', isAuthenticated, async (req, res) => {
    console.log(req.session.user);

    const userId = req.user.id;

    try {
        const userEvents = await Event.findAll({ where: { userId } });
        res.render('profile', {
            events: userEvents,
            username: req.session.user.username,
            success_msg: req.flash('success_msg'),
            error_msg: req.flash('error_msg')
        });
    } catch (error) {
        console.error('Erro ao buscar eventos do usuário:', error);
        res.status(500).send('Erro ao buscar eventos');
    }
});

// Rota para deletar evento do usuário
app.post('/delete-event-user/:id', async (req, res) => {
    const eventId = req.params.id;

    try {
        await Event.destroy({ where: { id: eventId } });
        req.flash('success_msg', 'Evento deletado com sucesso!');
        res.redirect('/profile');
    } catch (error) {
        console.error('Erro ao deletar evento:', error);
        req.flash('error_msg', 'Erro ao deletar evento.');
        res.redirect('/profile');
    }
});

// Rota para listar eventos
app.get('/events', async (req, res) => {
    try {
        const events = await Event.findAll({
            include: [{
                model: User,
                attributes: ['id', 'nome', 'telefone', 'email'], // Inclua os campos desejados
                as: 'user' // Alias definido na associação
            }]
        });

        // Mapeie os eventos para adicionar as informações de contato
        const formattedEvents = events.map(event => {
            return {
                id: event.id,
                title: event.title,
                start: event.start,
                end: event.end,
                user: event.user.nome, // Nome do usuário
                userEmail: event.user.email, // Email do usuário
                userPhone: event.user.telefone // Telefone do usuário
            };
        });

        res.json(formattedEvents);
    } catch (error) {
        console.error('Erro ao buscar eventos:', error);
        res.status(500).json({ error: 'Erro ao buscar eventos' });
    }
});


// Rota para detalhes do evento
app.get("/event-details/:id", async function(req, res) {
    try {
        const event = await Event.findOne({
            where: { id: req.params.id },
            include: [{ model: User, as: 'user' }] // Corrigido para incluir o usuário associado
        });

        console.log(event); // Log para verificar os dados retornados

        if (!event) {
            return res.status(404).json({ error: "Evento não encontrado" });
        }

        res.json(event);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erro ao buscar evento" });
    }
});

// Inicializar servidor
app.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
});
