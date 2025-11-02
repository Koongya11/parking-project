const ParkingArea = require("../models/ParkingArea")
const User = require("../models/User")

const RESET_MINUTES = Number(process.env.CONGESTION_RESET_MINUTES || 3)
const RESET_WINDOW_MS = Number.isFinite(RESET_MINUTES) ? RESET_MINUTES * 60 * 1000 : 0
const DECAY_FACTOR_RAW = Number(process.env.CONGESTION_DECAY_FACTOR || 0.7)
const DECAY_FACTOR =
  Number.isFinite(DECAY_FACTOR_RAW) && DECAY_FACTOR_RAW > 0 && DECAY_FACTOR_RAW < 1
    ? DECAY_FACTOR_RAW
    : 0

const shouldReset = (area) => {
  if (!RESET_WINDOW_MS) return false
  const last = area.congestionLastResetAt || area.congestionLastFeedbackAt || area.updatedAt || area.createdAt
  if (!last) return false
  return Date.now() - new Date(last).getTime() >= RESET_WINDOW_MS
}

// GET /api/parking-areas
exports.getParkingAreas = async (_req, res) => {
  try {
    const parkingAreas = await ParkingArea.find({})
    const updates = []

    parkingAreas.forEach((area) => {
      if (shouldReset(area)) {
        area.congestionScoreSum = 0
        area.congestionScoreCount = 0
        area.congestionLastResetAt = new Date()
        updates.push(area.save())
      }
    })

    if (updates.length > 0) {
      await Promise.allSettled(updates)
    }

    res.json(parkingAreas)
  } catch (error) {
    res.status(500).json({ message: "Server Error" })
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
    res.status(500).json({ message: "Server Error" })
  }
}

// POST /api/parking-areas/:id/feedback
exports.addFeedback = async (req, res) => {
  try {
    const { type, score } = req.body
    const parkingArea = await ParkingArea.findById(req.params.id)

    if (!parkingArea) return res.status(404).json({ message: "Parking area not found" })

    if (shouldReset(parkingArea)) {
      parkingArea.congestionScoreSum = 0
      parkingArea.congestionScoreCount = 0
      parkingArea.congestionLastResetAt = new Date()
    }

    let updated = false

    if (typeof score === "number" && !Number.isNaN(score)) {
      if (score < 0 || score > 5) {
        return res.status(400).json({ message: "Score must be between 0 and 5." })
      }
      const scaled = score * 2
      if (Math.abs(scaled - Math.round(scaled)) > 1e-6) {
        return res.status(400).json({ message: "Score must use 0.5 increments." })
      }
      if (DECAY_FACTOR) {
        parkingArea.congestionScoreSum = (parkingArea.congestionScoreSum || 0) * DECAY_FACTOR
        parkingArea.congestionScoreCount = (parkingArea.congestionScoreCount || 0) * DECAY_FACTOR
      }
      parkingArea.congestionScoreSum = (parkingArea.congestionScoreSum || 0) + score
      parkingArea.congestionScoreCount = (parkingArea.congestionScoreCount || 0) + 1
      parkingArea.congestionLastFeedbackAt = new Date()
      if (!parkingArea.congestionLastResetAt) {
        parkingArea.congestionLastResetAt = new Date()
      }
      updated = true
    }

    if (type) {
      if (type === "success") {
        parkingArea.successCount = (parkingArea.successCount || 0) + 1
        updated = true
      } else if (type === "failure") {
        parkingArea.failureCount = (parkingArea.failureCount || 0) + 1
        updated = true
      } else if (type === "abandon") {
        parkingArea.abandonCount = (parkingArea.abandonCount || 0) + 1
        updated = true
      } else {
        return res.status(400).json({ message: "Invalid feedback type" })
      }
    }

    if (!updated) {
      return res.status(400).json({ message: "No valid feedback payload provided." })
    }

    const updatedParkingArea = await parkingArea.save()
    res.json(updatedParkingArea)
  } catch (error) {
    res.status(500).json({ message: "Server Error" })
  }
}

// POST /api/parking-areas/:id/save
exports.toggleSave = async (req, res) => {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ message: "인증이 필요합니다." })

    const [parkingArea, user] = await Promise.all([
      ParkingArea.findById(req.params.id),
      User.findById(userId),
    ])

    if (!parkingArea) return res.status(404).json({ message: "Parking area not found" })
    if (!user) return res.status(401).json({ message: "User not found" })

    user.savedAreas = user.savedAreas || []
    const alreadySaved = user.savedAreas.some((areaId) => areaId.equals(parkingArea._id))

    if (alreadySaved) {
      user.savedAreas = user.savedAreas.filter((areaId) => !areaId.equals(parkingArea._id))
      parkingArea.upvoteCount = Math.max((parkingArea.upvoteCount || 0) - 1, 0)
    } else {
      user.savedAreas.push(parkingArea._id)
      parkingArea.upvoteCount = (parkingArea.upvoteCount || 0) + 1
    }

    await Promise.all([user.save(), parkingArea.save()])

    res.json({
      area: parkingArea,
      saved: !alreadySaved,
    })
  } catch (error) {
    console.error("toggle save error", error)
    res.status(500).json({ message: "Server Error" })
  }
}

// PUT /api/parking-areas/:id
exports.updateParkingArea = async (req, res) => {
  try {
    const area = await ParkingArea.findById(req.params.id)
    if (!area) return res.status(404).json({ message: "Parking area not found" })

    const assignIfProvided = (field, transform = (v) => v) => {
      if (req.body[field] !== undefined) {
        area[field] = transform(req.body[field])
      }
    }

    assignIfProvided("category")
    assignIfProvided("stadiumName")
    assignIfProvided("title")
    assignIfProvided("successCount", Number)
    assignIfProvided("failureCount", Number)
    assignIfProvided("abandonCount", Number)
    assignIfProvided("upvoteCount", Number)
    assignIfProvided("congestionScoreSum", Number)
    assignIfProvided("congestionScoreCount", Number)
    assignIfProvided("congestionLastResetAt", (value) => (value ? new Date(value) : null))
    assignIfProvided("congestionLastFeedbackAt", (value) => (value ? new Date(value) : null))

    if (req.body.polygon) area.polygon = req.body.polygon

    const saved = await area.save()
    res.json(saved)
  } catch (error) {
    res.status(500).json({ message: "Server Error" })
  }
}

// DELETE /api/parking-areas/:id
exports.deleteParkingArea = async (req, res) => {
  try {
    const area = await ParkingArea.findByIdAndDelete(req.params.id)
    if (!area) return res.status(404).json({ message: "Parking area not found" })
    res.json({ ok: true })
  } catch (error) {
    res.status(500).json({ message: "Server Error" })
  }
}
