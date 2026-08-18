const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const { connectDB } = require('./config/db');

// Load models to register schemas and trigger fallbacks
const User = require('./models/User');
const Center = require('./models/Center');
const PickupRequest = require('./models/PickupRequest');
const Warehouse = require('./models/Warehouse');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/pickups', require('./routes/pickups'));
app.use('/api/centers', require('./routes/centers'));
app.use('/api/warehouse', require('./routes/warehouse'));

// Live Global Statistics Endpoint
app.get('/api/stats', async (req, res) => {
  try {
    const allRequests = await PickupRequest.find({});
    const allCenters = await Center.find({});

    const totalWeightRecycled = allRequests
      .filter(r => r.status === 'recycled')
      .reduce((acc, r) => acc + (r.weight || 0), 0);

    const totalPointsAwarded = allRequests
      .reduce((acc, r) => acc + (r.pointsAwarded || 0), 0);

    const completedPickups = allRequests
      .filter(r => r.status === 'collected' || r.status === 'warehouse' || r.status === 'recycled').length;

    res.json({
      totalWeightRecycled,
      totalPickups: allRequests.length,
      completedPickups,
      totalPointsAwarded,
      activeCenters: allCenters.length
    });
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Root Endpoint
app.get('/', (req, res) => {
  res.json({ message: 'E-Waste Collection API is running...', databaseMode: global.dbMode });
});

// Seed Initial Setup (Centers, Admin, and Staff)
async function seedInitialSetup() {
  try {
    // Seed Collection Centers if none exist
    const centers = await Center.find({});
    if (centers.length === 0) {
      const seedCenters = [
        {
          name: 'GreenTech Recycling Hub',
          address: 'Building 12, Tech Park Avenue, Kakkanad, Kochi',
          operatingHours: 'Mon - Sat: 9:00 AM - 6:00 PM',
          phone: '+91 98765 43210',
          coordinates: { lat: 10.0159, lng: 76.3419 }
        },
        {
          name: 'Eco-Cycle E-Waste Point',
          address: 'MG Road, Near Metro Station, Ernakulam',
          operatingHours: 'Mon - Fri: 10:00 AM - 7:00 PM',
          phone: '+91 98765 43211',
          coordinates: { lat: 9.9763, lng: 76.2798 }
        },
        {
          name: 'Global Electronic Waste Depot',
          address: 'Industrial Area, Phase II, Kalamassery',
          operatingHours: 'Mon - Sat: 8:00 AM - 5:00 PM',
          phone: '+91 98765 43212',
          coordinates: { lat: 10.0543, lng: 76.3218 }
        }
      ];

      for (const c of seedCenters) {
        await Center.create(c);
      }
    }

    // Seed default system admin account if no admin exists
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      await User.create({
        name: 'Eco Admin',
        email: 'admin@ewaste.com',
        password: hashedPassword,
        role: 'admin',
        phone: '+91 98765 00000',
        ecoPoints: 0
      });
      console.log('System Admin account created (admin@ewaste.com / admin123)');
    }

    // Seed default staff account if no staff exists
    const staffUser = await User.findOne({ role: 'staff' });
    if (!staffUser) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('staff123', salt);
      await User.create({
        name: 'Alex Staff',
        email: 'staff@ewaste.com',
        password: hashedPassword,
        role: 'staff',
        phone: '+91 98765 99999',
        ecoPoints: 0
      });
      console.log('Default Staff account created (staff@ewaste.com / staff123)');
    }
  } catch (err) {
    console.error('Error during initial setup:', err.message);
  }
}

const PORT = process.env.PORT || 5001;

connectDB().then(() => {
  seedInitialSetup().then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT} in ${global.dbMode} database mode.`);
    });
  });
});
