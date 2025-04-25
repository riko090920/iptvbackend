const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const usersPath = path.join(__dirname, 'data', 'users.json');
const channelsPath = path.join(__dirname, 'data', 'channels.json');

app.post('/api/auth', (req, res) => {
  const { mac } = req.body;
  const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));

  const isValid = users.includes(mac);
  if (!isValid) return res.status(403).json({ message: 'Unauthorized MAC address' });

  const channels = JSON.parse(fs.readFileSync(channelsPath, 'utf8'));
  res.json({ channels });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
