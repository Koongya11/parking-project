const mongoose = require('mongoose')

const stadiumSchema = new mongoose.Schema({
  category: { type: String, enum: ['football','baseball','basketball','volleyball'], required: true },
  teamName: { type: String, required: true },
  stadiumName: { type: String, required: true },
  city: { type: String, default: '' },
  logoImage: { type: String, default: '' },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [126.9786567, 37.566826] },
  },
  parkingAreaIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ParkingArea' }],
  createdAt: { type: Date, default: Date.now },
})

stadiumSchema.index({ location: '2dsphere' })
stadiumSchema.index({ category: 1, teamName: 1 })

module.exports = mongoose.model('Stadium', stadiumSchema)

