const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const apiRoutes = require('./routes/api');

const app = express();
app.use(cors({origin:"https://emaildetailer.netlify.app"}));
app.use(bodyParser.json());
app.use(morgan('dev'));

app.use('/api', apiRoutes);

// health
app.get('/health', (req, res) => res.json({ ok: true }));

module.exports = app;
