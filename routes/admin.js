const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

// Admin middleware
const adminAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader === `Bearer ${process.env.ADMIN_KEY}`) return next();
  res.status(401).json({ error: "Unauthorized" });
};

// Get all customers
router.get('/customers', adminAuth, async (req, res) => {
  try {
    const data = await fs.readFile(path.join(__dirname, '../data/customers.json'));
    res.json(JSON.parse(data).customers);
  } catch (error) {
    res.status(500).json({ error: "Failed to load customers" });
  }
});

// Add new customer
router.post('/customers', adminAuth, async (req, res) => {
  try {
    const filePath = path.join(__dirname, '../data/customers.json');
    const data = JSON.parse(await fs.readFile(filePath));
    
    const newCustomer = {
      id: `cust_${Date.now()}`,
      ...req.body,
      macs: Array.isArray(req.body.macs) ? req.body.macs : [req.body.macs]
    };
    
    data.customers.push(newCustomer);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    
    res.status(201).json(newCustomer);
  } catch (error) {
    res.status(500).json({ error: "Failed to create customer" });
  }
});

module.exports = router;
