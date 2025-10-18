import React, { useEffect, useMemo, useState } from "react"
import { Map, Polygon } from "react-kakao-maps-sdk"
import { useNavigate } from "react-router-dom"
import api from "../../api"
import CATEGORIES from "../../data/categories"

const DEFAULT_CENTER = { lat: 37.566826, lng: 126.9786567 }

const getCentroid = (area) => {
  const ring = area?.polygon?.coordinates?.[0]
  if (!Array.isArray(ring) || ring.length === 0) return null
  let sumLng = 0
  let sumLat = 0
  ring.forEach(([lng, lat]) => {
    sumLng += lng
    sumLat += lat
  })
  return { lng: sumLng / ring.length, lat: sumLat / ring.length }
}

const toPath = (area) => {
  const ring = area?.polygon?.coordinates?.[0]
  if (!Array.isArray(ring)) return []
  return ring.map(([lng, lat]) => ({ lng, lat }))
}

export default function AdminParkingAreas() {
  const navigate = useNavigate()
  const [areas, setAreas] = useState([])
  const [qCategory, setQCategory] = useState("")
  const [qStadium, setQStadium] = useState("")
  const [selectedArea, setSelectedArea] = useState(null)
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER)

  useEffect(() => {
    const token = localStorage.getItem("ADMIN_TOKEN")
    if (!token) navigate("/admin/login", { replace: true })
  }, [navigate])

  const logout = () => {
    localStorage.removeItem("ADMIN_TOKEN")
    navigate("/admin/login", { replace: true })
  }

  const load = async () => {
    const { data } = await api.get("/parking-areas")
    setAreas(data || [])
  }

  useEffect(() => { load() }, [])

  const filteredAreas = useMemo(() => {
    return areas.filter(area => {
      if (qCategory && area.category !== qCategory) return false
      if (qStadium && area.stadiumName !== qStadium) return false
      return true
    })
  }, [areas, qCategory, qStadium])

  useEffect(() => {
    if (filteredAreas.length === 0) {
      setSelectedArea(null)
      setMapCenter(DEFAULT_CENTER)
      return
    }
    if (qStadium) {
      const first = filteredAreas[0]
      const centroid = getCentroid(first)
      if (centroid) setMapCenter({ lat: centroid.lat, lng: centroid.lng })
    }
  }, [filteredAreas, qStadium])

  const stadiumOptions = useMemo(() => {
    const names = Array.from(new Set(areas
      .filter(a => !qCategory || a.category === qCategory)
      .map(a => a.stadiumName)
      .filter(Boolean)))
    return names.sort()
  }, [areas, qCategory])

  const handleDelete = async (id) => {
    if (!window.confirm("해당 주차 영역을 삭제할까요?")) return
    try {
      await api.delete(`/parking-areas/${id}`)
      if (selectedArea?._id === id) setSelectedArea(null)
      load()
    } catch (err) {
      console.error("delete parking area failed", err)
      const message = err?.response?.data?.message || "주차 영역 삭제에 실패했습니다."
      alert(message)
    }
  }

  const viewOnMap = (area) => {
    setSelectedArea(area)
    const centroid = getCentroid(area)
    if (centroid) setMapCenter({ lat: centroid.lat, lng: centroid.lng })
  }

  return (
    <div className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>주차 영역 관리</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => navigate("/admin")}>관리자 홈</button>
          <button onClick={logout}>로그아웃</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", margin: "12px 0 20px" }}>
        <strong>필터:</strong>
        <select
          value={qCategory}
          onChange={e => {
            setQCategory(e.target.value)
            setQStadium("")
          }}
        >
          <option value="">전체 종목</option>
          {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={qStadium} onChange={e => setQStadium(e.target.value)}>
          <option value="">전체 경기장</option>
          {stadiumOptions.map(name => <option key={name} value={name}>{name}</option>)}
        </select>
        <button onClick={load}>새로고침</button>
      </div>

      <div style={{ display: "grid", gap: 16, marginBottom: 24 }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th>종목</th>
                <th>경기장</th>
                <th>영역 이름</th>
                <th>추천</th>
                <th>성공</th>
                <th>실패</th>
                <th>포기</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {filteredAreas.map(area => (
                <tr key={area._id}>
                  <td>{area.category}</td>
                  <td>{area.stadiumName}</td>
                  <td>{area.title}</td>
                  <td>{area.upvoteCount || 0}</td>
                  <td>{area.successCount || 0}</td>
                  <td>{area.failureCount || 0}</td>
                  <td>{area.abandonCount || 0}</td>
                  <td style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => viewOnMap(area)}>지도 보기</button>
                    <button onClick={() => handleDelete(area._id)}>삭제</button>
                  </td>
                </tr>
              ))}
              {filteredAreas.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", color: "#6b7280" }}>표시할 데이터가 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden", minHeight: 360 }}>
          <Map center={mapCenter} style={{ width: "100%", height: 360 }} level={3}>
            {filteredAreas.map(area => {
              const path = toPath(area)
              if (path.length === 0) return null
              const isSelected = selectedArea?._id === area._id
              const strokeColor = isSelected ? "#2563eb" : "#6366f1"
              const fillColor = isSelected ? "rgba(37,99,235,0.4)" : "rgba(99,102,241,0.25)"
              return (
                <Polygon
                  key={area._id}
                  path={path}
                  strokeWeight={3}
                  strokeColor={strokeColor}
                  strokeOpacity={0.9}
                  strokeStyle="solid"
                  fillColor={fillColor}
                  fillOpacity={0.6}
                  onClick={() => viewOnMap(area)}
                />
              )
            })}
          </Map>
          <div style={{ padding: 12, borderTop: "1px solid #e2e8f0", background: "#f8fafc" }}>
            {selectedArea ? (
              <div>
                <strong>{selectedArea.title}</strong>
                <div style={{ color: "#64748b", marginTop: 4 }}>
                  {selectedArea.stadiumName} · 추천 {selectedArea.upvoteCount || 0}
                </div>
              </div>
            ) : (
              <span style={{ color: "#94a3b8" }}>지도에 표시할 영역을 선택하세요.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

