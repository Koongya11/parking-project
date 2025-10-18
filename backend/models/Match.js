const mongoose = require('mongoose')

const matchSchema = new mongoose.Schema({
  category: { type: String, enum: ['football','baseball','basketball','volleyball'], required: true },
  league: { type: String, required: true },
  homeTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  awayTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  stadium: { type: mongoose.Schema.Types.ObjectId, ref: 'Stadium' },
  startAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
})

matchSchema.index({ category: 1, startAt: 1 })

module.exports = mongoose.model('Match', matchSchema)

