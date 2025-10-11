const mongoose = require('mongoose')

const stadiumSchema = new mongoose.Schema({
  category: { type: String, enum: ['football','baseball','basketball','volleyball'], required: true },
  teamName: { type: String, required: true },
  stadiumName: { type: String, required: true },
  city: { type: String, default: '' },
  location: {                  // 중심 좌표(길안내용)
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [126.9786567, 37.566826] } // [lng, lat]
  },
  // 향후 연결: 주차구역 ParkingArea 문서들과의 연관을 위한 키(선택)
  parkingAreaIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ParkingArea' }],
  createdAt: { type: Date, default: Date.now },
})

stadiumSchema.index({ location: '2dsphere' })
stadiumSchema.index({ category: 1, teamName: 1 })

module.exports = mongoose.model('Stadium', stadiumSchema)
