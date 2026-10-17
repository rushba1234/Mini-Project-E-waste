const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'ewaste_secret_key_123';

const isValidPhone = (phone) => {
  if (!phone || typeof phone !== 'string') return false;
  return /^\d{10}$/.test(phone.trim());
};

// @route   POST api/auth/register
// @desc    Register a user
// @access  Public
router.post('/register', async (req, res) => {
  const { name, email, password, role, phone, address } = req.body;

  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    if (!phone || !isValidPhone(phone)) {
      return res.status(400).json({ msg: 'Please enter a valid 10-digit phone number.' });
    }
    const cleanPhone = phone.trim();
    const allUsers = await User.find({});
    const existingPhone = (await User.findOne({ phone: cleanPhone })) || allUsers.find(u => u.phone && u.phone.trim() === cleanPhone);
    if (existingPhone) {
      return res.status(400).json({ msg: 'Phone number already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || 'user',
      phone: cleanPhone,
      address: address || '',
      ecoPoints: 0
    });

    const payload = {
      user: {
        id: user._id,
        role: user.role
      }
    };

    jwt.sign(
      payload,
      JWT_SECRET,
      { expiresIn: 360000 },
      (err, token) => {
        if (err) throw err;
        res.json({ 
          token, 
          user: { 
            id: user._id, 
            name: user.name, 
            email: user.email, 
            role: user.role, 
            phone: user.phone,
            address: user.address,
            ecoPoints: user.ecoPoints 
          } 
        });
      }
    );
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    const payload = {
      user: {
        id: user._id,
        role: user.role
      }
    };

    jwt.sign(
      payload,
      JWT_SECRET,
      { expiresIn: 360000 },
      (err, token) => {
        if (err) throw err;
        res.json({ 
          token, 
          user: { 
            id: user._id, 
            name: user.name, 
            email: user.email, 
            role: user.role, 
            phone: user.phone || '',
            address: user.address || '',
            ecoPoints: user.ecoPoints 
          } 
        });
      }
    );
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).send('Server error');
  }
});

const toPlainUser = (u) => {
  if (!u) return null;
  const obj = u.toObject ? u.toObject() : { ...u };
  delete obj.password;
  delete obj.save;
  return obj;
};

// @route   GET api/auth/user
// @desc    Get logged in user
// @access  Private
router.get('/user', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.json(toPlainUser(user));
  } catch (err) {
    console.error('Get user error:', err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/auth/profile
// @desc    Update profile details
// @access  Private
router.put('/profile', auth, async (req, res) => {
  const { name, phone, address } = req.body;
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    if (name) user.name = name;
    if (phone !== undefined) {
      if (!isValidPhone(phone)) {
        return res.status(400).json({ msg: 'Please enter a valid 10-digit phone number.' });
      }
      const existingPhone = await User.findOne({ phone: phone.trim() });
      if (existingPhone && String(existingPhone._id) !== String(req.user.id)) {
        return res.status(400).json({ msg: 'Phone number already exists.' });
      }
      user.phone = phone.trim();
    }
    if (address !== undefined) user.address = address;

    await user.save();

    res.json(toPlainUser(user));
  } catch (err) {
    console.error('Update profile error:', err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/auth/redeem
// @desc    Redeem points for user
// @access  Private
router.post('/redeem', auth, async (req, res) => {
  const { points } = req.body;
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    if ((user.ecoPoints || 0) < points) {
      return res.status(400).json({ msg: 'Insufficient points balance' });
    }

    user.ecoPoints = (user.ecoPoints || 0) - points;
    await user.save();

    res.json(toPlainUser(user));
  } catch (err) {
    console.error('Redeem points error:', err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/auth/staff
// @desc    Get all staff members (Admin/Staff)
// @access  Private
router.get('/staff', auth, async (req, res) => {
  try {
    const allUsers = await User.find({ role: 'staff' });
    const staffList = allUsers.map(toPlainUser);
    res.json(staffList);
  } catch (err) {
    console.error('Get staff error:', err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/auth/staff
// @desc    Register a new staff member (Admin only)
// @access  Private
router.post('/staff', auth, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ msg: 'Access denied. Admin only.' });
  }
  const { name, email, password, phone, address } = req.body;
  try {
    let existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ msg: 'Account with this email already exists' });
    }

    if (!phone || !isValidPhone(phone)) {
      return res.status(400).json({ msg: 'Please enter a valid 10-digit phone number.' });
    }
    const cleanPhone = phone.trim();
    const allUsers = await User.find({});
    const existingPhone = (await User.findOne({ phone: cleanPhone })) || allUsers.find(u => u.phone && u.phone.trim() === cleanPhone);
    if (existingPhone) {
      return res.status(400).json({ msg: 'Phone number already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password || 'staff123', salt);

    const staffMember = await User.create({
      name,
      email,
      password: hashedPassword,
      role: 'staff',
      phone: cleanPhone,
      address: address || '',
      ecoPoints: 0
    });

    res.json(toPlainUser(staffMember));
  } catch (err) {
    console.error('Create staff error:', err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/auth/users
// @desc    Get all citizen users (Admin only)
// @access  Private
router.get('/users', auth, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ msg: 'Access denied. Admin only.' });
  }
  try {
    const users = await User.find({});
    const citizenUsers = users
      .filter(u => u.role === 'user' || u.role === 'citizen' || !u.role)
      .map(toPlainUser);
    res.json(citizenUsers);
  } catch (err) {
    console.error('Get users error:', err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE api/auth/users/:id
// @desc    Delete a user or staff member (Admin only)
// @access  Private
router.delete('/users/:id', auth, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ msg: 'Access denied. Admin only.' });
  }
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ msg: 'User account removed' });
  } catch (err) {
    console.error('Delete user error:', err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
