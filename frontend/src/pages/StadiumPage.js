import React, { useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { Map, MapMarker } from "react-kakao-maps-sdk"
import api from "../api"

const PAGE_SIZE = 5

const calcScore = (area) => {
  const upvote = area.upvoteCount || 0
  return upvote
}

export default function StadiumPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const loc = useLocation()

  const [stadium, setStadium] = useState(loc.state?.stadium || null)
  const [areas, setAreas] = useState([])
  const [page, setPage] = useState(1)
  const [loadingAreas, setLoadingAreas] = useState(false)

  useEffect(() => {
    if (stadium) return
    api.get("/stadiums").then(res => {
      const found = res.data.find((x) => x._id === id)
      if (found) setStadium(found)
    })
  }, [id, stadium])

  useEffect(() => {
    if (!stadium) return
    setLoadingAreas(true)
    api.get("/parking-areas")
      .then(res => {
        const filtered = (res.data || []).filter(a => a.stadiumName === stadium.stadiumName)
        setAreas(filtered)
        setPage(1)
      })
      .finally(() => setLoadingAreas(false))
  }, [stadium])

  const [sortMode, setSortMode] = useState("score")

  const sortedAreas = useMemo(() => {
    const list = [...areas]
    if (sortMode === "upvote") {
      return list.sort((a, b) => (b.upvoteCount || 0) - (a.upvoteCount || 0))
    }
    return list.sort((a, b) => {
      const scoreA = calcScore(a)
      const scoreB = calcScore(b)
      if (scoreA !== scoreB) return scoreB - scoreA
      return (a.createdAt || '').localeCompare(b.createdAt || '')
    })
  }, [areas, sortMode])

  if (!stadium) return null

  const [lng, lat] = stadium.location?.coordinates || [126.9786567, 37.566826]
  const center = { lat, lng }

  const openMapView = () => {
    nav(`/map?stadium=${encodeURIComponent(stadium.stadiumName)}&lat=${lat}&lng=${lng}&category=${stadium.category}`)
  }

  const openMapForArea = () => {
    nav(`/map?stadium=${encodeURIComponent(stadium.stadiumName)}&lat=${lat}&lng=${lng}&draw=1&category=${stadium.category}`)
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
        <p className="subtitle">{stadium.teamName} · {stadium.city || "도시 미정"}</p>
      </header>

      <div
        style={{ border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden", cursor: "pointer" }}
        onClick={openMapView}
      >
        <Map center={center} style={{ width: "100%", height: 320 }} level={3}>
          <MapMarker position={center} />
        </Map>
      </div>

      <section style={{ marginTop: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>등록된 주차 영역</h2>
          {sortedAreas.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ color: "#64748b", fontSize: 14 }}>총 {sortedAreas.length}개</span>
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  onClick={() => setSortMode("score")}
                  style={{
                    fontWeight: sortMode === "score" ? 700 : 400,
                    textDecoration: sortMode === "score" ? "underline" : "none",
                  }}
                >
                  여유 순
                </button>
                <button
                  onClick={() => setSortMode("upvote")}
                  style={{
                    fontWeight: sortMode === "upvote" ? 700 : 400,
                    textDecoration: sortMode === "upvote" ? "underline" : "none",
                  }}
                >
                  추천 순
                </button>
              </div>
            </div>
          )}
        </div>

        {loadingAreas && <div style={{ color: "#64748b" }}>영역 정보를 불러오는 중...</div>}

        {!loadingAreas && sortedAreas.length === 0 && (
          <div style={{ padding: 20, border: "1px dashed #e2e8f0", borderRadius: 12, color: "#94a3b8" }}>
            아직 등록된 주차 영역이 없습니다. 아래의 버튼을 눌러 직접 추가해 주세요.
          </div>
        )}

        {!loadingAreas && sortedAreas.length > 0 && (
          <div style={{ display: "grid", gap: 12 }}>
            {pagedAreas.map(area => {
              const upvote = area.upvoteCount || 0
              return (
                <div key={area._id} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 style={{ margin: 0 }}>{area.title}</h3>
                    <div style={{ color: "#94a3b8", fontSize: 13 }}>등록일 {area.createdAt ? new Date(area.createdAt).toLocaleDateString() : "-"}</div>
                  </div>
                  <div style={{ color: "#475569", marginTop: 8 }}>추천 {upvote}</div>
                </div>
              )
            })}
          </div>
        )}

        {!loadingAreas && sortedAreas.length > PAGE_SIZE && (
          <div style={{ display: "flex", gap: 6, marginTop: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => changePage(page - 1)} disabled={page === 1}>이전</button>
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
            <button onClick={() => changePage(page + 1)} disabled={page === totalPages}>다음</button>
          </div>
        )}
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10, marginTop: 24 }}>
        <button onClick={openMapForArea} style={{ padding: "12px 10px" }}>
          지도 열기 · 영역 추가
        </button>
      </div>
    </div>
  )
}
