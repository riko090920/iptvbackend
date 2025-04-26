require('dotenv').config();
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const helmet = require('helmet');

const app = express();
const DATA_DIR = path.join(__dirname, 'data');
const PORT = process.env.PORT || 10000;

// Middleware
app.use(helmet());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Simple auth middleware (replaces express-basic-auth)
const adminAuth = (req, res, next) => {
  const auth = {
    login: process.env.ADMIN_USER || 'admin',
    password: process.env.ADMIN_PASSWORD || 'admin123'
  };

  const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
  const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');

  if (login && password && login === auth.login && password === auth.password) {
    return next();
  }

  res.set('WWW-Authenticate', 'Basic realm="Admin Area"');
  res.status(401).send('Authentication required');
};

// Admin routes
app.get('/admin', adminAuth, (req, res) => {
  try {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
  } catch (error) {
    console.error('Failed to serve admin page:', error);
    res.status(500).send('Failed to load admin interface');
  }
});

// Admin API endpoints
app.get('/admin/data/customers', adminAuth, async (req, res) => {
  try {
    const data = await fs.readFile(path.join(DATA_DIR, 'customers.json'), 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    console.error('Failed to load customers:', error);
    res.status(500).json({ error: "Failed to load customer data" });
  }
});

app.get('/admin/data/channels', adminAuth, async (req, res) => {
  try {
    const data = await fs.readFile(path.join(DATA_DIR, 'channels.json'), 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    console.error('Failed to load channels:', error);
    res.status(500).json({ error: "Failed to load channel data" });
  }
});

// Other existing routes (auth, health, etc.) remain the same...

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: "Internal server error",
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin`);
});
