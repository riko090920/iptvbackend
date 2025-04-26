require('dotenv').config();
const express = require('express');
const fs = require('fs').promises;
const path = require('path');

// Initialize Express app
const app = express();

// Configuration
const DATA_DIR = path.join(__dirname, 'data');
const PORT = process.env.PORT || 10000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Import routes
const adminRoutes = require('./routes/admin');

// Initialize data directory
async function initializeData() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    
    const defaultFiles = {
      'customers.json': JSON.stringify({
        customers: [
          {
            id: "cust_001",
            name: "Default Customer",
            macs: ["00:1A:2B:3C:4D:5E"],
            package: "basic",
            expires: "2025-12-31",
            channels: ["general"]
          }
        ]
      }, null, 2),
      'channels.json': JSON.stringify({
        countries: [
          {
            name: "Albania",
            code: "AL",
            channels: [
              {
                id: "al-1",
                name: "TV Klan",
                url: "https://stream.tvklan.al/tvklan/stream/playlist.m3u8",
                category: "general",
                language: "Albanian"
              }
            ]
          }
        ]
      }, null, 2)
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
    console.error("Data initialization failed:", error);
    process.exit(1);
  }
}

// Authentication endpoint
app.post('/api/auth', async (req, res) => {
  try {
    const { mac } = req.body;
    if (!mac) {
      return res.status(400).json({ error: "MAC address required" });
    }

    const [customersData, channelsData] = await Promise.all([
      fs.readFile(path.join(DATA_DIR, 'customers.json'), 'utf8'),
      fs.readFile(path.join(DATA_DIR, 'channels.json'), 'utf8')
    ]);
    
    const customers = JSON.parse(customersData);
    const channels = JSON.parse(channelsData);

    const customer = customers.customers.find(c => c.macs.includes(mac));
    if (!customer) {
      return res.status(403).json({ authorized: false });
    }

    const availableChannels = channels.countries.flatMap(country => 
      country.channels.filter(ch => 
        customer.channels.includes('*') || 
        customer.channels.includes(ch.category)
      )
    );

    res.json({
      authorized: true,
      customer: customer.id,
      package: customer.package,
      channels: availableChannels
    });
  } catch (error) {
    console.error("Auth error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Admin routes
app.use('/api/admin', adminRoutes);

// Serve admin panel
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: "IPTV Backend Service",
    endpoints: {
      auth: "POST /api/auth",
      health: "GET /health",
      admin: "GET /admin"
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// Start server
(async () => {
  await initializeData();
  
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Admin panel: http://localhost:${PORT}/admin`);
    console.log(`API Endpoints:`);
    console.log(`- POST /api/auth`);
    console.log(`- GET /health`);
    console.log(`- GET /api/admin/customers`);
  });
})();

// Error handling
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});
