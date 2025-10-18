const mongoose = require('mongoose')
const Match = require('../models/Match')
const Team = require('../models/Team')

const normalizeObjectId = (value) => {
  if (!value) return undefined
  if (value instanceof mongoose.Types.ObjectId) return value
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed ? trimmed : undefined
  }
  if (typeof value === 'object') {
    if (value._id) return value._id
    if (value.id) return value.id
  }
  return undefined
}

// GET /api/matches?category=&from=&to=&teamId=
exports.listMatches = async (req, res) => {
  try {
    const q = {}
    const { category, from, to, teamId } = req.query
    if (category) q.category = category
    if (from || to) {
      q.startAt = {}
      if (from) q.startAt.$gte = new Date(from)
      if (to) q.startAt.$lte = new Date(to)
    }
    if (teamId) {
      q.$or = [{ homeTeam: teamId }, { awayTeam: teamId }]
    }
    const docs = await Match.find(q)
      .populate('homeTeam')
      .populate('awayTeam')
      .populate('stadium')
      .sort({ startAt: 1 })
    res.json(docs)
  } catch (e) { res.status(500).json({ message: 'Server Error' }) }
}

// POST /api/matches (admin)
exports.createMatch = async (req, res) => {
  try {
    const body = { ...req.body }
    body.homeTeam = normalizeObjectId(body.homeTeam)
    body.awayTeam = normalizeObjectId(body.awayTeam)
    body.stadium = normalizeObjectId(body.stadium)

    if (!mongoose.isValidObjectId(body.homeTeam)) {
      return res.status(400).json({ message: '홈팀 정보가 올바르지 않습니다.' })
    }
    if (!mongoose.isValidObjectId(body.awayTeam)) {
      return res.status(400).json({ message: '원정팀 정보가 올바르지 않습니다.' })
    }

    let homeTeamDoc = null

    if (body.homeTeam) homeTeamDoc = await Team.findById(body.homeTeam)
    if (!homeTeamDoc) return res.status(400).json({ message: '홈팀을 찾을 수 없습니다.' })

    if (!body.category && homeTeamDoc) body.category = homeTeamDoc.category

    if (!body.stadium && homeTeamDoc?.homeStadium?.stadiumId) {
      body.stadium = homeTeamDoc.homeStadium.stadiumId
    }

    body.stadium = normalizeObjectId(body.stadium)
    if (body.stadium && !mongoose.isValidObjectId(body.stadium)) {
      return res.status(400).json({ message: '경기장 정보가 올바르지 않습니다.' })
    }

    const doc = await Match.create(body)
    await doc.populate([
      { path: 'homeTeam' },
      { path: 'awayTeam' },
      { path: 'stadium' },
    ])
    res.status(201).json(doc)
  } catch (e) { res.status(400).json({ message: e.message }) }
}

// PUT /api/matches/:id (admin)
exports.updateMatch = async (req, res) => {
  try {
    const body = { ...req.body }
    body.homeTeam = normalizeObjectId(body.homeTeam)
    body.awayTeam = normalizeObjectId(body.awayTeam)
    body.stadium = normalizeObjectId(body.stadium)

    let homeTeamDoc = null

    if (body.homeTeam) homeTeamDoc = await Team.findById(body.homeTeam)

    if (!body.category && homeTeamDoc) body.category = homeTeamDoc.category
    if (!body.stadium && homeTeamDoc?.homeStadium?.stadiumId) {
      body.stadium = homeTeamDoc.homeStadium.stadiumId
    }

    body.stadium = normalizeObjectId(body.stadium)
    if (body.stadium && !mongoose.isValidObjectId(body.stadium)) {
      return res.status(400).json({ message: '경기장 정보가 올바르지 않습니다.' })
    }

    const doc = await Match.findByIdAndUpdate(req.params.id, body, { new: true })
      .populate({ path: 'homeTeam' })
      .populate({ path: 'awayTeam' })
      .populate({ path: 'stadium' })
    if (!doc) return res.status(404).json({ message: 'Not found' })
    res.json(doc)
  } catch (e) { res.status(400).json({ message: e.message }) }
}

// DELETE /api/matches/:id (admin)
exports.deleteMatch = async (req, res) => {
  try {
    const doc = await Match.findByIdAndDelete(req.params.id)
    if (!doc) return res.status(404).json({ message: 'Not found' })
    res.json({ ok: true })
  } catch (e) { res.status(400).json({ message: e.message }) }
}
