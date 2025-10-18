const ParkingArea = require('../models/ParkingArea')

// GET /api/parking-areas
exports.getParkingAreas = async (_req, res) => {
  try {
    const parkingAreas = await ParkingArea.find({})
    res.json(parkingAreas)
  } catch (error) {
    res.status(500).json({ message: 'Server Error' })
  }
}

// POST /api/parking-areas
exports.createParkingArea = async (req, res) => {
  try {
    const { category, stadiumName, title, polygon } = req.body
    const newParkingArea = await ParkingArea.create({
      category,
      stadiumName,
      title,
      polygon,
    })
    res.status(201).json(newParkingArea)
  } catch (error) {
    res.status(500).json({ message: 'Server Error' })
  }
}

// POST /api/parking-areas/:id/feedback
exports.addFeedback = async (req, res) => {
  try {
    const { type } = req.body
    const parkingArea = await ParkingArea.findById(req.params.id)

    if (!parkingArea) return res.status(404).json({ message: 'Parking area not found' })

    if (type === 'success') {
      parkingArea.successCount = (parkingArea.successCount || 0) + 1
    } else if (type === 'failure') {
      parkingArea.failureCount = (parkingArea.failureCount || 0) + 1
    } else {
      return res.status(400).json({ message: 'Invalid feedback type' })
    }

    const updatedParkingArea = await parkingArea.save()
    res.json(updatedParkingArea)
  } catch (error) {
    res.status(500).json({ message: 'Server Error' })
  }
}

// PUT /api/parking-areas/:id
exports.updateParkingArea = async (req, res) => {
  try {
    const area = await ParkingArea.findById(req.params.id)
    if (!area) return res.status(404).json({ message: 'Parking area not found' })

    const assignIfProvided = (field, transform = v => v) => {
      if (req.body[field] !== undefined) {
        area[field] = transform(req.body[field])
      }
    }

    assignIfProvided('category')
    assignIfProvided('stadiumName')
    assignIfProvided('title')
    assignIfProvided('successCount', Number)
    assignIfProvided('failureCount', Number)
    assignIfProvided('abandonCount', Number)
    assignIfProvided('upvoteCount', Number)

    if (req.body.polygon) area.polygon = req.body.polygon

    const saved = await area.save()
    res.json(saved)
  } catch (error) {
    res.status(500).json({ message: 'Server Error' })
  }
}

// DELETE /api/parking-areas/:id
exports.deleteParkingArea = async (req, res) => {
  try {
    const area = await ParkingArea.findByIdAndDelete(req.params.id)
    if (!area) return res.status(404).json({ message: 'Parking area not found' })
    res.json({ ok: true })
  } catch (error) {
    res.status(500).json({ message: 'Server Error' })
  }
}

