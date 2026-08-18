const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Warehouse = require('../models/Warehouse');
const PickupRequest = require('../models/PickupRequest');
const User = require('../models/User');

// @route   GET api/warehouse
// @desc    Get all warehouse inventory records & summary stats (Admin/Staff)
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const batches = await Warehouse.find({});
    batches.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const totalStoredWeight = batches
      .filter(b => b.status === 'stored' || b.status === 'contacted_recycler')
      .reduce((sum, b) => sum + (b.totalWeight || 0), 0);

    const totalStoredItems = batches
      .filter(b => b.status === 'stored' || b.status === 'contacted_recycler')
      .reduce((sum, b) => sum + (b.itemCount || 0), 0);

    const totalRecycledBatches = batches.filter(b => b.status === 'recycled').length;

    res.json({
      batches,
      totalStoredWeight,
      totalStoredItems,
      totalRecycledBatches
    });
  } catch (err) {
    console.error('Get warehouse records error:', err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/warehouse/dispatch
// @desc    Contact recycling centre & dispatch warehouse batch for recycling (Admin)
// @access  Private
router.post('/dispatch', auth, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ msg: 'Authorization denied. Admin role required.' });
  }

  const { batchId, recyclingCentre } = req.body;

  try {
    let batch = await Warehouse.findById(batchId);
    if (!batch) {
      // If batchId is passed as code, try finding by query
      batch = await Warehouse.findOne({ batchCode: batchId });
    }

    if (!batch) {
      return res.status(404).json({ msg: 'Warehouse batch not found' });
    }

    batch.status = 'recycled';
    batch.recyclingCentre = recyclingCentre || 'GreenTech Recycling Hub';
    batch.recycledAt = new Date();
    await batch.save();

    // Update all pickup requests associated with this batch
    if (batch.requestIds && batch.requestIds.length > 0) {
      for (const reqId of batch.requestIds) {
        const pickup = await PickupRequest.findById(reqId);
        if (pickup && pickup.status !== 'recycled') {
          pickup.status = 'recycled';
          if (pickup.pointsAwarded === 0) {
            const pts = Math.round(pickup.weight * 10);
            pickup.pointsAwarded = pts;

            const u = await User.findById(pickup.user);
            if (u) {
              u.ecoPoints = (u.ecoPoints || 0) + pts;
              await u.save();
            }
          }
          await pickup.save();
        }
      }
    } else {
      // Fallback: update any requests currently in status 'warehouse'
      const warehouseRequests = await PickupRequest.find({ status: 'warehouse' });
      for (const pickup of warehouseRequests) {
        pickup.status = 'recycled';
        if (pickup.pointsAwarded === 0) {
          const pts = Math.round(pickup.weight * 10);
          pickup.pointsAwarded = pts;

          const u = await User.findById(pickup.user);
          if (u) {
            u.ecoPoints = (u.ecoPoints || 0) + pts;
            await u.save();
          }
        }
        await pickup.save();
      }
    }

    res.json({ msg: `Batch ${batch.batchCode} successfully dispatched to ${batch.recyclingCentre} for recycling!`, batch });
  } catch (err) {
    console.error('Dispatch warehouse batch error:', err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
