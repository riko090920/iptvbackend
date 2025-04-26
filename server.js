require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Initialize Express
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'frontend/build')));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Configuration
const DATA_DIR = path.join(__dirname, 'data');
const PORT = process.env.PORT || 10000;

// ======================
// DATA INITIALIZATION
// ======================
async function initializeDataFiles() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    
    const defaultFiles = {
      'customers.json': JSON.stringify({
        customers: [
          {
            id: "cust_001",
            name: "Premium Subscriber",
            macs: ["00:1A:2B:3C:4D:5E"],
            package: "premium",
            expires: "2025-12-31",
            channels: ["*"] // All channels
          }
        ]
      }),
      'channels.json': JSON.stringify({
        countries: [
          {
            name: "Albania",
            code: "AL",
            channels: [
              {
                id: "al-tvklan",
                name: "TV Klan",
                url: "https://stream.tvklan.al/tvklan/stream/playlist.m3u8",
                category: "General",
                language: "Albanian",
                logo: "https://i.imgur.com/tvklan.png"
              }
            ]
          }
        ]
      })
    };

    for (const [filename, content] of Object.entries(defaultFiles)) {
      const filePath = path.join(DATA_DIR, filename);
      try {
        await fs.access(filePath);
      } catch {
        await fs.writeFile(filePath, content);
        console.log(`Created default ${filename}`);
      }
    }
  } catch (error) {
    console.error("Data initialization error:", error);
    process.exit(1);
  }
}

// ======================
// AUTHENTICATION LOGIC
// ======================
async function authenticateCustomer(mac) {
  try {
    const [customersData, channelsData] = await Promise.all([
      fs.readFile(path.join(DATA_DIR, 'customers.json'), 'utf8'),
      fs.readFile(path.join(DATA_DIR, 'channels.json'), 'utf8')
    ]);

    const { customers } = JSON.parse(customersData);
    const { countries } = JSON.parse(channelsData);

    const customer = customers.find(c => c.macs.includes(mac));
    if (!customer) return null;

    // Flatten all channels from all countries
    const allChannels = countries.flatMap(country => country.channels);
    
    // Filter based on customer's package
    const availableChannels = customer.channels[0] === '*' 
      ? allChannels 
      : allChannels.filter(c => customer.channels.includes(c.category));

    return {
      customerId: customer.id,
      package: customer.package,
      channels: availableChannels
    };
  } catch (error) {
    console.error("Authentication error:", error);
    return null;
  }
}

// ======================
// ADMIN MIDDLEWARE
// ======================
const adminAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader === `Bearer ${process.env.ADMIN_KEY}`) return next();
  res.status(401).json({ error: "Unauthorized" });
};

// ======================
// API ENDPOINTS
// ======================

// Customer Authentication
app.post('/api/auth', async (req, res) => {
  try {
    const { mac } = req.body;
    if (!mac) return res.status(400).json({ error: "MAC address required" });

    const authResult = await authenticateCustomer(mac);
    if (!authResult) return res.status(403).json({ authorized: false });

    res.json({
      authorized: true,
      customer: authResult.customerId,
      package: authResult.package,
      channels: authResult.channels
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Admin Customer Management
app.get('/api/admin/customers', adminAuth, async (req, res) => {
  try {
    const data = await fs.readFile(path.join(DATA_DIR, 'customers.json'));
    res.json(JSON.parse(data).customers);
  } catch (error) {
    res.status(500).json({ error: "Failed to load customers" });
  }
});

app.post('/api/admin/customers', adminAuth, async (req, res) => {
  try {
    const customersData = JSON.parse(await fs.readFile(path.join(DATA_DIR, 'customers.json')));
    const newCustomer = {
      id: `cust_${Date.now()}`,
      ...req.body,
      macs: Array.isArray(req.body.macs) ? req.body.macs : [req.body.macs]
    };
    
    customersData.customers.push(newCustomer);
    await fs.writeFile(path.join(DATA_DIR, 'customers.json'), JSON.stringify(customersData, null, 2));
    
    res.status(201).json(newCustomer);
  } catch (error) {
    res.status(500).json({ error: "Failed to create customer" });
  }
});

// ======================
// FRONTEND SERVING
// ======================
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/build/index.html'));
});

// ======================
// SERVER STARTUP
// ======================
(async () => {
  try {
    await initializeDataFiles();
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Admin API Key: ${process.env.ADMIN_KEY || 'Not set!'}`);
      console.log(`Access the admin portal: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
})();

// Error handling
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});
