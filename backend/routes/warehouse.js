const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
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
    res.status(500).json({ msg: 'Server error fetching warehouse records' });
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
    let batch = null;

    // 1. If batchId provided, try finding by ID (only if valid ObjectId in Mongo mode) or by batchCode
    if (batchId) {
      if (global.dbMode === 'json' || mongoose.Types.ObjectId.isValid(batchId)) {
        batch = await Warehouse.findById(batchId);
      }
      if (!batch) {
        batch = await Warehouse.findOne({ batchCode: batchId });
      }
    }

    // 2. If no batch found by batchId, fallback to finding the first active 'stored' batch
    if (!batch) {
      batch = await Warehouse.findOne({ status: 'stored' });
    }

    // 3. If no stored batch object exists, auto-package any pickup requests currently in 'warehouse' status
    if (!batch) {
      const warehouseRequests = await PickupRequest.find({ status: 'warehouse' });
      if (warehouseRequests.length > 0) {
        const totalWeight = warehouseRequests.reduce((acc, r) => acc + (r.weight || 0), 0);
        const reqIds = warehouseRequests.map(r => r._id);
        const code = `WH-BATCH-${Math.floor(1000 + Math.random() * 9000)}`;
        batch = await Warehouse.create({
          batchCode: code,
          itemCount: warehouseRequests.length,
          totalWeight: totalWeight,
          requestIds: reqIds,
          status: 'stored'
        });
      }
    }

    if (!batch) {
      return res.status(404).json({ msg: 'No active warehouse batch or items available for recycling dispatch.' });
    }

    batch.status = 'recycled';
    batch.recyclingCentre = recyclingCentre || 'GreenTech Recycling Hub';
    batch.recycledAt = new Date();
    await batch.save();

    // Update all pickup requests associated with this batch
    if (batch.requestIds && batch.requestIds.length > 0) {
      for (const reqId of batch.requestIds) {
        let pickup = null;
        if (global.dbMode === 'json' || mongoose.Types.ObjectId.isValid(reqId)) {
          pickup = await PickupRequest.findById(reqId);
        }
        if (!pickup) {
          pickup = await PickupRequest.findOne({ _id: reqId });
        }

        if (pickup && pickup.status !== 'recycled') {
          pickup.status = 'recycled';
          if (pickup.pointsAwarded === 0) {
            const pts = Math.round((pickup.weight || 0) * 10);
            pickup.pointsAwarded = pts;

            if (pickup.user) {
              let u = null;
              if (global.dbMode === 'json' || mongoose.Types.ObjectId.isValid(pickup.user)) {
                u = await User.findById(pickup.user);
              }
              if (!u) {
                u = await User.findOne({ _id: pickup.user });
              }
              if (u) {
                u.ecoPoints = (u.ecoPoints || 0) + pts;
                await u.save();
              }
            }
          }
          await pickup.save();
        }
      }
    }

    // Fallback: update any remaining requests currently in status 'warehouse'
    const warehouseRequests = await PickupRequest.find({ status: 'warehouse' });
    for (const pickup of warehouseRequests) {
      pickup.status = 'recycled';
      if (pickup.pointsAwarded === 0) {
        const pts = Math.round((pickup.weight || 0) * 10);
        pickup.pointsAwarded = pts;

        if (pickup.user) {
          let u = null;
          if (global.dbMode === 'json' || mongoose.Types.ObjectId.isValid(pickup.user)) {
            u = await User.findById(pickup.user);
          }
          if (!u) {
            u = await User.findOne({ _id: pickup.user });
          }
          if (u) {
            u.ecoPoints = (u.ecoPoints || 0) + pts;
            await u.save();
          }
        }
      }
      await pickup.save();
    }

    res.json({ msg: `Batch ${batch.batchCode} successfully dispatched to ${batch.recyclingCentre} for recycling!`, batch });
  } catch (err) {
    console.error('Dispatch warehouse batch error:', err);
    res.status(500).json({ msg: err.message || 'Server error during dispatch' });
  }
});

module.exports = router;
