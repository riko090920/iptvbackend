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
const DATA_DIR = path.join(__dirname, 'data');
const PORT = process.env.PORT || 3000;

// Initialize data files
async function initializeDataFiles() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const defaultFiles = {
      'users.json': JSON.stringify(["00:1A:2B:3C:4D:5E"]),
      'channels.json': JSON.stringify([{
        id: "channel-1",
        name: "Sample Channel",
        url: "http://example.com/stream1.m3u8"
      }])
    };

    for (const [file, content] of Object.entries(defaultFiles)) {
      const filePath = path.join(DATA_DIR, file);
      try {
        await fs.access(filePath);
      } catch {
        await fs.writeFile(filePath, content);
      }
    }
  } catch (err) {
    console.error("Data initialization error:", err);
  }
}

// Routes
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.post('/api/auth', async (req, res) => {
  // Your auth logic here
});

// Start Server
(async () => {
  await initializeDataFiles();
  
  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`); // Critical for Render
    console.log(`Data directory: ${DATA_DIR}`);
    
    // REQUIRED: This log message makes Render detect the port
    console.log(`Application ready: http://localhost:${PORT}`);
  });

  // Error handling
  server.on('error', (err) => {
    console.error('Server error:', err);
    process.exit(1);
  });
})();
