import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { Map, MapMarker, CustomOverlayMap } from "react-kakao-maps-sdk"
import api from "../api"
import { useAuth } from "../context/AuthContext"

const DEFAULT_CENTER = { lat: 37.566826, lng: 126.9786567 }
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

const getAreaCreatorName = (area) => {
  if (!area) return "제보자"
  if (typeof area.createdByName === "string" && area.createdByName.trim()) return area.createdByName.trim()
  const creator = area.createdBy
  if (creator) {
    if (typeof creator === "string") return creator
    if (typeof creator.nickname === "string" && creator.nickname.trim()) return creator.nickname.trim()
    if (typeof creator.name === "string" && creator.name.trim()) return creator.name.trim()
    if (typeof creator.email === "string" && creator.email.includes("@")) return creator.email.split("@")[0]
  }
  return "제보자"
}

const formatDateTime = (value) => {
  if (!value) return "-"
  try {
    return new Date(value).toLocaleString("ko-KR", {
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return "-"
  }
}

export default function StadiumPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { isLoggedIn } = useAuth()

  const [stadium, setStadium] = useState(location.state?.stadium || null)
  const [areas, setAreas] = useState([])
  const [page, setPage] = useState(1)
  const [loadingAreas, setLoadingAreas] = useState(false)
  const [sortMode, setSortMode] = useState("congestion")
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER)
  const [userLocation, setUserLocation] = useState(null)
  const previewMapRef = useRef(null)

  const [activeTab, setActiveTab] = useState(location.state?.activeTab || "parking")
  const [communityPosts, setCommunityPosts] = useState([])
  const [communityLoading, setCommunityLoading] = useState(false)
  const [communityError, setCommunityError] = useState("")
  const [communitySort, setCommunitySort] = useState("latest")
  const [searchTerm, setSearchTerm] = useState("")
  const [searchValue, setSearchValue] = useState("")

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

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchValue(searchTerm.trim())
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const fetchCommunityPosts = useCallback(async () => {
    if (!id) return
    setCommunityLoading(true)
    setCommunityError("")
    try {
      const { data } = await api.get(`/stadiums/${id}/community`, {
        params: {
          sort: communitySort,
          q: searchValue || undefined,
        },
      })
      const list = Array.isArray(data) ? data : []
      setCommunityPosts(list)
    } catch (error) {
      console.error("failed to load community posts", error)
      setCommunityError("커뮤니티 게시글을 불러오지 못했습니다.")
    } finally {
      setCommunityLoading(false)
    }
  }, [id, communitySort, searchValue])

  useEffect(() => {
    fetchCommunityPosts()
  }, [fetchCommunityPosts])

  const [lng, lat] = stadium?.location?.coordinates || [DEFAULT_CENTER.lng, DEFAULT_CENTER.lat]
  const stadiumCenter = useMemo(() => ({ lat, lng }), [lat, lng])

  const updateMapCenter = useCallback((position) => {
    if (!position) return
    setMapCenter({ lat: position.lat, lng: position.lng })
  }, [])

  useEffect(() => {
    updateMapCenter(stadiumCenter)
  }, [stadiumCenter, updateMapCenter])

  const panPreviewMap = useCallback(
    (position, { instant = false } = {}) => {
      if (!position) return
      updateMapCenter(position)
      const map = previewMapRef.current
      if (map && window?.kakao?.maps) {
        const target = new window.kakao.maps.LatLng(position.lat, position.lng)
        if (instant) {
          map.setCenter(target)
        } else {
          map.panTo(target)
        }
      }
    },
    [updateMapCenter],
  )

  useEffect(() => {
    panPreviewMap(stadiumCenter, { instant: true })
  }, [stadiumCenter, panPreviewMap])

  if (!stadium) return null

  const buildMapUrl = (params = {}) => {
    const baseParams = new URLSearchParams()
    if (stadium.stadiumName) baseParams.set("stadium", stadium.stadiumName)
    if (stadium._id) baseParams.set("stadiumId", stadium._id)
    if (stadium.category) baseParams.set("category", stadium.category)
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        baseParams.set(key, String(value))
      }
    })
    return `/map?${baseParams.toString()}`
  }

  const openMapView = () => {
    navigate(
      buildMapUrl({
        lat: stadiumCenter.lat,
        lng: stadiumCenter.lng,
        follow: 0,
      }),
    )
  }

  const openMapForAreaCreation = () => {
    navigate(
      buildMapUrl({
        lat: stadiumCenter.lat,
        lng: stadiumCenter.lng,
        draw: 1,
        follow: 0,
      }),
    )
  }

  const openAreaOnMap = (area) => {
    const centroid = getAreaCentroid(area) || stadiumCenter
    navigate(
      buildMapUrl({
        lat: centroid.lat,
        lng: centroid.lng,
        areaId: area._id,
        follow: 0,
      }),
    )
  }

  const totalPages = Math.ceil(sortedAreas.length / PAGE_SIZE) || 1
  const startIndex = (page - 1) * PAGE_SIZE
  const pagedAreas = sortedAreas.slice(startIndex, startIndex + PAGE_SIZE)

  const changePage = (nextPage) => {
    if (nextPage < 1 || nextPage > totalPages) return
    setPage(nextPage)
  }

  const openCommunityComposer = () => {
    if (!isLoggedIn) {
      alert("글쓰기는 로그인 후 이용해 주세요.")
      return
    }
    navigate(`/stadium/${id}/community/new`, { state: { stadium, activeTab: "community" } })
  }

  const openCommunityPost = (post) => {
    if (!post?._id) return
    navigate(`/stadium/${id}/community/${post._id}`, { state: { stadium, post, activeTab: "community" } })
  }

  const geolocationSupported = typeof navigator !== "undefined" && !!navigator.geolocation

  const recenterPreviewToStadium = (event) => {
    if (event) event.stopPropagation()
    panPreviewMap(stadiumCenter)
  }

  const handlePreviewLocateMe = (event) => {
    event.stopPropagation()
    if (!geolocationSupported) {
      alert("현재 브라우저에서 내 위치를 확인할 수 없습니다.")
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextCenter = { lat: position.coords.latitude, lng: position.coords.longitude }
        setUserLocation(nextCenter)
        panPreviewMap(nextCenter)
      },
      (error) => {
        console.error("failed to fetch current location", error)
        alert("내 위치를 불러오지 못했어요. 위치 접근을 허용해주세요.")
      },
      { enableHighAccuracy: true, maximumAge: 8000, timeout: 15000 },
    )
  }


  return (
    <div className="page">
      <section className="page-hero">
        <h1 className="page-hero__title">{stadium.stadiumName}</h1>
        <p className="page-hero__subtitle">
          {stadium.teamName} · {stadium.city || "도시 정보 없음"}
        </p>
        <div className="pill-group">
          <span className="pill">주차 구역 {areas.length}곳</span>
        </div>
      </section>

      <div className="tab-nav">
        <button
          type="button"
          className={`tab-nav__btn ${activeTab === "parking" ? "is-active" : ""}`}
          onClick={() => setActiveTab("parking")}
        >
          주차 정보
        </button>
        <button
          type="button"
          className={`tab-nav__btn ${activeTab === "community" ? "is-active" : ""}`}
          onClick={() => setActiveTab("community")}
        >
          커뮤니티
        </button>
      </div>

      {activeTab === "parking" && (
        <>
          <div className="map-preview" onClick={openMapView} role="button" tabIndex={0}>
            <Map
              center={mapCenter || stadiumCenter}
              style={{ width: "100%", height: 340 }}
              level={3}
              isPanto
              onCreate={(map) => {
                previewMapRef.current = map
                const target = mapCenter || stadiumCenter
                if (window?.kakao?.maps && target) {
                  map.setCenter(new window.kakao.maps.LatLng(target.lat, target.lng))
                }
              }}
            >
              <MapMarker position={stadiumCenter} />
              {userLocation && (
                <CustomOverlayMap position={userLocation}>
                  <div className="user-location-marker">
                    <span className="user-location-marker__arrow" />
                  </div>
                </CustomOverlayMap>
              )}
            </Map>
            <div className="map-preview__controls" onClick={(event) => event.stopPropagation()}>
              <button type="button" className="map-preview__control" onClick={recenterPreviewToStadium}>
                경기장
              </button>
              <button
                type="button"
                className="map-preview__control"
                onClick={handlePreviewLocateMe}
                disabled={!geolocationSupported}
              >
                내 위치
              </button>
            </div>
          </div>
          <p className="map-preview__hint">지도를 눌러 보다 많은 주차 구역을 확인해 보세요.</p>

          <section className="section">
            <div className="section__head">
              <h2>주차 구역 목록</h2>
              {sortedAreas.length > 0 && (
                <div className="stadium-sort">
                  <span>총 {sortedAreas.length}곳</span>
                  <div className="stadium-sort__options">
                    <button
                      type="button"
                      className={sortMode === "congestion" ? "is-active" : ""}
                      onClick={() => setSortMode("congestion")}
                    >
                      혼잡도 낮은 순
                    </button>
                    <button
                      type="button"
                      className={sortMode === "upvote" ? "is-active" : ""}
                      onClick={() => setSortMode("upvote")}
                    >
                      추천 많은 순
                    </button>
                  </div>
                </div>
              )}
            </div>

            {loadingAreas && <div className="empty-state">주차 구역을 불러오는 중입니다...</div>}

            {!loadingAreas && sortedAreas.length === 0 && (
              <div className="empty-state">
                아직 등록된 주차 구역이 없습니다.
                <br />
                지도를 열어 첫 번째 정보를 공유해 주세요!
              </div>
            )}

            {!loadingAreas && sortedAreas.length > 0 && (
              <div className="card-grid">
                {pagedAreas.map((area) => {
                  const saves = area.upvoteCount || 0
                  const avg = getAverageCongestion(area)
                  return (
                    <button key={area._id} type="button" className="list-card" onClick={() => openAreaOnMap(area)}>
                      <div className="list-card__header">
                        <h3 className="list-card__title">{area.title}</h3>
                        <span className="list-card__meta">
                          등록일 {area.createdAt ? new Date(area.createdAt).toLocaleDateString() : "-"}
                        </span>
                      </div>
                      <div className="list-card__meta">
                        혼잡도 {avg !== null ? `${avg.toFixed(1)} / 5` : "데이터 없음"} · 즐겨찾기 {saves}회
                      </div>
                    
                      <div class="list-card__meta" style={{ color: "#64748b" }}>
                        제보자 {getAreaCreatorName(area)}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {!loadingAreas && sortedAreas.length > PAGE_SIZE && (
              <div className="pagination">
                <button type="button" onClick={() => changePage(page - 1)} disabled={page === 1}>
                  이전
                </button>
                {Array.from({ length: totalPages }).map((_, idx) => {
                  const pageNumber = idx + 1
                  const active = pageNumber === page
                  return (
                    <button
                      type="button"
                      key={pageNumber}
                      onClick={() => changePage(pageNumber)}
                      className={active ? "is-active" : undefined}
                    >
                      {pageNumber}
                    </button>
                  )
                })}
                <button type="button" onClick={() => changePage(page + 1)} disabled={page === totalPages}>
                  다음
                </button>
              </div>
            )}
          </section>

          <div className="stadium-actions">
            <button type="button" className="cta-button" onClick={openMapForAreaCreation}>
              지도에서 새로운 주차 구역 제보하기
            </button>
          </div>
        </>
      )}

      {activeTab === "community" && (
        <section className="community-section">
          <div className="community-intro">
            <div>
              <p>
                여기서 직접 다녀온 주차 팁과 관람 후기를 이곳에 남겨 주세요. 이 게시판은 자유롭게 소통하는
                커뮤니티예요.
              </p>
            </div>
            <button
              type="button"
              className="cta-button"
              onClick={openCommunityComposer}
            >
              글쓰기
            </button>
          </div>

          <div className="community-toolbar">
            <div className="community-toolbar__left">
              <button
                type="button"
                className={`pill-button ${communitySort === "latest" ? "is-active" : ""}`}
                onClick={() => setCommunitySort("latest")}
              >
                최신순
              </button>
              <button
                type="button"
                className={`pill-button ${communitySort === "popular" ? "is-active" : ""}`}
                onClick={() => setCommunitySort("popular")}
              >
                인기글
              </button>
              <span className="community-count">총 {communityPosts.length}건</span>
            </div>
            <div className="community-toolbar__right">
              <label className="community-search">
                <span className="sr-only">게시글 검색</span>
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="제목, 내용, 댓글 검색"
                />
              </label>
              {searchTerm && (
                <button type="button" className="pill-button" onClick={() => setSearchTerm("")}>
                  초기화
                </button>
              )}
            </div>
          </div>

          {communityLoading ? (
            <div className="empty-state">게시글을 불러오는 중입니다...</div>
          ) : communityError ? (
            <div className="empty-state">{communityError}</div>
          ) : communityPosts.length === 0 ? (
            <div className="empty-state">아직 글이 없습니다. 첫 번째 후기를 남겨 보세요!</div>
          ) : (
            <div className="community-board">
              <div className="community-board__body">
                {communityPosts.map((post) => {
                  const createdAtText = formatDateTime(post.createdAt)
                  const views = post.views ?? 0
                  const recommends = post.recommendCount ?? 0
                  return (
                    <button
                      key={post._id}
                      type="button"
                      className="community-board__row"
                      onClick={() => openCommunityPost(post)}
                    >
                      <div className="community-board__title">{post.title}</div>
                      <div className="community-board__meta">
                        <span>{createdAtText}</span>
                        <span>{post.authorName || "익명"}</span>
                        <span className="community-board__meta-icon" aria-label="조회수">
                          👁 {views}
                        </span>
                        <span className="community-board__meta-icon" aria-label="추천수">
                          👍 {recommends}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

        </section>
      )}
    </div>
  )
}
