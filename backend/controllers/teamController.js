const Team = require('../models/Team')
const Stadium = require('../models/Stadium')

const DEFAULT_COORDS = [126.9786567, 37.566826]

const toNumber = (value) => {
  if (value === null || value === undefined) return null
  if (typeof value === 'string' && value.trim() === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

const pickCoordinatePair = (arr) => {
  if (!Array.isArray(arr) || arr.length !== 2) return null
  const lng = toNumber(arr[0])
  const lat = toNumber(arr[1])
  if (lng === null || lat === null) return null
  return [lng, lat]
}

const findCoordinates = (source = {}) => {
  if (!source) return null
  const direct = pickCoordinatePair(source)
  if (direct) return direct
  const byCoordinates = pickCoordinatePair(source.coordinates)
  if (byCoordinates) return byCoordinates
  const byLocation = pickCoordinatePair(source.location?.coordinates)
  if (byLocation) return byLocation
  const lat = toNumber(source.lat ?? source.latitude)
  const lng = toNumber(source.lng ?? source.longitude)
  if (lng !== null && lat !== null) return [lng, lat]
  return null
}

const extractCoordinates = (source = {}) => findCoordinates(source) || DEFAULT_COORDS

const resolveHomeStadium = async ({ category, teamName, logoImage, homeStadium = {} }) => {
  if (!homeStadium) throw new Error('홈구장 정보가 필요합니다.')

  const appliedLogo = homeStadium.logoImage ?? logoImage ?? ''

  if (homeStadium.stadiumId) {
    const stadium = await Stadium.findById(homeStadium.stadiumId)
    if (!stadium) throw new Error('선택한 경기장을 찾을 수 없습니다.')

    if (homeStadium.name) stadium.stadiumName = homeStadium.name
    if (homeStadium.city !== undefined) stadium.city = homeStadium.city
    const overrideCoords = findCoordinates(homeStadium)
    if (overrideCoords) {
      stadium.location = {
        type: 'Point',
        coordinates: overrideCoords,
      }
    }
    stadium.teamName = teamName
    stadium.category = category
    stadium.logoImage = appliedLogo
    await stadium.save()

    return {
      stadiumId: stadium._id,
      name: stadium.stadiumName,
      city: stadium.city || '',
      location: stadium.location,
      logoImage: stadium.logoImage || '',
    }
  }

  if (!homeStadium.name) throw new Error('홈구장 이름을 입력하세요.')

  const coordinates = extractCoordinates(homeStadium)

  const stadium = await Stadium.create({
    category,
    teamName,
    stadiumName: homeStadium.name,
    city: homeStadium.city || '',
    logoImage: appliedLogo,
    location: {
      type: 'Point',
      coordinates,
    },
  })

  return {
    stadiumId: stadium._id,
    name: stadium.stadiumName,
    city: stadium.city || '',
    location: stadium.location,
    logoImage: stadium.logoImage || '',
  }
}

// GET /api/teams?category=
exports.listTeams = async (req, res) => {
  try {
    const q = {}
    if (req.query.category) q.category = req.query.category
    const docs = await Team.find(q).populate('homeStadium.stadiumId').sort({ name: 1 })
    res.json(docs)
  } catch (e) { res.status(500).json({ message: 'Server Error' }) }
}

// POST /api/teams (admin)
exports.createTeam = async (req, res) => {
  try {
    const body = { ...req.body }
    const logoImage = body.logoImage || body.homeStadium?.logoImage || ''
    body.logoImage = logoImage

    const homeInput = {
      ...(body.homeStadium || {}),
      logoImage,
    }

    body.homeStadium = await resolveHomeStadium({
      category: body.category,
      teamName: body.name,
      logoImage,
      homeStadium: homeInput,
    })

    body.city = body.city ?? body.homeStadium.city ?? ''

    const doc = await Team.create(body)
    await doc.populate('homeStadium.stadiumId')
    res.status(201).json(doc)
  } catch (e) { res.status(400).json({ message: e.message }) }
}

// PUT /api/teams/:id (admin)
exports.updateTeam = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id)
    if (!team) return res.status(404).json({ message: 'Not found' })

    if (req.body.category !== undefined) team.category = req.body.category
    if (req.body.name !== undefined) team.name = req.body.name
    if (req.body.shortName !== undefined) team.shortName = req.body.shortName ?? ''
    if (req.body.logoImage !== undefined) team.logoImage = req.body.logoImage ?? ''

    const homePayload = req.body.homeStadium || {}
    const needsHomeUpdate = Object.keys(homePayload).length > 0 || req.body.category !== undefined || req.body.name !== undefined || req.body.logoImage !== undefined

    if (needsHomeUpdate) {
      const currentHome = team.homeStadium || {}
      const homeInput = {
        stadiumId: homePayload.stadiumId || currentHome.stadiumId,
        name: homePayload.name || currentHome.name,
        city: homePayload.city ?? currentHome.city,
        logoImage: homePayload.logoImage ?? team.logoImage,
      }

      if (homePayload.location) homeInput.location = homePayload.location

      const hasLat = homePayload.lat !== undefined && homePayload.lat !== null && homePayload.lat !== ''
      const hasLng = homePayload.lng !== undefined && homePayload.lng !== null && homePayload.lng !== ''
      if (hasLat) homeInput.lat = homePayload.lat
      if (hasLng) homeInput.lng = homePayload.lng

      if (!hasLat && !hasLng && !homePayload.location && !homePayload.coordinates && Array.isArray(currentHome.location?.coordinates)) {
        homeInput.coordinates = currentHome.location.coordinates
      } else if (homePayload.coordinates) {
        homeInput.coordinates = homePayload.coordinates
      }

      const resolvedHome = await resolveHomeStadium({
        category: team.category,
        teamName: team.name,
        logoImage: team.logoImage,
        homeStadium: homeInput,
      })
      team.homeStadium = resolvedHome
      team.city = resolvedHome.city || team.city || ''
    }

    if (req.body.city !== undefined) team.city = req.body.city ?? team.city ?? ''

    await team.save()
    await team.populate('homeStadium.stadiumId')
    res.json(team)
  } catch (e) { res.status(400).json({ message: e.message }) }
}

// DELETE /api/teams/:id (admin)
exports.deleteTeam = async (req, res) => {
  try {
    const doc = await Team.findByIdAndDelete(req.params.id)
    if (!doc) return res.status(404).json({ message: 'Not found' })
    res.json({ ok: true })
  } catch (e) { res.status(400).json({ message: e.message }) }
}
