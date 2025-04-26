require('dotenv').config();
const express = require('express');
const session = require('express-session');
const fs = require('fs').promises;
const path = require('path');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');

const app = express();
const DATA_DIR = path.join(__dirname, 'data');
const PORT = process.env.PORT || 10000;

// Middleware
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set to true if using HTTPS
}));

// Admin credentials (in production, store hashed passwords in database)
const ADMIN_CREDENTIALS = {
  username: process.env.ADMIN_USER || 'admin',
  passwordHash: bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'admin123', 10)
};

// Login route
app.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const userValid = username === ADMIN_CREDENTIALS.username;
    const passValid = await bcrypt.compare(password, ADMIN_CREDENTIALS.passwordHash);

    if (userValid && passValid) {
      req.session.authenticated = true;
      return res.json({ success: true, redirect: '/admin/' });
    }

    return res.status(401).json({ error: 'Invalid credentials' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Authentication middleware
const authenticate = (req, res, next) => {
  if (req.session.authenticated || req.path === '/login') {
    return next();
  }
  res.redirect('/admin/login');
};

// Admin routes
app.get('/admin/', authenticate, (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin/index.html'));
});

app.get('/admin/login', (req, res) => {
  if (req.session.authenticated) {
    return res.redirect('/admin/');
  }
  res.sendFile(path.join(__dirname, 'public/admin/login.html'));
});

app.get('/admin/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin/login');
});

// Admin API endpoints
app.get('/admin/api/customers', authenticate, async (req, res) => {
  try {
    const data = await fs.readFile(path.join(DATA_DIR, 'customers.json'), 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    console.error('Failed to load customers:', error);
    res.status(500).json({ error: "Failed to load customer data" });
  }
});

// Other existing routes (auth, health, etc.) remain the same...

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin/login`);
});
