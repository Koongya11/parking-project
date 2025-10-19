import React, { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import api from "../api"

const getAreaCentroid = (area) => {
  const ring = area?.polygon?.coordinates?.[0]
  if (!Array.isArray(ring) || ring.length === 0) return null
  const { sumLng, sumLat } = ring.reduce(
    (acc, [lng, lat]) => ({ sumLng: acc.sumLng + lng, sumLat: acc.sumLat + lat }),
    { sumLng: 0, sumLat: 0 },
  )
  return { lng: sumLng / ring.length, lat: sumLat / ring.length }
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, isLoggedIn, loadingUser, refreshUser } = useAuth()
  const [unsavingId, setUnsavingId] = useState("")

  useEffect(() => {
    if (isLoggedIn) {
      refreshUser()
    }
  }, [isLoggedIn, refreshUser])

  if (!isLoggedIn) {
    return (
      <div className="container">
        <h1>내 프로필</h1>
        <p style={{ marginTop: 12, color: "#64748b" }}>로그인 후 저장한 주차 구역을 확인할 수 있습니다.</p>
      </div>
    )
  }

  if (loadingUser && !user) {
    return (
      <div className="container">
        <h1>내 프로필</h1>
        <p style={{ marginTop: 12, color: "#64748b" }}>프로필 정보를 불러오는 중입니다...</p>
      </div>
    )
  }

  const savedAreas = user?.savedAreas || []

  const handleUnsave = async (event, areaId) => {
    event.stopPropagation()
    if (!areaId || unsavingId) return

    setUnsavingId(areaId)
    try {
      const { data } = await api.post(`/parking-areas/${areaId}/save`)
      await refreshUser()
      if (data?.saved === false) {
        alert("이 주차 구역 저장이 취소되었습니다.")
      } else if (data?.saved === true) {
        alert("이 주차 구역이 다시 저장되었습니다.")
      }
    } catch (error) {
      console.error("Failed to unsave parking area:", error)
      const message = error?.response?.data?.message || "저장을 취소할 수 없습니다."
      alert(message)
    } finally {
      setUnsavingId("")
    }
  }

  const openArea = (area) => {
    if (!area) return
    const centroid = getAreaCentroid(area)
    const lat = centroid ? centroid.lat : 37.566826
    const lng = centroid ? centroid.lng : 126.9786567
    navigate(`/map?areaId=${area._id}&lat=${lat}&lng=${lng}&follow=0`)
  }

  return (
    <div className="container">
      <h1>내 프로필</h1>
      <p style={{ marginTop: 12, color: "#475569" }}>현재 계정으로 저장한 주차 구역 목록입니다.</p>

      {savedAreas.length === 0 ? (
        <div style={{ padding: 20, border: "1px dashed #e2e8f0", borderRadius: 12, color: "#94a3b8", marginTop: 20 }}>
          아직 저장한 주차 구역이 없습니다. 지도의 "이 구역 저장" 버튼을 눌러 주차 구역을 저장해 보세요.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12, marginTop: 20 }}>
          {savedAreas.map((area) => (
            <div
              key={area._id}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                padding: 16,
                background: "#fff",
                display: "grid",
                gap: 10,
              }}
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => openArea(area)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault()
                    openArea(area)
                  }
                }}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                }}
              >
                <div>
                  <h3 style={{ margin: 0 }}>{area.title}</h3>
                  <p style={{ margin: "6px 0 0", color: "#475569" }}>{area.stadiumName}</p>
                </div>
                <span style={{ color: "#94a3b8", fontSize: 13 }}>
                  저장일 {area.createdAt ? new Date(area.createdAt).toLocaleDateString() : "-"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => openArea(area)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: "1px solid #cbd5f5",
                    background: "#eef2ff",
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  지도에서 보기
                </button>
                <button
                  type="button"
                  onClick={(event) => handleUnsave(event, area._id)}
                  disabled={unsavingId === area._id}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: "1px solid #fca5a5",
                    background: unsavingId === area._id ? "#fecaca" : "#fee2e2",
                    color: "#b91c1c",
                    cursor: unsavingId === area._id ? "wait" : "pointer",
                    fontSize: 13,
                  }}
                >
                  {unsavingId === area._id ? "해제 중..." : "저장 취소"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
