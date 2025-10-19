const fetch = require('node-fetch')

function parseRouteVertices(route) {
  if (!route?.sections?.length) return []
  const points = []
  for (const section of route.sections) {
    if (!section?.roads) continue
    for (const road of section.roads) {
      const { vertexes } = road || {}
      if (!Array.isArray(vertexes)) continue
      for (let i = 0; i < vertexes.length - 1; i += 2) {
        points.push({ lng: vertexes[i], lat: vertexes[i + 1] })
      }
    }
  }
  return points
}

exports.getRoute = async (req, res) => {
  const { originLat, originLng, destLat, destLng } = req.query

  if (
    [originLat, originLng, destLat, destLng].some(
      (value) => value === undefined || value === null || value === ''
    )
  ) {
    return res.status(400).json({ message: 'Missing required coordinates.' })
  }

  if (!process.env.KAKAO_REST_KEY) {
    return res.status(500).json({ message: 'Kakao REST key is not configured on the server.' })
  }

  try {
    const url = new URL('https://apis-navi.kakaomobility.com/v1/directions')
    url.searchParams.set('origin', `${originLng},${originLat}`)
    url.searchParams.set('destination', `${destLng},${destLat}`)
    url.searchParams.set('priority', 'RECOMMEND')

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `KakaoAK ${process.env.KAKAO_REST_KEY}`,
      },
    })

    if (!response.ok) {
      const text = await response.text()
      return res.status(response.status).json({
        message: 'Failed to retrieve directions from Kakao Mobility API.',
        detail: text,
      })
    }

    const data = await response.json()
    const route = data?.routes?.[0]

    if (!route) {
      return res.status(404).json({ message: 'No route found for the provided coordinates.' })
    }

    return res.json({
      path: parseRouteVertices(route),
      summary: route.summary || null,
      option: route.summary?.option || null,
      sections: route.sections?.length || 0,
    })
  } catch (error) {
    console.error('Kakao navigation error:', error)
    return res.status(500).json({ message: 'Unable to fetch route information.', error: error.message })
  }
}
