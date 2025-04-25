require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const morgan = require('morgan');

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Configuration
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const PORT = process.env.PORT || 3000;

// Initialize data files
async function initializeDataFiles() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    
    const defaultFiles = {
      'users.json': JSON.stringify(["00:1A:2B:3C:4D:5E", "11:22:33:44:55:66"]),
      'channels.json': JSON.stringify([
        {
          id: "channel-1",
          name: "Sample Channel",
          url: "http://example.com/stream1.m3u8",
          category: "General"
        }
      ])
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
  }
}

// Load data files - CORRECTED VERSION
async function loadData() {
  try {
    const [usersData, channelsData] = await Promise.all([
      fs.readFile(path.join(DATA_DIR, 'users.json'), 'utf8'),
      fs.readFile(path.join(DATA_DIR, 'channels.json'), 'utf8')
    ]);
    return {
      users: JSON.parse(usersData),
      channels: JSON.parse(channelsData)
    };
  } catch (error) {
    console.error("Error loading data:", error);
    return {
      users: [],
      channels: []
    };
  }
}

// Routes
app.get('/', (req, res) => {
  res.json({
    status: 'IPTV Backend Running',
    endpoints: {
      auth: 'POST /api/auth',
      channels: 'GET /api/channels',
      health: 'GET /health'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/auth', async (req, res) => {
  try {
    const { mac } = req.body;
    
    if (!mac) {
      return res.status(400).json({ 
        authorized: false,
        message: 'MAC address is required'
      });
    }

    const normalizedMac = mac.toUpperCase().trim();
    const data = await loadData();

    if (data.users.includes(normalizedMac)) {
      return res.json({
        authorized: true,
        channels: data.channels
      });
    } else {
      return res.status(403).json({
        authorized: false,
        message: 'Unauthorized MAC address'
      });
    }
  } catch (error) {
    console.error("Auth error:", error);
    res.status(500).json({
      authorized: false,
      message: 'Internal server error'
    });
  }
});

app.get('/api/channels', async (req, res) => {
  try {
    const data = await loadData();
    res.json(data.channels);
  } catch (error) {
    console.error("Channels error:", error);
    res.status(500).json({
      error: 'Failed to load channels'
    });
  }
});

// Start server
(async () => {
  await initializeDataFiles();
  
  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Data directory: ${DATA_DIR}`);
    console.log(`Application ready: http://localhost:${PORT}`);
  });

  server.on('error', (error) => {
    console.error('Server error:', error);
    process.exit(1);
  });
})();
