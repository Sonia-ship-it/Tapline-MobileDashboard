const express = require('express');
const mqtt = require('mqtt');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

const PORT = 8275;
const TEAM_ID = "TapLine";
const MQTT_BROKER = "mqtt://157.173.101.159:1883";
const MONGO_URI = process.env.MONGODB_URI;

// MongoDB Connection
mongoose.connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Card Schema
const cardSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  holderName: { type: String, required: true },
  balance: { type: Number, default: 0 },
  lastTopup: { type: Number, default: 0 },
  passcode: { type: String, default: null }, // 6ndigit passcode (hashed)
  passcodeSet: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Card = mongoose.model('Card', cardSchema);

// User Schema for Authentication & Authorization
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['agent', 'sales', 'admin'], default: 'sales' },
  name: { type: String, required: true },
  terminalId: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);


// Passcode helper functions
async function hashPasscode(passcode) {
  const saltRounds = 10;
  return await bcrypt.hash(passcode, saltRounds);
}

async function verifyPasscode(inputPasscode, hashedPasscode) {
  return await bcrypt.compare(inputPasscode, hashedPasscode);
}

// Transaction Schema
const transactionSchema = new mongoose.Schema({
  uid: { type: String, required: true, index: true },
  holderName: { type: String, required: true },
  type: { type: String, enum: ['topup', 'debit'], default: 'topup' },
  amount: { type: Number, required: true },
  balanceBefore: { type: Number, required: true },
  balanceAfter: { type: Number, required: true },
  description: { type: String },
  terminalId: { type: String, default: 'MOBILE_TERM_01' },
  timestamp: { type: Date, default: Date.now }
});

const Transaction = mongoose.model('Transaction', transactionSchema);

const PRODUCTS = [
  // Food & Beverages
  { id: 'coffee', name: 'Coffee', price: 2.50, icon: '☕', category: 'food' },
  { id: 'sandwich', name: 'Sandwich', price: 5.00, icon: '🥪', category: 'food' },
  { id: 'water', name: 'Water Bottle', price: 1.00, icon: '💧', category: 'food' },
  { id: 'snack', name: 'Snack Pack', price: 3.00, icon: '🍿', category: 'food' },
  { id: 'juice', name: 'Fresh Juice', price: 3.50, icon: '🧃', category: 'food' },
  { id: 'salad', name: 'Salad Bowl', price: 6.00, icon: '🥗', category: 'food' },

  // Rwandan Local Foods
  { id: 'brochette', name: 'Brochette', price: 4.00, icon: '🍢', category: 'rwandan' },
  { id: 'isombe', name: 'Isombe', price: 3.50, icon: '🥬', category: 'rwandan' },
  { id: 'ubugari', name: 'Ubugari', price: 2.00, icon: '🍚', category: 'rwandan' },
  { id: 'sambaza', name: 'Sambaza (Fried)', price: 3.00, icon: '🐟', category: 'rwandan' },
  { id: 'akabenzi', name: 'Akabenzi (Pork)', price: 5.50, icon: '🥓', category: 'rwandan' },

  { id: 'ikivuguto', name: 'Ikivuguto (Yogurt)', price: 1.50, icon: '🥛', category: 'rwandan' },
  { id: 'agatogo', name: 'Agatogo', price: 4.50, icon: '🍲', category: 'rwandan' },
  { id: 'urwagwa', name: 'Urwagwa (Banana Beer)', price: 2.50, icon: '🍺', category: 'rwandan' },

  // Snacks & Drinks
  { id: 'fanta', name: 'Fanta', price: 1.20, icon: '🥤', category: 'drinks' },
  { id: 'primus', name: 'Primus Beer', price: 2.00, icon: '🍺', category: 'drinks' },
  { id: 'mutzig', name: 'Mutzig Beer', price: 2.00, icon: '🍺', category: 'drinks' },
  { id: 'inyange-juice', name: 'Inyange Juice', price: 1.50, icon: '🧃', category: 'drinks' },
  { id: 'chips', name: 'Chips', price: 2.50, icon: '🍟', category: 'food' },

  // Domain Registration Services
  { id: 'domain-com', name: '.com Domain', price: 12.00, icon: '🌐', category: 'domains' },
  { id: 'domain-net', name: '.net Domain', price: 11.00, icon: '🌐', category: 'domains' },
  { id: 'domain-org', name: '.org Domain', price: 10.00, icon: '🌐', category: 'domains' },
  { id: 'domain-io', name: '.io Domain', price: 35.00, icon: '🌐', category: 'domains' },
  { id: 'domain-dev', name: '.dev Domain', price: 15.00, icon: '🌐', category: 'domains' },
  { id: 'domain-app', name: '.app Domain', price: 18.00, icon: '🌐', category: 'domains' },
  { id: 'domain-ai', name: '.ai Domain', price: 80.00, icon: '🤖', category: 'domains' },
  { id: 'domain-xyz', name: '.xyz Domain', price: 8.00, icon: '🌐', category: 'domains' },
  { id: 'domain-co', name: '.co Domain', price: 25.00, icon: '🌐', category: 'domains' },
  { id: 'domain-rw', name: '.rw Domain', price: 20.00, icon: '🇷🇼', category: 'domains' },

  // Digital Services
  { id: 'hosting-basic', name: 'Basic Hosting (1mo)', price: 5.00, icon: '☁️', category: 'services' },
  { id: 'hosting-pro', name: 'Pro Hosting (1mo)', price: 15.00, icon: '☁️', category: 'services' },
  { id: 'ssl-cert', name: 'SSL Certificate', price: 10.00, icon: '🔒', category: 'services' },
  { id: 'email-pro', name: 'Professional Email', price: 8.00, icon: '📧', category: 'services' }
];

