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
      <div className="page page--narrow">
        <section className="page-hero">
          <h1 className="page-hero__title">내 주차장 목록</h1>
          <p className="page-hero__subtitle">
            로그인하면 저장한 주차 구역과 길찾기 기록을 한눈에 확인할 수 있습니다.
          </p>
        </section>
        <div className="empty-state">
          아직 로그인되지 않았어요.<br />
          상단 메뉴의 로그인 버튼을 눌러 서비스를 이용해 주세요.
        </div>
      </div>
    )
  }

  if (loadingUser && !user) {
    return (
      <div className="page page--narrow">
        <section className="page-hero">
          <h1 className="page-hero__title">내 주차장 목록</h1>
          <p className="page-hero__subtitle">내 데이터와 즐겨찾는 주차장을 불러오는 중입니다…</p>
        </section>
      </div>
    )
  }

  const savedAreas = user?.savedAreas || []

  const openArea = (area) => {
    if (!area) return
    const centroid = getAreaCentroid(area)
    const lat = centroid ? centroid.lat : 37.566826
    const lng = centroid ? centroid.lng : 126.9786567
    navigate(`/map?areaId=${area._id}&lat=${lat}&lng=${lng}&follow=0`)
  }

  const handleUnsave = async (event, areaId) => {
    event.stopPropagation()
    if (!areaId || unsavingId) return

    setUnsavingId(areaId)
    try {
      const { data } = await api.post(`/parking-areas/${areaId}/save`)
      await refreshUser()
      if (data?.saved === false) {
        alert("주차장이 즐겨찾기에서 삭제되었습니다.")
      } else if (data?.saved === true) {
        alert("주차장이 다시 저장되었습니다.")
      }
    } catch (error) {
      console.error("Failed to toggle saved parking area:", error)
      const message = error?.response?.data?.message || "즐겨찾기 작업을 완료할 수 없습니다."
      alert(message)
    } finally {
      setUnsavingId("")
    }
  }

  return (
    <div className="page page--narrow">
      <section className="page-hero">
        <h1 className="page-hero__title">내 주차장 목록</h1>
        <p className="page-hero__subtitle">
          저장한 주차 공간을 모아보고, 다시 길찾기를 시작하거나 즐겨찾기에서 제거할 수 있습니다.
        </p>
      </section>

      {savedAreas.length === 0 ? (
        <div className="empty-state">
          아직 즐겨찾기한 주차장이 없습니다.<br />
          지도에서 원하는 주차장을 선택하고 “내 즐겨찾기” 버튼을 눌러 저장해 보세요.
        </div>
      ) : (
        <div className="profile-page__list">
          {savedAreas.map((area) => (
            <div key={area._id} className="profile-card">
              <div
                role="button"
                tabIndex={0}
                className="profile-card__body"
                onClick={() => openArea(area)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault()
                    openArea(area)
                  }
                }}
              >
                <div>
                  <h3 className="surface-card__title">{area.title}</h3>
                  <p className="surface-card__desc" style={{ marginTop: 6 }}>{area.stadiumName}</p>
                </div>
                <span className="list-card__meta">
                  저장일 {area.createdAt ? new Date(area.createdAt).toLocaleDateString() : "-"}
                </span>
              </div>
              <div className="profile-card__actions">
                <button type="button" onClick={() => openArea(area)}>
                  지도에서 보기
                </button>
                <button
                  type="button"
                  onClick={(event) => handleUnsave(event, area._id)}
                  disabled={unsavingId === area._id}
                >
                  {unsavingId === area._id ? "처리 중..." : "즐겨찾기 해제"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
