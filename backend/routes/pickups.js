const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const PickupRequest = require('../models/PickupRequest');
const User = require('../models/User');
const Warehouse = require('../models/Warehouse');

const isValidPhone = (phone) => {
  if (!phone || typeof phone !== 'string') return false;
  return /^\d{10}$/.test(phone.trim());
};

const isValidFutureDate = (dateStr) => {
  if (!dateStr) return false;
  const selectedDate = new Date(dateStr);
  if (isNaN(selectedDate.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(selectedDate);
  checkDate.setHours(0, 0, 0, 0);

  return checkDate >= today;
};

// @route   POST api/pickups
// @desc    Create a pickup request (User)
// @access  Private
router.post('/', auth, async (req, res) => {
  const { category, description, weight, address, pickupDate, userPhone } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    const phoneToValidate = userPhone || user.phone || '';
    if (!phoneToValidate || !isValidPhone(phoneToValidate)) {
      return res.status(400).json({ msg: 'Please enter a valid 10-digit phone number.' });
    }

    if (!pickupDate || isNaN(new Date(pickupDate).getTime())) {
      return res.status(400).json({ msg: 'Please provide a valid pickup date.' });
    }

    if (!isValidFutureDate(pickupDate)) {
      return res.status(400).json({ msg: 'Pickup date cannot be in the past. Please select today or a future date.' });
    }

    const newRequest = await PickupRequest.create({
      user: req.user.id,
      userName: user.name,
      userPhone: phoneToValidate,
      category,
      description,
      weight: Number(weight),
      address: address || user.address || '',
      pickupDate,
      status: 'pending',
      pointsAwarded: 0
    });

    res.json(newRequest);
  } catch (err) {
    console.error('Create pickup error:', err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/pickups
// @desc    Get pickup requests (Admin gets all, Staff gets assigned only, User gets own)
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    let requests;
    if (req.user.role === 'admin') {
      requests = await PickupRequest.find({});
    } else if (req.user.role === 'staff') {
      // Staff receives ONLY requests assigned to them specifically by Admin
      const all = await PickupRequest.find({});
      requests = all.filter(r => r.assignedStaff && String(r.assignedStaff) === String(req.user.id));
    } else {
      const allUserRequests = await PickupRequest.find({});
      requests = allUserRequests.filter(r => String(r.user) === String(req.user.id));
    }
    requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(requests);
  } catch (err) {
    console.error('Get pickups error:', err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/pickups/feedback
// @desc    Get all user feedback (Admin only)
// @access  Private
router.get('/feedback', auth, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ msg: 'Authorization denied. Admin role required.' });
  }
  try {
    const allRequests = await PickupRequest.find({});
    const feedbackList = allRequests
      .filter(r => r.feedback && (r.feedback.comment || r.feedback.rating > 0))
      .map(r => ({
        requestId: r._id,
        userName: r.userName,
        userPhone: r.userPhone || '',
        category: r.category,
        rating: r.feedback.rating || 0,
        message: r.feedback.comment || '',
        comment: r.feedback.comment || '',
        date: r.feedback.date || r.createdAt
      }));
    feedbackList.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(feedbackList);
  } catch (err) {
    console.error('Get feedback error:', err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/pickups/:id/verify
// @desc    Verify pickup request (Admin only)
// @access  Private
router.put('/:id/verify', auth, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ msg: 'Authorization denied. Admin role required.' });
  }
  try {
    let pickup = await PickupRequest.findById(req.params.id);
    if (!pickup) return res.status(404).json({ msg: 'Pickup request not found' });
    
    pickup.status = 'verified';
    await pickup.save();
    res.json(pickup);
  } catch (err) {
    console.error('Verify pickup error:', err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/pickups/:id/assign
// @desc    Assign pickup request to staff member (Admin only)
// @access  Private
router.put('/:id/assign', auth, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ msg: 'Authorization denied. Admin role required.' });
  }

  const { staffId, staffName } = req.body;
  try {
    let pickup = await PickupRequest.findById(req.params.id);
    if (!pickup) return res.status(404).json({ msg: 'Pickup request not found' });

    // Restrict staff assignment: admin assigns a staff member ONLY ONCE. Reassignment is not allowed.
    if (pickup.assignedStaff) {
      return res.status(400).json({ msg: 'Staff member has already been assigned and cannot be reassigned.' });
    }

    let staffUser = null;
    if (staffId) {
      staffUser = await User.findById(staffId);
    }

    pickup.assignedStaff = staffId || (staffUser ? staffUser._id : null);
    pickup.assignedStaffName = staffName || (staffUser ? staffUser.name : 'Staff');
    pickup.status = 'assigned';

    await pickup.save();
    res.json(pickup);
  } catch (err) {
    console.error('Assign pickup error:', err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/pickups/:id/collect
// @desc    Collect e-waste from user (Staff or Admin)
// @access  Private
router.put('/:id/collect', auth, async (req, res) => {
  if (req.user.role !== 'staff' && req.user.role !== 'admin') {
    return res.status(403).json({ msg: 'Staff or Admin role required.' });
  }

  try {
    let pickup = await PickupRequest.findById(req.params.id);
    if (!pickup) return res.status(404).json({ msg: 'Pickup request not found' });

    pickup.status = 'collected';
    await pickup.save();
    res.json(pickup);
  } catch (err) {
    console.error('Collect pickup error:', err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/pickups/:id/warehouse
// @desc    Transport collected e-waste to temporary warehouse (Staff or Admin)
// @access  Private
router.put('/:id/warehouse', auth, async (req, res) => {
  if (req.user.role !== 'staff' && req.user.role !== 'admin') {
    return res.status(403).json({ msg: 'Staff or Admin role required.' });
  }

  try {
    let pickup = await PickupRequest.findById(req.params.id);
    if (!pickup) return res.status(404).json({ msg: 'Pickup request not found' });

    pickup.status = 'warehouse';
    await pickup.save();

    // Create or append to active warehouse batch
    let batch = await Warehouse.findOne({ status: 'stored' });
    if (!batch) {
      const code = `WH-BATCH-${Math.floor(1000 + Math.random() * 9000)}`;
      batch = await Warehouse.create({
        batchCode: code,
        itemCount: 1,
        totalWeight: pickup.weight,
        requestIds: [pickup._id],
        status: 'stored'
      });
    } else {
      batch.itemCount = (batch.itemCount || 0) + 1;
      batch.totalWeight = (batch.totalWeight || 0) + pickup.weight;
      if (!batch.requestIds) batch.requestIds = [];
      if (!batch.requestIds.includes(pickup._id)) {
        batch.requestIds.push(pickup._id);
      }
      await batch.save();
    }

    pickup.warehouseBatchId = batch.batchCode;
    await pickup.save();

    res.json(pickup);
  } catch (err) {
    console.error('Warehouse transfer error:', err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/pickups/:id/feedback
// @desc    Provide feedback for pickup (User)
// @access  Private
router.post('/:id/feedback', auth, async (req, res) => {
  const { rating, comment } = req.body;
  try {
    let pickup = await PickupRequest.findById(req.params.id);
    if (!pickup) return res.status(404).json({ msg: 'Pickup request not found' });

    pickup.feedback = {
      rating: Number(rating) || 5,
      comment: comment || '',
      date: new Date()
    };

    await pickup.save();
    res.json(pickup);
  } catch (err) {
    console.error('Feedback submission error:', err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/pickups/:id/status
// @desc    Update request status & award eco-points if recycled (Admin)
// @access  Private
router.put('/:id/status', auth, async (req, res) => {
  const { status } = req.body;

  try {
    let pickup = await PickupRequest.findById(req.params.id);
    if (!pickup) {
      return res.status(404).json({ msg: 'Pickup request not found' });
    }

    const oldStatus = pickup.status;
    pickup.status = status;

    // If changing to 'recycled' and not already awarded points
    if (status === 'recycled' && oldStatus !== 'recycled' && pickup.pointsAwarded === 0) {
      const points = Math.round(pickup.weight * 10); // 10 points per kg
      pickup.pointsAwarded = points;

      // Award points to the user
      const user = await User.findById(pickup.user);
      if (user) {
        user.ecoPoints = (user.ecoPoints || 0) + points;
        await user.save();
      }
    }

    await pickup.save();
    res.json(pickup);
  } catch (err) {
    console.error('Update pickup status error:', err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
