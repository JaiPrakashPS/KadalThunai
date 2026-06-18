const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/auth.routes');
const profileRoutes = require('./routes/profile.routes');
const boatRoutes = require('./routes/boat.routes');
const catchRoutes = require('./routes/catch.routes');
const fishingZoneRoutes = require('./routes/fishingZone.routes');
const sosRoutes = require('./routes/sos.routes');
const incidentRoutes = require('./routes/incident.routes');
const complaintRoutes = require('./routes/complaint.routes');
const marketPriceRoutes = require('./routes/marketPrice.routes');
const schemeRoutes = require('./routes/scheme.routes');
const notificationRoutes = require('./routes/notification.routes');
const weatherRoutes = require('./routes/weather.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();

// ─── Security middleware ───────────────────────────────────────────────────
// Disable Content-Security-Policy in dev (it blocks admin panel API calls)
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production',
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({
  origin: true,  // reflect the request origin — allows all in dev
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Rate limiting ─────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});
app.use('/api', limiter);

// Stricter limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many auth attempts. Please try again in 15 minutes.' },
});

// ─── Body parsing ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Logging ───────────────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ─── Health check ─────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'KadalThunai API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ─── API Routes ────────────────────────────────────────────────────────────
const API_PREFIX = '/api/v1';

app.use(`${API_PREFIX}/auth`, authLimiter, authRoutes);
app.use(`${API_PREFIX}/profile`, profileRoutes);
app.use(`${API_PREFIX}/boats`, boatRoutes);
app.use(`${API_PREFIX}/catches`, catchRoutes);
app.use(`${API_PREFIX}/fishing-zones`, fishingZoneRoutes);
app.use(`${API_PREFIX}/sos`, sosRoutes);
app.use(`${API_PREFIX}/incidents`, incidentRoutes);
app.use(`${API_PREFIX}/complaints`, complaintRoutes);
app.use(`${API_PREFIX}/market-prices`, marketPriceRoutes);
app.use(`${API_PREFIX}/schemes`, schemeRoutes);
app.use(`${API_PREFIX}/notifications`, notificationRoutes);
app.use(`${API_PREFIX}/weather`, weatherRoutes);
app.use(`${API_PREFIX}/analytics`, analyticsRoutes);
app.use(`${API_PREFIX}/admin`, adminRoutes);

// ─── 404 Handler ──────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.url} not found.` });
});

// ─── Global error handler ─────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
