import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import vaultRoutes from './routes/vault.js';
import contactsRoutes from './routes/contacts.js';
import triggersRoutes from './routes/triggers.js';
import dashboardRoutes from './routes/dashboard.js';
import twoFARoutes from './routes/twofa.js';
import exportRoutes from './routes/export.js';
import backupRoutes from './routes/backup.js';
import testRoutes from './routes/test.js';
import { startInactivityScheduler, runInactivityCheckManually } from './utils/scheduler.js';
import { startTriggerScheduler } from './utils/triggerScheduler.js';

dotenv.config();

const app = express();

// Middleware
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (mobile apps, curl, etc.)
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Database Connection
let dbConnected = false;
let dbErrorMessage = 'Database connection is not available';

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/digital-legacy-manager')
  .then(() => {
    console.log('MongoDB connected');
    dbConnected = true;
    dbErrorMessage = '';
    // Start schedulers after DB connection
    startInactivityScheduler();
    startTriggerScheduler();
  })
  .catch(err => {
    console.log('MongoDB connection error:', err.message);
    dbConnected = false;
    dbErrorMessage = err.message;
  });

mongoose.connection.on('connected', () => {
  dbConnected = true;
  dbErrorMessage = '';
});

mongoose.connection.on('disconnected', () => {
  dbConnected = false;
  dbErrorMessage = 'MongoDB disconnected';
});

mongoose.connection.on('error', (err) => {
  dbConnected = false;
  dbErrorMessage = err.message;
});

// Routes
const dbCheckMiddleware = (req, res, next) => {
  if (!dbConnected) {
    return res.status(503).json({ 
      error: 'Database connection failed',
      message: dbErrorMessage || 'Unable to connect to MongoDB',
      help: 'Ensure MongoDB is reachable and MONGODB_URI in backend/.env is valid.'
    });
  }
  next();
};

app.use('/api/auth', dbCheckMiddleware, authRoutes);
app.use('/api/vault', dbCheckMiddleware, vaultRoutes);
app.use('/api/contacts', dbCheckMiddleware, contactsRoutes);
app.use('/api/triggers', dbCheckMiddleware, triggersRoutes);
app.use('/api/dashboard', dbCheckMiddleware, dashboardRoutes);
app.use('/api/auth', dbCheckMiddleware, twoFARoutes);
app.use('/api/data', dbCheckMiddleware, exportRoutes);
app.use('/api/data', dbCheckMiddleware, backupRoutes);
app.use('/api/test', dbCheckMiddleware, testRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'Server is running',
    database: dbConnected ? 'Connected' : 'Disconnected',
    details: dbConnected ? 'MongoDB connection is healthy' : dbErrorMessage
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
