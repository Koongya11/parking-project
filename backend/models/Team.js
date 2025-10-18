const mongoose = require('mongoose')

const homeStadiumSchema = new mongoose.Schema({
  stadiumId: { type: mongoose.Schema.Types.ObjectId, ref: 'Stadium' },
  name: { type: String, required: true },
  city: { type: String, default: '' },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      default: [126.9786567, 37.566826],
    },
  },
  logoImage: { type: String, default: '' },
}, { _id: false })

const teamSchema = new mongoose.Schema({
  category: { type: String, enum: ['football','baseball','basketball','volleyball'], required: true },
  name: { type: String, required: true },
  shortName: { type: String, default: '' },
  city: { type: String, default: '' },
  logoImage: { type: String, default: '' },
  homeStadium: { type: homeStadiumSchema, required: true },
  createdAt: { type: Date, default: Date.now },
})

teamSchema.index({ category: 1, name: 1 })

module.exports = mongoose.model('Team', teamSchema)
