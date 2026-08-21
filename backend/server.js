const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = 'plateai-secret-key';
const MONGO_URI = 'mongodb://localhost:27017/plateai';

// Connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// --- MONGODB SCHEMAS & MODELS ---
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, default: 'Admin' }
});

const mealSchema = new mongoose.Schema({
  userEmail: { type: String, required: true, lowercase: true, index: true },
  mealId: { type: Number, required: true },
  name: String,
  category: String,
  service: String,
  planned: Number,
  status: String
});

const attendanceSignalSchema = new mongoose.Schema({
  userEmail: { type: String, required: true, lowercase: true, index: true },
  date: String,
  day: String,
  expected: Number,
  context: String,
  meal: String
});

const forecastSchema = new mongoose.Schema({
  userEmail: { type: String, required: true, lowercase: true, unique: true },
  expectedAttendance: Number,
  day: String,
  mealType: String,
  safetyBuffer: Number,
  temperature: Number,
  rainfall: Number,
  holiday: Boolean,
  campusEvent: Boolean,
  weatherContext: {
    temp: Number,
    condition: String,
    rainfall: String,
    humidity: String
  }
});

const surplusSchema = new mongoose.Schema({
  userEmail: { type: String, required: true, lowercase: true, index: true },
  food: { type: String, required: true },
  category: { type: String, required: true },
  quantity: { type: String, required: true },
  storage: { type: String, required: true },
  safetyState: { type: String, default: 'Eligible' },
  action: { type: String, default: 'Ready for matching' },
  prepared: Number,
  consumed: Number,
  prepTime: String,
  storageStart: String,
  temperature: Number,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Meal = mongoose.model('Meal', mealSchema);
const AttendanceSignal = mongoose.model('AttendanceSignal', attendanceSignalSchema);
const Forecast = mongoose.model('Forecast', forecastSchema);
const Surplus = mongoose.model('Surplus', surplusSchema);

// --- AUTH MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// --- ADMIN CHECK MIDDLEWARE ---
const requireAdmin = (req, res, next) => {
  if (!req.user || (req.user.role !== 'Admin' && req.user.role !== 'Admin / Canteen manager')) {
    return res.status(403).json({ error: 'Access denied: Admin role required for modifications' });
  }
  next();
};

// --- ROUTES ---

app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) return res.status(400).json({ error: 'Email already registered.' });

    const newUser = new User({
      name: name || 'Maya Sharma',
      email: email.toLowerCase(),
      password,
      role: role || 'Admin'
    });
    await newUser.save();

    const token = jwt.sign({ id: newUser._id, name: newUser.name, role: newUser.role, email: newUser.email }, JWT_SECRET, { expiresIn: '12h' });
    res.json({ token, user: { name: newUser.name, email: newUser.email, role: newUser.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: (email || '').toLowerCase(), password });
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign({ id: user._id, name: user.name, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '12h' });
    res.json({ token, user: { name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/overview', authenticateToken, async (req, res) => {
  res.json({
    greetingDate: 'WEDNESDAY · 18 MARCH 2026',
    userName: req.user.name,
    roleLabel: req.user.role,
    expectedDemand: '407 meals',
    recommendedPrep: '422 meals',
    actualConsumption: '410 meals',
    safeSurplus: '60 meals',
    signals: [
      { title: '60 meals are ready to share', subtitle: 'A verified surplus is waiting for a recipient.' },
      { title: 'Safety review is part of every handoff', subtitle: 'Keep storage time and temperature current.' }
    ],
    chartDays: [
      { day: 'Thu', predicted: 400, actual: 390 },
      { day: 'Fri', predicted: 430, actual: 425 },
      { day: 'Sat', predicted: 300, actual: 290 },
      { day: 'Mon', predicted: 440, actual: 435 },
      { day: 'Tue', predicted: 410, actual: 400 },
      { day: 'Wed', predicted: 410, actual: 405 }
    ]
  });
});

// GET Forecast: Returns the latest forecast globally or defaults if none exist
app.get('/api/forecast', authenticateToken, async (req, res) => {
  try {
    let forecast = await Forecast.findOne();
    if (!forecast) {
      forecast = new Forecast({
        userEmail: req.user.email,
        expectedAttendance: 438,
        day: 'Wednesday',
        mealType: 'Lunch',
        safetyBuffer: 15,
        temperature: 28,
        rainfall: 0,
        holiday: false,
        campusEvent: false,
        weatherContext: { temp: 28, condition: 'Demo clear weather', rainfall: '0 mm', humidity: '62%' }
      });
      await forecast.save();
    }
    res.json(forecast);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST Forecast: Restricted to Admins only
app.post('/api/forecast', authenticateToken, requireAdmin, async (req, res) => {
  try {
    let forecast = await Forecast.findOne();
    if (!forecast) {
      forecast = new Forecast({ userEmail: req.user.email, ...req.body });
    } else {
      Object.assign(forecast, req.body);
    }
    const updated = await forecast.save();
    res.json({ success: true, forecast: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET Meals: Available to all users (returns all meals saved across the system)
app.get('/api/meals', authenticateToken, async (req, res) => {
  try {
    const meals = await Meal.find({});
    res.json(meals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST Meals: Restricted to Admins only
app.post('/api/meals', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const newMeal = new Meal({
      userEmail: req.user.email,
      mealId: Date.now(),
      ...req.body
    });
    await newMeal.save();
    const meals = await Meal.find({});
    res.json({ success: true, meals });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH Meal status: Restricted to Admins only (Fixed to handle both MongoDB _id and custom mealId)
app.patch('/api/meals/:id/serve', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const idParam = req.params.id;
    let query;

    if (mongoose.Types.ObjectId.isValid(idParam)) {
      query = { _id: idParam };
    } else {
      query = { mealId: Number(idParam) };
    }

    const updatedMeal = await Meal.findOneAndUpdate(query, { status: 'Served' }, { new: true });

    if (!updatedMeal) {
      return res.status(404).json({ error: 'Meal not found' });
    }

    const meals = await Meal.find({});
    res.json({ success: true, meals });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET Attendance Signals: Available to all users
app.get('/api/attendance-signals', authenticateToken, async (req, res) => {
  try {
    const signals = await AttendanceSignal.find({});
    res.json(signals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST Attendance Signals: Restricted to Admins only
app.post('/api/attendance-signals', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const newSignal = new AttendanceSignal({
      userEmail: req.user.email,
      ...req.body
    });
    await newSignal.save();
    const signals = await AttendanceSignal.find({});
    res.json({ success: true, attendanceSignals: signals });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- SURPLUS FOOD & REGISTER ROUTES ---
// GET Surplus: Available to all users so recipients can see active surplus food items
app.get('/api/surplus', authenticateToken, async (req, res) => {
  try {
    const surplusList = await Surplus.find({}).sort({ createdAt: -1 });
    res.json(surplusList);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST Surplus: Restricted to Admins only
app.post('/api/surplus', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const newSurplus = new Surplus({
      userEmail: req.user.email,
      ...req.body
    });
    await newSurplus.save();
    const surplusList = await Surplus.find({}).sort({ createdAt: -1 });
    res.json({ success: true, surplusList });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH Surplus verify: Restricted to Admins only
app.patch('/api/surplus/:id/verify', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const surplusId = req.params.id;
    await Surplus.findOneAndUpdate(
      { _id: surplusId },
      { safetyState: 'Eligible', action: 'Ready for matching', storage: 'Verified safe' }
    );
    const surplusList = await Surplus.find({}).sort({ createdAt: -1 });
    res.json({ success: true, surplusList });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Live Weather API Integration (Open-Meteo)
app.get('/api/weather/live', authenticateToken, async (req, res) => {
  try {
    const lat = req.query.lat || 28.6139;
    const lon = req.query.lon || 77.2090;

    const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code`);
    const data = await response.json();

    if (data && data.current) {
      res.json({
        success: true,
        temperature: Math.round(data.current.temperature_2m),
        humidity: `${data.current.relative_humidity_2m}%`,
        rainfall: `${data.current.precipitation} mm`,
        condition: 'Live open-meteo sync'
      });
    } else {
      throw new Error('Invalid weather provider response');
    }
  } catch (err) {
    res.json({
      success: true,
      temperature: 28,
      humidity: '62%',
      rainfall: '0 mm',
      condition: 'Demo clear weather (offline fallback)'
    });
  }
});

app.listen(5000, () => console.log('Backend running on http://localhost:5000 with MongoDB integration'));