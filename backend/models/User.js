const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  name: { type: String, trim: true },
  avatar: { type: String, trim: true },
  savedAreas: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ParkingArea' }],
  createdAt: { type: Date, default: Date.now },
})

module.exports = mongoose.model('User', userSchema)
