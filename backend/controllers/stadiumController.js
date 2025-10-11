const Stadium = require('../models/Stadium')

// GET /api/stadiums?category=baseball
exports.listStadiums = async (req, res) => {
    try {
        const q = {}
        if (req.query.category) q.category = req.query.category
        const docs = await Stadium.find(q).sort({ teamName: 1, stadiumName: 1 })
        res.json(docs)
    } catch (e) { res.status(500).json({ message: 'Server Error' }) }
}

// POST /api/stadiums   (admin)
exports.createStadium = async (req, res) => {
    try {
        const doc = await Stadium.create(req.body)
        res.status(201).json(doc)
    } catch (e) { res.status(400).json({ message: e.message }) }
}

// PUT /api/stadiums/:id (admin)
exports.updateStadium = async (req, res) => {
    try {
        const doc = await Stadium.findByIdAndUpdate(req.params.id, req.body, { new: true })
        if (!doc) return res.status(404).json({ message: 'Not found' })
        res.json(doc)
    } catch (e) { res.status(400).json({ message: e.message }) }
}

// DELETE /api/stadiums/:id (admin)
exports.deleteStadium = async (req, res) => {
    try {
        const doc = await Stadium.findByIdAndDelete(req.params.id)
        if (!doc) return res.status(404).json({ message: 'Not found' })
        res.json({ ok: true })
    } catch (e) { res.status(400).json({ message: e.message }) }
}

exports.sendFeedback = async (req, res) => {
    const { id } = req.params
    const { type } = req.body // 'success' | 'failure' | 'abandon' | 'recommend'

    const area = await ParkingArea.findById(id)
    if (!area) return res.status(404).json({ message: 'Not found' })

    switch (type) {
        case 'success': area.successCount = (area.successCount || 0) + 1; break
        case 'failure': area.failureCount = (area.failureCount || 0) + 1; break
        case 'abandon': area.abandonCount = (area.abandonCount || 0) + 1; break
        case 'recommend': area.upvoteCount = (area.upvoteCount || 0) + 1; break
        default: return res.status(400).json({ message: 'Invalid type' })
    }

    await area.save()
    res.json(area)
}
