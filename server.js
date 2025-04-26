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

// Helper function to read JSON files
async function readJsonFile(filename) {
  try {
    const data = await fs.readFile(path.join(DATA_DIR, filename), 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filename}:`, error);
    return null;
  }
}

// Initialize data files
async function initializeData() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    
    const defaultData = {
      'customers.json': {
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
      },
      'channels.json': {
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
      }
    };

    for (const [filename, content] of Object.entries(defaultData)) {
      const filePath = path.join(DATA_DIR, filename);
      try {
        await fs.access(filePath);
      } catch {
        await fs.writeFile(filePath, JSON.stringify(content, null, 2));
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
    if (!mac) return res.status(400).json({ error: "MAC address required" });

    const [customers, channels] = await Promise.all([
      readJsonFile('customers.json'),
      readJsonFile('channels.json')
    ]);

    if (!customers || !channels) {
      return res.status(500).json({ error: "Server configuration error" });
    }

    const customer = customers.customers.find(c => c.macs.includes(mac));
    if (!customer) return res.status(403).json({ authorized: false });

    const availableChannels = customer.channels[0] === '*' 
      ? channels.countries.flatMap(c => c.channels)
      : channels.countries.flatMap(c => 
          c.channels.filter(ch => customer.channels.includes(ch.category))
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

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
(async () => {
  await initializeData();
  
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Data directory: ${DATA_DIR}`);
    console.log(`API endpoints:`);
    console.log(`- POST /api/auth`);
    console.log(`- GET /health`);
  });
})();

// Error handling
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});