// Topics - Updated to match assignment requirements exactly
const TOPIC_STATUS = `rfid/${TEAM_ID}/status`;
const TOPIC_SCAN = `rfid/${TEAM_ID}/scan`;
const TOPIC_TOPUP = `rfid/${TEAM_ID}/topup`;
const TOPIC_PAYMENT = `rfid/${TEAM_ID}/payment`;

// MQTT Client Setup
const mqttClient = mqtt.connect(MQTT_BROKER);
let isMqttConnected = false;

mqttClient.on('connect', () => {
  console.log('Connected to MQTT Broker');
  isMqttConnected = true;
  mqttClient.subscribe(TOPIC_STATUS);
  mqttClient.subscribe(TOPIC_SCAN);
  mqttClient.subscribe(TOPIC_PAYMENT);

  // Inform all clients that MQTT is active
  io.emit('system-status', { type: 'mqtt', status: true });
});

mqttClient.on('offline', () => {
  console.log('MQTT Broker Offline');
  isMqttConnected = false;
  io.emit('system-status', { type: 'mqtt', status: false });
});

mqttClient.on('reconnect', () => {
  console.log('Reconnecting to MQTT Broker...');
});

mqttClient.on('error', (err) => {
  console.error('MQTT Connection Error:', err);
  isMqttConnected = false;
  io.emit('system-status', { type: 'mqtt', status: false });
});

mqttClient.on('message', (topic, message) => {
  console.log(`Received message on ${topic}: ${message.toString()}`);
  try {
    const payload = JSON.parse(message.toString());

    if (topic === TOPIC_STATUS || topic === TOPIC_SCAN) {
      // Both status and scan messages imply a card is present
      io.emit('card-status', payload);
    } else if (topic === TOPIC_PAYMENT) {
      io.emit('payment-result', payload);
    }
  } catch (err) {
    console.error('Failed to parse MQTT message:', err);
  }
});


// Auth Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token.' });
    req.user = user;
    next();
  });
};

const authorizeRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Access denied. Requires one of these roles: ${roles.join(', ')}` });
    }
    next();
  };
};

// Auth Routes
app.post('/auth/register', async (req, res) => {
  const { username, password, role, name, terminalId } = req.body;
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ error: 'Username already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      username,
      password: hashedPassword,
      role: role || 'sales',
      name,
      terminalId: terminalId || `TERM_${Math.floor(Math.random() * 1000)}`
    });

    await user.save();
    res.status(201).json({ success: true, message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ error: 'Invalid username or password' });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ error: 'Invalid username or password' });

    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        name: user.name,
        terminalId: user.terminalId
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Profile endpoint
app.get('/auth/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});


// New Endpoint: System Stats for Dashboard
app.get('/stats', authenticateToken, authorizeRole(['admin', 'agent']), async (req, res) => {
  try {
    const totalCards = await Card.countDocuments();
    const allCards = await Card.find({}, 'balance');
    const totalBalance = allCards.reduce((acc, c) => acc + (c.balance || 0), 0);

    const transactions = await Transaction.find();
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const totalTransactions = transactions.length;
    const topups = transactions.filter(t => t.type === 'topup');
    const payments = transactions.filter(t => t.type === 'debit');

    const todayTransactions = transactions.filter(t => new Date(t.timestamp) >= startOfToday);
    const todayTopups = todayTransactions.filter(t => t.type === 'topup');
    const todayPayments = todayTransactions.filter(t => t.type === 'debit');

    res.json({
      totalCards,
      totalBalance,
      totalTransactions,
      topupCount: topups.length,
      topupTotal: topups.reduce((acc, t) => acc + t.amount, 0),
      paymentCount: payments.length,
      paymentTotal: payments.reduce((acc, t) => acc + t.amount, 0),
      // Today stats
      todayTopupCount: todayTopups.length,
      todayTopupTotal: todayTopups.reduce((acc, t) => acc + t.amount, 0),
      todayPaymentCount: todayPayments.length,
      todayPaymentTotal: todayPayments.reduce((acc, t) => acc + t.amount, 0),
      todayCardsServed: new Set(todayTransactions.map(t => t.uid)).size
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// New Endpoint: Global Transactions with Filtering
app.get('/transactions/all', authenticateToken, authorizeRole(['admin', 'agent', 'sales']), async (req, res) => {
  const { type, timeframe } = req.query;
  try {
    let query = {};
    if (type) query.type = type;

    if (timeframe === 'today') {
      const now = new Date();
      query.timestamp = { $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) };
    }

    const transactions = await Transaction.find(query).sort({ timestamp: -1 }).limit(100);
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch global transactions' });
  }
});

// New Endpoint: Individual Card Stats
app.get('/stats/:uid', async (req, res) => {
  const { uid } = req.params;
  try {
    const card = await Card.findOne({ uid });
    if (!card) return res.status(404).json({ error: 'Card not found' });

    const transactions = await Transaction.find({ uid });
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const monthlyTransactions = transactions.filter(t => new Date(t.timestamp) >= startOfMonth);
    const monthlySpend = monthlyTransactions
      .filter(t => t.type === 'debit')
      .reduce((acc, t) => acc + t.amount, 0);

    const totalIncome = transactions
      .filter(t => t.type === 'topup')
      .reduce((acc, t) => acc + t.amount, 0);

    const totalSpent = transactions
      .filter(t => t.type === 'debit')
      .reduce((acc, t) => acc + t.amount, 0);

    const savingRate = totalIncome > 0
      ? Math.max(0, ((totalIncome - totalSpent) / totalIncome) * 100)
      : 0;

    res.json({
      monthlySpend,
      savingRate: parseFloat(savingRate.toFixed(1)),
      totalTransactions: transactions.length
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch card stats' });
  }
});

// HTTP Endpoints
app.post('/topup', authenticateToken, authorizeRole(['agent', 'admin']), async (req, res) => {
  const { uid, amount, holderName, passcode } = req.body;

  if (!uid || amount === undefined) {
    return res.status(400).json({ error: 'UID and amount are required' });
  }

  try {
    // Find or create card
    let card = await Card.findOne({ uid });
    const balanceBefore = card ? card.balance : 0;

    if (!card) {
      if (!holderName) {
        return res.status(400).json({ error: 'Holder name is required for new cards' });
      }

      // For new cards, passcode is required
      if (!passcode || !/^\d{6}$/.test(passcode)) {
        return res.status(400).json({ error: 'A 6-digit passcode is required for new cards' });
      }

      // Hash the passcode
      const hashedPasscode = await hashPasscode(passcode);

      card = new Card({
        uid,
        holderName,
        balance: amount,
        lastTopup: amount,
        passcode: hashedPasscode,
        passcodeSet: true
      });
    } else {
      // Cumulative topup: add to existing balance
      card.balance += amount;
      card.lastTopup = amount;
      card.updatedAt = Date.now();
    }

    await card.save();

    // Create transaction record
    const transaction = new Transaction({
      uid: card.uid,
      holderName: card.holderName,
      type: 'topup',
      amount: amount,
      balanceBefore: balanceBefore,
      balanceAfter: card.balance,
      description: `Top-up of $${amount.toFixed(2)}`,
      terminalId: req.body.terminalId || 'MOBILE_TERM_01'
    });
    await transaction.save();

    // Publish to MQTT with updated balance
    const payload = JSON.stringify({ uid, amount: card.balance, terminal: req.body.terminalId || 'UNKNOWN' });
    mqttClient.publish(TOPIC_TOPUP, payload, (err) => {
      if (err) {
        console.error('Failed to publish topup:', err);
        return res.status(500).json({ error: 'Failed to publish topup command' });
      }
      console.log(`Published topup for ${uid} (${card.holderName}): ${card.balance}`);
    });

    res.json({
      success: true,
      message: 'Topup successful',
      card: {
        uid: card.uid,
        holderName: card.holderName,
        balance: card.balance,
        lastTopup: card.lastTopup
      },
      transaction: {
        id: transaction._id,
        amount: transaction.amount,
        balanceAfter: transaction.balanceAfter,
        timestamp: transaction.timestamp
      }
    });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Database operation failed' });
  }
});

// Payment / Debit endpoint
app.post('/pay', authenticateToken, authorizeRole(['sales', 'admin']), async (req, res) => {
  const { uid, productId, amount, description, passcode } = req.body;

  if (!uid || (!productId && amount === undefined)) {
    return res.status(400).json({ error: 'UID and product or amount are required' });
  }

  try {
    // Find card first to check passcode requirement
    const card = await Card.findOne({ uid });
    if (!card) {
      return res.status(404).json({ error: 'Card not found. Please top up first.' });
    }

    // Verify passcode if set
    if (card.passcodeSet) {
      if (!passcode) {
        return res.status(401).json({
          error: 'Passcode required for this card',
          passcodeRequired: true
        });
      }

      const isValid = await verifyPasscode(passcode, card.passcode);
      if (!isValid) {
        return res.status(401).json({
          error: 'Incorrect passcode',
          passcodeRequired: true
        });
      }
    }

    // Resolve amount from product catalog or use direct amount
    let payAmount = amount;
    let payDescription = description || 'Payment';

    if (productId) {
      const product = PRODUCTS.find(p => p.id === productId);
      if (!product) {
        return res.status(400).json({ error: 'Invalid product ID' });
      }
      payAmount = product.price;
      payDescription = `Purchase: ${product.name}`;
    }

    if (!payAmount || payAmount <= 0) {
      return res.status(400).json({ error: 'Invalid payment amount' });
    }

    // Check sufficient balance
    if (card.balance < payAmount) {
      return res.status(400).json({
        error: 'Insufficient balance',
        currentBalance: card.balance,
        required: payAmount,
        shortfall: payAmount - card.balance
      });
    }

    const balanceBefore = card.balance;

    // Deduct amount
    card.balance -= payAmount;
    card.updatedAt = Date.now();
    await card.save();

    // Create transaction record
    const transaction = new Transaction({
      uid: card.uid,
      holderName: card.holderName,
      type: 'debit',
      amount: payAmount,
      balanceBefore: balanceBefore,
      balanceAfter: card.balance,
      description: payDescription,
      terminalId: req.body.terminalId || 'MOBILE_TERM_01'
    });
    await transaction.save();

    // Publish to MQTT so ESP8266 updates
    const payload = JSON.stringify({
      uid,
      amount: card.balance,
      deducted: payAmount,
      description: payDescription,
      status: 'success'
    });
    mqttClient.publish(TOPIC_PAYMENT, payload, (err) => {
      if (err) {
        console.error('Failed to publish payment:', err);
      }
      console.log(`Published payment for ${uid} (${card.holderName}): -$${payAmount.toFixed(2)}, balance: $${card.balance.toFixed(2)}`);
    });

    // Emit real-time update via WebSocket
    io.emit('payment-success', {
      uid: card.uid,
      holderName: card.holderName,
      amount: payAmount,
      balanceBefore,
      balanceAfter: card.balance,
      description: payDescription,
      timestamp: transaction.timestamp
    });

    res.json({
      success: true,
      message: 'Payment successful',
      card: {
        uid: card.uid,
        holderName: card.holderName,
        balance: card.balance
      },
      transaction: {
        id: transaction._id,
        type: 'debit',
        amount: payAmount,
        balanceBefore,
        balanceAfter: card.balance,
        description: payDescription,
        timestamp: transaction.timestamp
      }
    });
  } catch (err) {
    console.error('Payment error:', err);
    res.status(500).json({ error: 'Payment processing failed' });
  }
});

// Products catalog endpoint
app.get('/products', (req, res) => {
  res.json(PRODUCTS);
});

// Set passcode for a card
app.post('/card/:uid/set-passcode', authenticateToken, async (req, res) => {
  const { passcode } = req.body;

  if (!passcode || !/^\d{6}$/.test(passcode)) {
    return res.status(400).json({ error: 'Passcode must be exactly 6 digits' });
  }

  try {
    const card = await Card.findOne({ uid: req.params.uid });
    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    if (card.passcodeSet) {
      return res.status(400).json({ error: 'Passcode already set. Use change-passcode endpoint to update.' });
    }

    card.passcode = await hashPasscode(passcode);
    card.passcodeSet = true;
    card.updatedAt = Date.now();
    await card.save();

    res.json({
      success: true,
      message: 'Passcode set successfully',
      passcodeSet: true
    });
  } catch (err) {
    console.error('Set passcode error:', err);
    res.status(500).json({ error: 'Failed to set passcode' });
  }
});

// Change passcode (requires old passcode)
app.post('/card/:uid/change-passcode', authenticateToken, async (req, res) => {
  const { oldPasscode, newPasscode } = req.body;

  if (!oldPasscode || !newPasscode) {
    return res.status(400).json({ error: 'Both old and new passcodes are required' });
  }

  if (!/^\d{6}$/.test(newPasscode)) {
    return res.status(400).json({ error: 'New passcode must be exactly 6 digits' });
  }

  try {
    const card = await Card.findOne({ uid: req.params.uid });
    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    if (!card.passcodeSet) {
      return res.status(400).json({ error: 'No passcode set. Use set-passcode endpoint first.' });
    }

    const isValid = await verifyPasscode(oldPasscode, card.passcode);
    if (!isValid) {
      return res.status(401).json({ error: 'Incorrect old passcode' });
    }

    card.passcode = await hashPasscode(newPasscode);
    card.updatedAt = Date.now();
    await card.save();

    res.json({
      success: true,
      message: 'Passcode changed successfully'
    });
  } catch (err) {
    console.error('Change passcode error:', err);
    res.status(500).json({ error: 'Failed to change passcode' });
  }
});

// Verify passcode
app.post('/card/:uid/verify-passcode', authenticateToken, async (req, res) => {
  const { passcode } = req.body;

  if (!passcode || !/^\d{6}$/.test(passcode)) {
    return res.status(400).json({ error: 'Passcode must be exactly 6 digits', valid: false });
  }

  try {
    const card = await Card.findOne({ uid: req.params.uid });
    if (!card) {
      return res.status(404).json({ error: 'Card not found', valid: false });
    }

    if (!card.passcodeSet) {
      return res.status(400).json({ error: 'No passcode set for this card', valid: false });
    }

    const isValid = await verifyPasscode(passcode, card.passcode);

    if (isValid) {
      res.json({
        success: true,
        valid: true,
        message: 'Passcode verified'
      });
    } else {
      res.status(401).json({
        error: 'Incorrect passcode',
        valid: false
      });
    }
  } catch (err) {
    console.error('Verify passcode error:', err);
    res.status(500).json({ error: 'Failed to verify passcode', valid: false });
  }
});

// Get card details
app.get('/card/:uid', async (req, res) => {
  try {
    const card = await Card.findOne({ uid: req.params.uid });
    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }
    res.json(card);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Database operation failed' });
  }
});

// Get all cards
app.get('/cards', async (req, res) => {
  try {
    const cards = await Card.find().sort({ updatedAt: -1 });
    res.json(cards);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Database operation failed' });
  }
});

// Get transaction history for a specific card
app.get('/transactions/:uid', async (req, res) => {
  try {
    const transactions = await Transaction.find({ uid: req.params.uid })
      .sort({ timestamp: -1 })
      .limit(50); // Limit to last 50 transactions
    res.json(transactions);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Database operation failed' });
  }
});

// Get all transactions (optional - for admin view)
app.get('/transactions', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const transactions = await Transaction.find()
      .sort({ timestamp: -1 })
      .limit(limit);
    res.json(transactions);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Database operation failed' });
  }
});

// Socket connectivity
io.on('connection', (socket) => {
  console.log('User connected to the dashboard');

  // Immediately sync the current MQTT status with the newly connected mobile client
  socket.emit('system-status', { type: 'mqtt', status: isMqttConnected });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// Initialize Default Users
async function initDefaultUsers() {
  const defaultAgent = {
    username: 'agent01',
    password: 'admin111',
    role: 'agent',
    name: 'Main Agent',
    terminalId: 'AGENT_TERM_01'
  };

  const defaultSales = {
    username: 'sales01',
    password: 'pos222',
    role: 'sales',
    name: 'Sales Point 1',
    terminalId: 'SALES_TERM_01'
  };

  const users = [defaultAgent, defaultSales];

  for (const userData of users) {
    const existing = await User.findOne({ username: userData.username });
    if (!existing) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const user = new User({ ...userData, password: hashedPassword });
      await user.save();
      console.log(`Default user created: ${userData.username}`);
    }
  }
}

server.listen(PORT, '0.0.0.0', async () => {
  await initDefaultUsers();
  console.log(`Backend server running on http://0.0.0.0:${PORT}`);
  console.log(`Access from: http://157.173.101.159:${PORT}`);
});

