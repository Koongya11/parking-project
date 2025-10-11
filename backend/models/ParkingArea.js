// backend/models/ParkingArea.js
const mongoose = require('mongoose');

const pointSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Point'],
    default: 'Point'
  },
  coordinates: {
    type: [Number], // [lng, lat] 형식
  }
});

const polygonSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Polygon'],
    required: true
  },
  coordinates: {
    type: [[[Number]]], // [[lng, lat], [lng, lat], ...] 형식
    required: true
  }
});

const parkingAreaSchema = new mongoose.Schema({
  category: { type: String, required: true },
  stadiumName: { type: String, required: true },
  title: { type: String, required: true },
  polygon: {
    type: polygonSchema,
    required: true,
  },
  successCount: { type: Number, default: 0 },
  failureCount: { type: Number, default: 0 },
  abandonCount: { type: Number, default: 0 },   // 네비를 바로 끈 경우
  upvoteCount: { type: Number, default: 0 },    // 
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('ParkingArea', parkingAreaSchema);