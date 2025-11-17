import React, { useCallback, useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { Map, MapMarker } from "react-kakao-maps-sdk"
import api from "../api"
import { useAuth } from "../context/AuthContext"

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
  const { isLoggedIn } = useAuth()

  const [stadium, setStadium] = useState(location.state?.stadium || null)
  const [areas, setAreas] = useState([])
  const [page, setPage] = useState(1)
  const [loadingAreas, setLoadingAreas] = useState(false)
  const [sortMode, setSortMode] = useState("congestion")

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

  if (!stadium) return null

  const [lng, lat] = stadium.location?.coordinates || [126.9786567, 37.566826]
  const center = { lat, lng }

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
        lat: center.lat,
        lng: center.lng,
        follow: 0,
      }),
    )
  }

  const openMapForAreaCreation = () => {
    navigate(
      buildMapUrl({
        lat: center.lat,
        lng: center.lng,
        draw: 1,
      }),
    )
  }

  const openAreaOnMap = (area) => {
    const centroid = getAreaCentroid(area) || center
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
            <Map center={center} style={{ width: "100%", height: 340 }} level={3}>
              <MapMarker position={center} />
            </Map>
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
              <div className="community-board__header">
                <span className="col-title">제목</span>
                <span className="col-author">작성자</span>
                <span className="col-date">등록일</span>
                <span className="col-views">조회</span>
                <span className="col-recommends">추천</span>
              </div>
              <div className="community-board__body">
                {communityPosts.map((post) => (
                  <button
                    key={post._id}
                    type="button"
                    className="community-board__row"
                    onClick={() => openCommunityPost(post)}
                  >
                    <span className="col-title">{post.title}</span>
                    <span className="col-author">{post.authorName || "익명"}</span>
                    <span className="col-date">
                      {post.createdAt ? new Date(post.createdAt).toLocaleString() : "-"}
                    </span>
                    <span className="col-views">{post.views ?? 0}</span>
                    <span className="col-recommends">{post.recommendCount ?? 0}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

        </section>
      )}
    </div>
  )
}
