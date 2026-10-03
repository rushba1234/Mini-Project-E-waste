const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const dns = require('dns');

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Ignore if DNS server override is restricted
}

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// In-memory/JSON-file database mock helper
function readJsonFile(filename) {
  const filepath = path.join(dataDir, filename);
  if (!fs.existsSync(filepath)) {
    fs.writeFileSync(filepath, JSON.stringify([], null, 2));
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
  } catch (e) {
    return [];
  }
}

function writeJsonFile(filename, data) {
  const filepath = path.join(dataDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
}

class MockModel {
  constructor(filename) {
    this.filename = filename;
  }
  
  async find(query = {}) {
    let data = readJsonFile(this.filename);
    const self = this;
    return data.filter(item => {
      for (let key in query) {
        if (String(item[key]) !== String(query[key])) return false;
      }
      return true;
    }).map(item => {
      const resObj = { ...item };
      resObj.save = async function() { return self.saveItem(this); };
      return resObj;
    });
  }

  async findOne(query = {}) {
    let data = readJsonFile(this.filename);
    const item = data.find(item => {
      for (let key in query) {
        if (String(item[key]) !== String(query[key])) return false;
      }
      return true;
    });
    if (!item) return null;
    const self = this;
    const resObj = { ...item };
    resObj.save = async function() { return self.saveItem(this); };
    return resObj;
  }

  async findById(id) {
    let data = readJsonFile(this.filename);
    const item = data.find(item => String(item._id) === String(id));
    if (!item) return null;
    const self = this;
    const resObj = { ...item };
    resObj.save = async function() { return self.saveItem(this); };
    return resObj;
  }

  async create(doc) {
    let data = readJsonFile(this.filename);
    const newDoc = { _id: Math.random().toString(36).substr(2, 9), ...doc, createdAt: new Date() };
    data.push(newDoc);
    writeJsonFile(this.filename, data);
    const self = this;
    const resObj = { ...newDoc };
    resObj.save = async function() { return self.saveItem(this); };
    return resObj;
  }

  async findByIdAndUpdate(id, update, options = {}) {
    let data = readJsonFile(this.filename);
    let index = data.findIndex(item => String(item._id) === String(id));
    if (index === -1) return null;
    
    let updatedDoc = { ...data[index], ...update };
    data[index] = updatedDoc;
    writeJsonFile(this.filename, data);
    const self = this;
    const resObj = { ...updatedDoc };
    resObj.save = async function() { return self.saveItem(this); };
    return resObj;
  }

  async findByIdAndDelete(id) {
    let data = readJsonFile(this.filename);
    let index = data.findIndex(item => String(item._id) === String(id));
    if (index === -1) return null;
    let deleted = data.splice(index, 1)[0];
    writeJsonFile(this.filename, data);
    return deleted;
  }

  async saveItem(item) {
    let data = readJsonFile(this.filename);
    let cleanItem = { ...item };
    delete cleanItem.save;
    let index = data.findIndex(d => String(d._id) === String(cleanItem._id));
    if (index === -1) {
      data.push(cleanItem);
    } else {
      data[index] = cleanItem;
    }
    writeJsonFile(this.filename, data);
    return item;
  }
}

global.dbMode = 'mongodb';
global.mocks = {
  User: new MockModel('users.json'),
  PickupRequest: new MockModel('pickups.json'),
  Center: new MockModel('centers.json'),
  Warehouse: new MockModel('warehouse.json')
};

const connectDB = async () => {
  const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ewaste_collection';
  try {
    console.log('Connecting to MongoDB at:', mongoURI);
    // Give enough timeout for local or Atlas cloud MongoDB connection
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000
    });
    console.log('MongoDB Connected successfully!');
    global.dbMode = 'mongodb';
  } catch (err) {
    console.error('MongoDB connection failed. Switching to JSON File-based database fallback.');
    console.log('Ensure MongoDB is installed and running locally to use real MongoDB.');
    global.dbMode = 'json';
  }
};

module.exports = { connectDB };
