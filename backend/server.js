const express = require('express');
const cors    = require('cors');
const path    = require('path');

// Initialise DB — creates the file and seeds data on first run
require('./database');

const inventoryRouter      = require('./routes/inventory');
const jobsRouter           = require('./routes/jobs');
const logisticsRouter      = require('./routes/logistics');
const authRouter           = require('./routes/auth');
const calendarRouter       = require('./routes/calendar');
const { router: lineRouter } = require('./routes/line');
const localPurchasesRouter = require('./routes/local-purchases');
const ciplRouter           = require('./routes/cipl');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api', inventoryRouter);
app.use('/api', jobsRouter);
app.use('/api', logisticsRouter);
app.use('/api', authRouter);
app.use('/api', calendarRouter);
app.use('/api', lineRouter);
app.use('/api', localPurchasesRouter);
app.use('/api', ciplRouter);
app.use('/', lineRouter);

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] Running at http://0.0.0.0:${PORT}`);
});
