const mongoose = require('mongoose');

const WarehouseSchema = new mongoose.Schema({
  batchCode: { type: String, required: true },
  itemCount: { type: Number, default: 0 },
  totalWeight: { type: Number, default: 0 },
  requestIds: [{ type: String }],
  status: { 
    type: String, 
    enum: ['stored', 'contacted_recycler', 'recycled'], 
    default: 'stored' 
  },
  recyclingCentre: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  recycledAt: { type: Date }
});

const MongoWarehouse = mongoose.model('Warehouse', WarehouseSchema);

const WarehouseModel = {
  find: async (query) => {
    return global.dbMode === 'json' ? global.mocks.Warehouse.find(query) : MongoWarehouse.find(query);
  },
  findOne: async (query) => {
    return global.dbMode === 'json' ? global.mocks.Warehouse.findOne(query) : MongoWarehouse.findOne(query);
  },
  findById: async (id) => {
    return global.dbMode === 'json' ? global.mocks.Warehouse.findById(id) : MongoWarehouse.findById(id);
  },
  create: async (doc) => {
    return global.dbMode === 'json' ? global.mocks.Warehouse.create(doc) : MongoWarehouse.create(doc);
  },
  findByIdAndUpdate: async (id, update, options) => {
    return global.dbMode === 'json' ? global.mocks.Warehouse.findByIdAndUpdate(id, update, options) : MongoWarehouse.findByIdAndUpdate(id, update, options);
  }
};

module.exports = WarehouseModel;
