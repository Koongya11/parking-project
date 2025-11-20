const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String },
  name: { type: String, trim: true },
  nickname: { type: String, trim: true, unique: true, sparse: true },
  avatar: { type: String, trim: true },
  provider: { type: String, enum: ['local', 'google'], default: 'local' },
  googleId: { type: String, index: true },
  savedAreas: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ParkingArea' }],
  createdAt: { type: Date, default: Date.now },
  lastLoginAt: { type: Date },
})

module.exports = mongoose.model('User', userSchema)
