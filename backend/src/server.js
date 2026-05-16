require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { connectDb, mongoose } = require('./config/db');
const {
  validateEnv,
  getCorsOrigins,
  nodeEnv,
  port,
  rateLimitWindowMs,
  rateLimitMax
} = require('./config/env');
const authRoutes = require('./routes/auth.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const menuRoutes = require('./routes/menu.routes');
const orderRoutes = require('./routes/order.routes');
const branchRoutes = require('./routes/branch.routes');
const userRoutes = require('./routes/user.routes');
const salesRoutes = require('./routes/sales.routes');
const supportRoutes = require('./routes/support.routes');
const errorHandler = require('./middleware/errorHandler');

validateEnv();

const app = express();
const allowedOrigins = getCorsOrigins();

app.disable('x-powered-by');
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origin tidak diizinkan oleh CORS.'));
  },
  credentials: true
}));
app.use(rateLimit({
  windowMs: rateLimitWindowMs,
  max: rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Request terlalu banyak. Coba lagi nanti.' }
}));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: mongoose.connection.readyState === 1,
    app: 'DYN SH SaaS API',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'not_connected',
    environment: nodeEnv
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/support', supportRoutes);

app.use((_req, res) => {
  res.status(404).json({ message: 'Endpoint tidak ditemukan.' });
});
app.use(errorHandler);

async function bootstrap() {
  await connectDb();
  app.listen(port, () => {
    console.log(`API running on http://localhost:${port}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start API:', err.message);
  process.exit(1);
});