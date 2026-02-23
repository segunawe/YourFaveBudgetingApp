require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cron = require('node-cron');
const { db } = require('./config/firebase');
const admin = require('firebase-admin');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root endpoint - API info
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'Financial Budgeting App API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      api: '/api/*'
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Auth middleware
const authMiddleware = require('./middleware/auth');

// API Routes
app.use('/api/plaid', authMiddleware, require('./routes/plaid.routes'));
app.use('/api/buckets', authMiddleware, require('./routes/bucket.routes'));
app.use('/api/friends', authMiddleware, require('./routes/friends.routes'));
app.use('/api/bucket-invites', authMiddleware, require('./routes/bucketInvites.routes'));
app.use('/api/support', authMiddleware, require('./routes/support.routes'));
app.use('/api/users', authMiddleware, require('./routes/user.routes'));
// app.use('/api/groups', authMiddleware, require('./routes/groups.routes'));
// app.use('/api/transactions', authMiddleware, require('./routes/transactions.routes'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: { message: 'Route not found', status: 404 } });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Daily scheduler: auto-collect completed buckets whose target date has passed
cron.schedule('0 0 * * *', async () => {
  console.log('[Scheduler] Checking for buckets to auto-collect...');
  try {
    const now = admin.firestore.Timestamp.now();
    const snapshot = await db
      .collection('buckets')
      .where('status', '==', 'completed')
      .get();

    const batch = db.batch();
    let count = 0;

    snapshot.forEach(doc => {
      const bucket = doc.data();
      if (bucket.targetDate && bucket.targetDate.toMillis() <= now.toMillis()) {
        batch.update(doc.ref, {
          status: 'collected',
          collectedAt: now,
          updatedAt: now,
          autoCollected: true,
        });
        count++;
      }
    });

    if (count > 0) {
      await batch.commit();
      console.log(`[Scheduler] Auto-collected ${count} bucket(s).`);
    } else {
      console.log('[Scheduler] No buckets to auto-collect.');
    }
  } catch (err) {
    console.error('[Scheduler] Auto-collect error:', err);
  }
});
