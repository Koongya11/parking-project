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

const formatDate = (value) => {
  if (!value) return "-"
  try {
    return new Date(value).toLocaleDateString()
  } catch {
    return "-"
  }
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, isLoggedIn, loadingUser, refreshUser } = useAuth()
  const [nicknameValue, setNicknameValue] = useState("")
  const [savingNickname, setSavingNickname] = useState(false)
  const [unsavingId, setUnsavingId] = useState("")
  const [deletingPostId, setDeletingPostId] = useState("")
  const [deletingAreaId, setDeletingAreaId] = useState("")

  useEffect(() => {
    if (isLoggedIn) {
      refreshUser()
    }
  }, [isLoggedIn, refreshUser])

  useEffect(() => {
    setNicknameValue(user?.nickname || "")
  }, [user?.nickname])

  const savedAreas = user?.savedAreas || []
  const myParkingAreas = user?.myParkingAreas || []
  const myCommunityPosts = user?.myCommunityPosts || []

  if (!isLoggedIn) {
    return (
      <div className="page page--narrow">
        <section className="page-hero">
          <h1 className="page-hero__title">마이 페이지</h1>
          <p className="page-hero__subtitle">로그인 후 계정과 활동 내역을 확인할 수 있습니다.</p>
        </section>
        <div className="empty-state">
          아직 로그인하지 않았어요.
          <br />
          상단 메뉴의 로그인 버튼을 눌러 이용해 주세요.
        </div>
      </div>
    )
  }

  if (loadingUser && !user) {
    return (
      <div className="page page--narrow">
        <section className="page-hero">
          <h1 className="page-hero__title">마이 페이지</h1>
          <p className="page-hero__subtitle">내 활동 정보를 불러오는 중입니다...</p>
        </section>
      </div>
    )
  }

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
        alert("주차 구역이 즐겨찾기에서 삭제되었습니다.")
      } else if (data?.saved === true) {
        alert("주차 구역이 다시 저장되었습니다.")
      }
    } catch (error) {
      console.error("Failed to toggle saved parking area:", error)
      const message = error?.response?.data?.message || "즐겨찾기 작업을 처리하지 못했습니다."
      alert(message)
    } finally {
      setUnsavingId("")
    }
  }

  const handleNicknameSave = async () => {
    const trimmed = nicknameValue.trim()
    if (!trimmed) {
      alert("닉네임을 입력해 주세요.")
      return
    }
    setSavingNickname(true)
    try {
      await api.patch("/users/me", { nickname: trimmed })
      await refreshUser()
      alert("닉네임이 저장되었습니다.")
    } catch (error) {
      console.error("Nickname update failed", error)
      const message = error?.response?.data?.message || "닉네임을 저장하지 못했습니다."
      alert(message)
    } finally {
      setSavingNickname(false)
    }
  }

  const handleDeletePost = async (post) => {
    if (!post?._id || !post?.stadiumId) return
    if (!window.confirm("이 게시글을 삭제할까요?")) return
    setDeletingPostId(post._id)
    try {
      await api.delete(`/stadiums/${post.stadiumId}/community/${post._id}`)
      await refreshUser()
    } catch (error) {
      console.error("delete post failed", error)
      const message = error?.response?.data?.message || "게시글 삭제에 실패했습니다."
      alert(message)
    } finally {
      setDeletingPostId("")
    }
  }

  const handleDeleteArea = async (areaId) => {
    if (!areaId) return
    if (!window.confirm("등록한 주차 구역을 삭제할까요?")) return
    setDeletingAreaId(areaId)
    try {
      await api.delete(`/parking-areas/${areaId}/mine`)
      await refreshUser()
    } catch (error) {
      console.error("delete parking area failed", error)
      const message = error?.response?.data?.message || "주차 구역 삭제에 실패했습니다."
      alert(message)
    } finally {
      setDeletingAreaId("")
    }
  }

  const viewCommunityPost = (post) => {
    if (!post?.stadiumId || !post?._id) return
    navigate(`/stadium/${post.stadiumId}/community/${post._id}`)
  }

  return (
    <div className="page page--narrow">
      <section className="page-hero">
        <h1 className="page-hero__title">마이 페이지</h1>
        <p className="page-hero__subtitle">계정 정보와 내가 남긴 흔적을 한 곳에서 관리하세요.</p>
      </section>

      <section className="profile-section">
        <h2>계정 관리</h2>
        <div className="profile-card">
          <div className="profile-account-row">
            <span className="profile-account-label">이메일</span>
            <strong>{user?.email}</strong>
          </div>
          <div className="profile-account-row">
            <label className="profile-account-label" htmlFor="nickname-input">
              닉네임
            </label>
            <div className="profile-account-control">
              <input
                id="nickname-input"
                value={nicknameValue}
                onChange={(event) => setNicknameValue(event.target.value)}
                placeholder="서비스에 표시할 닉네임"
              />
              <button type="button" onClick={handleNicknameSave} disabled={savingNickname}>
                {savingNickname ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="profile-section">
        <h2>내 커뮤니티 글</h2>
        {myCommunityPosts.length === 0 ? (
          <div className="empty-state">아직 작성한 게시글이 없습니다.</div>
        ) : (
          <div className="profile-page__list">
            {myCommunityPosts.map((post) => (
              <div key={post._id} className="profile-card">
                <div className="profile-card__body">
                  <div>
                    <h3 className="surface-card__title">{post.title}</h3>
                    <p className="surface-card__desc" style={{ marginTop: 4 }}>
                      {post.stadiumName || "경기장 미지정"} · 추천 {post.recommendCount || 0} · 조회{" "}
                      {post.views || 0}
                    </p>
                  </div>
                  <span className="list-card__meta">작성일 {formatDate(post.createdAt)}</span>
                </div>
                <div className="profile-card__actions">
                  <button type="button" onClick={() => viewCommunityPost(post)}>
                    게시글 보기
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeletePost(post)}
                    disabled={deletingPostId === post._id}
                  >
                    {deletingPostId === post._id ? "삭제 중..." : "삭제"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="profile-section">
        <h2>내가 등록한 주차 구역</h2>
        {myParkingAreas.length === 0 ? (
          <div className="empty-state">등록한 주차 구역이 아직 없습니다.</div>
        ) : (
          <div className="profile-page__list">
            {myParkingAreas.map((area) => (
              <div key={area._id} className="profile-card">
                <div className="profile-card__body">
                  <div>
                    <h3 className="surface-card__title">{area.title}</h3>
                    <p className="surface-card__desc" style={{ marginTop: 4 }}>
                      {area.stadiumName || "경기장 정보 없음"}
                    </p>
                  </div>
                  <span className="list-card__meta">등록일 {formatDate(area.createdAt)}</span>
                </div>
                <div className="profile-card__actions">
                  <button type="button" onClick={() => openArea(area)}>
                    지도에서 보기
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteArea(area._id)}
                    disabled={deletingAreaId === area._id}
                  >
                    {deletingAreaId === area._id ? "삭제 중..." : "삭제"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="profile-section">
        <h2>즐겨찾기한 주차 구역</h2>
        {savedAreas.length === 0 ? (
          <div className="empty-state">
            아직 즐겨찾기한 주차 구역이 없습니다.
            <br />
            지도에서 마음에 드는 곳을 저장해 보세요.
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
                  <span className="list-card__meta">등록일 {formatDate(area.createdAt)}</span>
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
      </section>
    </div>
  )
}
