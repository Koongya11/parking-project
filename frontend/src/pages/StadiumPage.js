import React, { useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { Map, MapMarker } from "react-kakao-maps-sdk"
import api from "../api"

const PAGE_SIZE = 5

const getAverageCongestion = (area) => {
  if (!area?.congestionScoreCount) return null
  return area.congestionScoreSum / area.congestionScoreCount
}

const getAreaCentroid = (area) => {
  const ring = area?.polygon?.coordinates?.[0]
  if (!Array.isArray(ring) || ring.length === 0) return null
  const { sumLng, sumLat } = ring.reduce(
    (acc, [lng, lat]) => ({ sumLng: acc.sumLng + lng, sumLat: acc.sumLat + lat }),
    { sumLng: 0, sumLat: 0 },
  )
  return { lng: sumLng / ring.length, lat: sumLat / ring.length }
}

export default function StadiumPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  const [stadium, setStadium] = useState(location.state?.stadium || null)
  const [areas, setAreas] = useState([])
  const [page, setPage] = useState(1)
  const [loadingAreas, setLoadingAreas] = useState(false)
  const [sortMode, setSortMode] = useState("congestion")

  useEffect(() => {
    if (stadium) return
    api.get("/stadiums").then((res) => {
      const found = res.data.find((item) => item._id === id)
      if (found) setStadium(found)
    })
  }, [id, stadium])

  useEffect(() => {
    if (!stadium) return
    setLoadingAreas(true)
    api
      .get("/parking-areas")
      .then((res) => {
        const filtered = (res.data || []).filter((area) => area.stadiumName === stadium.stadiumName)
        setAreas(filtered)
        setPage(1)
      })
      .finally(() => setLoadingAreas(false))
  }, [stadium])

  const sortedAreas = useMemo(() => {
    const list = [...areas]
    if (sortMode === "upvote") {
      return list.sort((a, b) => (b.upvoteCount || 0) - (a.upvoteCount || 0))
    }
    return list.sort((a, b) => {
      const avgA = getAverageCongestion(a)
      const avgB = getAverageCongestion(b)
      if (avgA === null && avgB === null) return (b.createdAt || "").localeCompare(a.createdAt || "")
      if (avgA === null) return 1
      if (avgB === null) return -1
      if (avgA !== avgB) return avgA - avgB
      return (b.createdAt || "").localeCompare(a.createdAt || "")
    })
  }, [areas, sortMode])

  if (!stadium) return null

  const [lng, lat] = stadium.location?.coordinates || [126.9786567, 37.566826]
  const center = { lat, lng }

  const openMapView = () => {
    navigate(
      `/map?stadium=${encodeURIComponent(stadium.stadiumName)}&lat=${lat}&lng=${lng}&category=${stadium.category}&follow=0`,
    )
  }

  const openMapForAreaCreation = () => {
    navigate(
      `/map?stadium=${encodeURIComponent(stadium.stadiumName)}&lat=${lat}&lng=${lng}&draw=1&category=${stadium.category}`,
    )
  }

  const openAreaOnMap = (area) => {
    const centroid = getAreaCentroid(area) || center
    navigate(
      `/map?stadium=${encodeURIComponent(stadium.stadiumName)}&lat=${centroid.lat}&lng=${centroid.lng}&category=${stadium.category}&areaId=${area._id}&follow=0`,
    )
  }

  const totalPages = Math.ceil(sortedAreas.length / PAGE_SIZE) || 1
  const startIndex = (page - 1) * PAGE_SIZE
  const pagedAreas = sortedAreas.slice(startIndex, startIndex + PAGE_SIZE)

  const changePage = (next) => {
    if (next < 1 || next > totalPages) return
    setPage(next)
  }

  return (
    <div className="container">
      <header className="header">
        <h1>{stadium.stadiumName}</h1>
        <p className="subtitle">
          {stadium.teamName} · {stadium.city || "도시 정보 없음"}
        </p>
      </header>

      <div
        style={{ border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden", cursor: "pointer" }}
        onClick={openMapView}
        role="button"
        tabIndex={0}
      >
        <Map center={center} style={{ width: "100%", height: 320 }} level={3}>
          <MapMarker position={center} />
        </Map>
      </div>

      <section style={{ marginTop: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>저장된 주차 구역</h2>
          {sortedAreas.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ color: "#64748b", fontSize: 14 }}>총 {sortedAreas.length}개 구역</span>
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  onClick={() => setSortMode("congestion")}
                  style={{
                    fontWeight: sortMode === "congestion" ? 700 : 400,
                    textDecoration: sortMode === "congestion" ? "underline" : "none",
                  }}
                >
                  혼잡도 낮은 순
                </button>
                <button
                  onClick={() => setSortMode("upvote")}
                  style={{
                    fontWeight: sortMode === "upvote" ? 700 : 400,
                    textDecoration: sortMode === "upvote" ? "underline" : "none",
                  }}
                >
                  저장순
                </button>
              </div>
            </div>
          )}
        </div>

        {loadingAreas && <div style={{ color: "#64748b" }}>주차 구역을 불러오는 중...</div>}

        {!loadingAreas && sortedAreas.length === 0 && (
          <div style={{ padding: 20, border: "1px dashed #e2e8f0", borderRadius: 12, color: "#94a3b8" }}>
            아직 저장된 주차 구역이 없습니다. 아래 버튼으로 추가해보세요.
          </div>
        )}

        {!loadingAreas && sortedAreas.length > 0 && (
          <div style={{ display: "grid", gap: 12 }}>
            {pagedAreas.map((area) => {
              const saves = area.upvoteCount || 0
              return (
                <button
                  key={area._id}
                  onClick={() => openAreaOnMap(area)}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: 12,
                    padding: 16,
                    textAlign: "left",
                    cursor: "pointer",
                    background: "#ffffff",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 style={{ margin: 0 }}>{area.title}</h3>
                    <div style={{ color: "#94a3b8", fontSize: 13 }}>
                      저장일 {area.createdAt ? new Date(area.createdAt).toLocaleDateString() : "-"}
                    </div>
                  </div>
                  <div style={{ color: "#475569", marginTop: 8 }}>저장 {saves}회</div>
                </button>
              )
            })}
          </div>
        )}

        {!loadingAreas && sortedAreas.length > PAGE_SIZE && (
          <div style={{ display: "flex", gap: 6, marginTop: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => changePage(page - 1)} disabled={page === 1}>
              이전
            </button>
            {Array.from({ length: totalPages }).map((_, idx) => {
              const pageNumber = idx + 1
              const active = pageNumber === page
              return (
                <button
                  key={pageNumber}
                  onClick={() => changePage(pageNumber)}
                  style={{ fontWeight: active ? 700 : 400, textDecoration: active ? "underline" : "none" }}
                >
                  {pageNumber}
                </button>
              )
            })}
            <button onClick={() => changePage(page + 1)} disabled={page === totalPages}>
              다음
            </button>
          </div>
        )}
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10, marginTop: 24 }}>
        <button onClick={openMapForAreaCreation} style={{ padding: "12px 10px" }}>
          지도 열기 · 구역 추가
        </button>
      </div>
    </div>
  )
}
