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

const DATA_DIR = path.join(__dirname, 'data');

async function loadData() {
  try {
    const [users, channels] = await Promise.all([
      fs.readFile(path.join(DATA_DIR, 'users.json'), 'utf8'), 
      fs.readFile(path.join(DATA_DIR, 'channels.json'), 'utf8')
    ]);
    
    return {
      users: JSON.parse(users),
      channels: JSON.parse(channels)
    };
  } catch (error) {
    console.error('Error loading data files:', error);
    process.exit(1);
  }
}

let data;
const PORT = process.env.PORT || 3000;

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
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
    console.error('Authentication error:', error);
    res.status(500).json({ 
      authorized: false, 
      message: 'Internal server error' 
    });
  }
});

app.get('/api/channels', (req, res) => {
  res.json(data.channels);
});

(async () => {
  try {
    data = await loadData();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Loaded ${data.users.length} users and ${data.channels.length} channels`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();
