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

  useEffect(() => {
    load()
  }, [])

  const filteredAreas = useMemo(() => areas.filter((area) => {
    if (qCategory && area.category !== qCategory) return false
    if (qStadium && area.stadiumName !== qStadium) return false
    return true
  }), [areas, qCategory, qStadium])

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
    const names = Array.from(
      new Set(
        areas
          .filter((a) => !qCategory || a.category === qCategory)
          .map((a) => a.stadiumName)
          .filter(Boolean),
      ),
    )
    return names.sort()
  }, [areas, qCategory])

  const handleDelete = async (id) => {
    if (!window.confirm("선택한 주차 구역을 삭제할까요?")) return
    try {
      await api.delete(`/parking-areas/${id}`)
      if (selectedArea?._id === id) setSelectedArea(null)
      load()
    } catch (err) {
      console.error("delete parking area failed", err)
      const message = err?.response?.data?.message || "주차 구역 삭제에 실패했습니다."
      alert(message)
    }
  }

  const viewOnMap = (area) => {
    setSelectedArea(area)
    const centroid = getCentroid(area)
    if (centroid) setMapCenter({ lat: centroid.lat, lng: centroid.lng })
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div>
          <h1 className="admin-header__title">주차 구역 관리</h1>
          <p className="page-hero__subtitle">
            등록된 주차 구역을 검토하고 불필요한 데이터를 정리합니다. 지도를 클릭하면 구역 상세를 확인할 수 있습니다.
          </p>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button type="button" className="cta-button" onClick={() => navigate("/admin")}>
            관리자 홈
          </button>
          <button type="button" onClick={logout}>
            로그아웃
          </button>
        </div>
      </header>

      <div className="admin-toolbar">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <label>
            종목
            <select
              value={qCategory}
              onChange={(event) => {
                setQCategory(event.target.value)
                setQStadium("")
              }}
            >
              <option value="">전체 종목</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            경기장
            <select value={qStadium} onChange={(event) => setQStadium(event.target.value)}>
              <option value="">전체 경기장</option>
              {stadiumOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={load}>
            새로고침
          </button>
        </div>
      </div>

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>종목</th>
              <th>경기장</th>
              <th>구역 이름</th>
              <th>추천</th>
              <th>성공</th>
              <th>실패</th>
              <th>포기</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {filteredAreas.map((area) => (
              <tr key={area._id}>
                <td>{area.category}</td>
                <td>{area.stadiumName}</td>
                <td>{area.title}</td>
                <td>{area.upvoteCount || 0}</td>
                <td>{area.successCount || 0}</td>
                <td>{area.failureCount || 0}</td>
                <td>{area.abandonCount || 0}</td>
                <td>
                  <div className="admin-table__actions">
                    <button type="button" onClick={() => viewOnMap(area)}>
                      지도 보기
                    </button>
                    <button type="button" onClick={() => handleDelete(area._id)}>
                      삭제
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredAreas.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", color: "#6b7280" }}>
                  조건에 맞는 주차 구역이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="map-preview">
        <Map center={mapCenter} style={{ width: "100%", height: 380 }} level={3}>
          {filteredAreas.map((area) => {
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
      </div>
      <p className="map-preview__hint">
        지도에서 구역을 선택하면 상세 정보를 확인할 수 있습니다.
        {selectedArea && (
          <>
            <br />
            <strong>{selectedArea.title}</strong> · {selectedArea.stadiumName} · 추천 {selectedArea.upvoteCount || 0}
          </>
        )}
      </p>
    </div>
  )
}
