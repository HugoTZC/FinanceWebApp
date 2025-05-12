const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const routes = require('./src/routes/index');
const { AppError, errorHandler } = require('./src/utils/helpers');
require('dotenv').config();

// Create Express app
const app = express();

// Enable CORS
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600 // 10 minutes
};
app.use(cors(corsOptions));

// Handle preflight requests explicitly (optional but recommended)
app.options('*', cors(corsOptions));

// Debugging middleware (move earlier in the chain)
app.use((req, res, next) => {
  console.log('Request Origin:', req.headers.origin);
  console.log('Request Method:', req.method);
  if (req.headers.authorization) {
    console.log('Authorization header present:', !!req.headers.authorization);
  }
  next();
});

// Set security HTTP headers
app.use(helmet());

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Rate limiting
const globalLimiter = rateLimit({
  max: 1000,
  windowMs: 60 * 60 * 1000, // 1 hour window
  message: 'Too many requests from this IP, please try again in an hour!'
});

// Apply a stricter rate limit to authentication routes to prevent brute force
const authLimiter = rateLimit({
  max: 20,
  windowMs: 15 * 60 * 1000, // 15 minutes
  message: 'Too many login attempts, please try again after 15 minutes'
});

// Apply different rate limits to different routes
app.use('/api/auth/login', authLimiter); // Stricter limit on login attempts
app.use('/api/auth/register', authLimiter); // Stricter limit on registration
app.use('/api', globalLimiter); // More lenient limit for all other API endpoints

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(hpp({
  whitelist: [
    'type', 
    'category_id', 
    'user_category_id', 
    'payment_method',
    'start_date', 
    'end_date'
  ]
}));

// Compression middleware
app.use(compression());

// All API routes now managed through index.js router
app.use('/api', routes);

// Handle undefined routes
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global error handler
app.use(errorHandler);

module.exports = app;

