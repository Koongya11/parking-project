import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Map, Polygon, DrawingManager, Toolbox, MapMarker, Polyline } from "react-kakao-maps-sdk"
import { useLocation, useNavigate, useSearchParams } from "react-router-dom"
import api from "../api"
import "../App.css"
import { useAuth } from "../context/AuthContext"

const DEFAULT_CENTER = { lat: 37.566826, lng: 126.9786567 }

const toNumber = (value) => {
  const parsed = parseFloat(value)
  return Number.isFinite(parsed) ? parsed : null
}

const getIdString = (value) => {
  if (!value) return ""
  if (typeof value === "string") return value
  if (typeof value === "object" && value._id) return value._id.toString()
  if (typeof value === "object" && typeof value.toString === "function") return value.toString()
  return ""
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

const getPolygonColor = (area) => {
  const scoreCount = area.congestionScoreCount || 0
  const scoreSum = area.congestionScoreSum || 0
  if (scoreCount > 0) {
    const avg = scoreSum / scoreCount
    if (avg <= 1) return "#22c55e"
    if (avg <= 2) return "#65a30d"
    if (avg <= 3.5) return "#f59e0b"
    if (avg <= 4.5) return "#f97316"
    return "#dc2626"
  }

  const total = (area.successCount || 0) + (area.failureCount || 0)
  if (total === 0) return "#8AA3FF"
  const ratio = (area.failureCount || 0) / total
  if (ratio < 0.3) return "#39DE2A"
  if (ratio < 0.6) return "#FFD700"
  return "#FF4D4F"
}

const formatDistance = (distance) => {
  if (distance === undefined || distance === null) return null
  if (distance < 1000) return `${Math.round(distance)}m`
  return `${(distance / 1000).toFixed(1)}km`
}

const formatDuration = (duration) => {
  if (duration === undefined || duration === null) return null
  const minutes = Math.round(duration / 60)
  if (minutes < 60) return `${minutes}분`
  const hours = Math.floor(minutes / 60)
  const remain = minutes % 60
  if (remain === 0) return `${hours}시간`
  return `${hours}시간 ${remain}분`
}

export default function MapPage() {
  const navigate = useNavigate()
  const { user, isLoggedIn, refreshUser } = useAuth()
  const [search] = useSearchParams()
  const location = useLocation()

  const initialLat = toNumber(search.get("lat"))
  const initialLng = toNumber(search.get("lng"))
  const initialCenter = initialLat !== null && initialLng !== null ? { lat: initialLat, lng: initialLng } : DEFAULT_CENTER

  const followUser = search.get("follow") !== "0"
  const areaIdFromQuery = search.get("areaId") || ""
  const stadiumName = search.get("stadium") || ""
  const isDrawMode = search.get("draw") === "1"

  const [mapCenter, setMapCenter] = useState(initialCenter)
  const [parkingAreas, setParkingAreas] = useState([])
  const [myLocation, setMyLocation] = useState(null)
  const [selectedAreaId, setSelectedAreaId] = useState("")
  const [routeCoords, setRouteCoords] = useState([])
  const [routeSummary, setRouteSummary] = useState(null)
  const [routeLoading, setRouteLoading] = useState(false)
  const [routeError, setRouteError] = useState("")
  const [isGuiding, setIsGuiding] = useState(false)
  const [showFeedbackForm, setShowFeedbackForm] = useState(false)
  const [congestionScore, setCongestionScore] = useState(2.5)
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [pendingSaveAction, setPendingSaveAction] = useState(null)

  const [drawingManager, setDrawingManager] = useState(null)
  const savingRef = useRef(false)
  const previousFullScreenRef = useRef(false)
  const lastRouteKeyRef = useRef("")
  const initialAreaHandledRef = useRef(false)

  const [isFullScreen, setIsFullScreen] = useState(() => Boolean(stadiumName) || isDrawMode)

  const selectedArea = useMemo(
    () => parkingAreas.find((area) => area._id === selectedAreaId) || null,
    [parkingAreas, selectedAreaId],
  )

  const savedAreaIds = useMemo(() => {
    const list = user?.savedAreas || []
    return new Set(list.map((entry) => getIdString(entry._id ?? entry)))
  }, [user])

  const selectedPos = useMemo(() => (selectedArea ? getAreaCentroid(selectedArea) : null), [selectedArea])

  const averageCongestion = useMemo(() => {
    if (!selectedArea?.congestionScoreCount) return null
    return selectedArea.congestionScoreSum / selectedArea.congestionScoreCount
  }, [selectedArea])

  const selectedAreaIdString = selectedArea ? getIdString(selectedArea._id) : ""
  const isSaved = selectedAreaIdString ? savedAreaIds.has(selectedAreaIdString) : false

  const geolocationSupported = typeof window !== "undefined" && "geolocation" in navigator
  const hideHeader = Boolean(stadiumName)

  useEffect(() => {
    if (typeof window === "undefined") return undefined

    const { style: bodyStyle } = document.body
    const { style: htmlStyle } = document.documentElement

    const prevBodyOverflow = bodyStyle.overflow
    const prevHtmlOverflow = htmlStyle.overflow
    const prevBodyHeight = bodyStyle.height
    const prevHtmlHeight = htmlStyle.height

    bodyStyle.overflow = "hidden"
    htmlStyle.overflow = "hidden"
    bodyStyle.height = "100%"
    htmlStyle.height = "100%"

    return () => {
      bodyStyle.overflow = prevBodyOverflow
      htmlStyle.overflow = prevHtmlOverflow
      bodyStyle.height = prevBodyHeight
      htmlStyle.height = prevHtmlHeight
    }
  }, [])

  useEffect(() => {
    const lat = toNumber(search.get("lat"))
    const lng = toNumber(search.get("lng"))
    if (lat !== null && lng !== null) {
      setMapCenter({ lat, lng })
    }
  }, [search])

  useEffect(() => {
    if (isDrawMode && drawingManager && window.kakao?.maps?.drawing) {
      setIsFullScreen(true)
      drawingManager.select(window.kakao.maps.drawing.OverlayType.POLYGON)
    }
  }, [isDrawMode, drawingManager])

  useEffect(() => {
    if (isDrawMode) {
      const token = localStorage.getItem("USER_TOKEN")
      if (!token) {
        alert("Log in to add a parking area.")
        window.location.href = "/login"
      }
    }
  }, [isDrawMode])

  useEffect(() => {
    api
      .get("/parking-areas")
      .then((response) => {
        let data = response.data || []
        if (stadiumName) {
          data = data.filter((area) => area.stadiumName === stadiumName)
        }
        setParkingAreas(data)
      })
      .catch((err) => {
        console.error("Failed to fetch parking areas:", err)
      })
  }, [stadiumName])

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newPos = { lat: position.coords.latitude, lng: position.coords.longitude }
        setMyLocation(newPos)
        if (followUser && !selectedAreaId) {
          setMapCenter(newPos)
        }
      },
      (err) => {
        console.error("Geolocation error:", err)
      },
    )
  }, [followUser, selectedAreaId])

  useEffect(() => {
    setSelectedAreaId("")
    setRouteCoords([])
    setRouteSummary(null)
    setRouteError("")
    setIsGuiding(false)
    setShowFeedbackForm(false)
  }, [location.pathname])

  useEffect(() => {
    initialAreaHandledRef.current = false
  }, [areaIdFromQuery])

  const fetchRouteFor = useCallback(
    async (area, { recenter = false, force = false, silent = false } = {}) => {
      if (!area) return
      const centroid = getAreaCentroid(area)
      const shouldToggleLoading = !silent

      if (shouldToggleLoading) {
        setRouteLoading(true)
        setRouteError("")
      }

      if (!centroid) {
        setRouteCoords([])
        setRouteSummary(null)
        setRouteError("목적지 좌표를 확인할 수 없습니다.")
        if (shouldToggleLoading) setRouteLoading(false)
        return
      }

      if (!myLocation) {
        setRouteCoords([])
        setRouteSummary(null)
        setRouteError("현재 위치를 확인할 수 없습니다. 위치 접근을 허용해주세요.")
        if (shouldToggleLoading) setRouteLoading(false)
        return
      }

      const key = `${myLocation.lat},${myLocation.lng}|${centroid.lat},${centroid.lng}`
      if (!force && lastRouteKeyRef.current === key) {
        if (shouldToggleLoading) setRouteLoading(false)
        return
      }

      if (recenter) {
        setMapCenter({ lat: centroid.lat, lng: centroid.lng })
      }

      try {
        const { data } = await api.get("/navigation/route", {
          params: {
            originLat: myLocation.lat,
            originLng: myLocation.lng,
            destLat: centroid.lat,
            destLng: centroid.lng,
          },
        })
        lastRouteKeyRef.current = key
        setRouteCoords(Array.isArray(data.path) ? data.path : [])
        setRouteSummary(data.summary || null)
      } catch (error) {
        console.error("Failed to load route:", error)
        const message = error?.response?.data?.message || "경로 정보를 불러올 수 없습니다."
        setRouteError(message)
        setRouteCoords([])
        setRouteSummary(null)
      } finally {
        if (shouldToggleLoading) setRouteLoading(false)
      }
    },
    [myLocation],
  )

  const recenterToMyLocation = useCallback(() => {
    if (myLocation) {
      setMapCenter(myLocation)
      return
    }

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      alert("현재 브라우저에서 위치 기능을 지원하지 않습니다.")
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newPos = { lat: position.coords.latitude, lng: position.coords.longitude }
        setMyLocation(newPos)
        setMapCenter(newPos)
      },
      (error) => {
        console.error("Geolocation error:", error)
        alert("현재 위치를 가져올 수 없습니다.")
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 },
    )
  }, [myLocation])

  const handleAreaSelect = useCallback(
    (area, { recenter = true, silent = false } = {}) => {
      if (!area) return
      lastRouteKeyRef.current = ""
      setSelectedAreaId(area._id)
      setRouteCoords([])
      setRouteSummary(null)
      setRouteError("")
      setIsGuiding(false)
      setShowFeedbackForm(false)
      setCongestionScore(2.5)
      const centroid = getAreaCentroid(area)
      if (centroid) {
        setMapCenter({ lat: centroid.lat, lng: centroid.lng })
      }
      fetchRouteFor(area, { recenter, force: true, silent })
    },
    [fetchRouteFor],
  )

  useEffect(() => {
    if (!areaIdFromQuery || initialAreaHandledRef.current) return
    if (!parkingAreas.length) return
    const area = parkingAreas.find((item) => item._id === areaIdFromQuery)
    if (!area) return
    initialAreaHandledRef.current = true
    handleAreaSelect(area, { recenter: true })
  }, [areaIdFromQuery, parkingAreas, handleAreaSelect])

  useEffect(() => {
    if (!selectedAreaId) return
    const area = parkingAreas.find((item) => item._id === selectedAreaId)
    if (!area) return
    fetchRouteFor(area, { silent: true })
  }, [myLocation, selectedAreaId, parkingAreas, fetchRouteFor])

  const openExternalMap = (area) => {
    const centroid = getAreaCentroid(area)
    if (!centroid) {
      alert("목적지 좌표를 확인할 수 없습니다.")
      return
    }
    const url = `https://map.kakao.com/link/to/${encodeURIComponent(area.title)},${centroid.lat},${centroid.lng}`
    window.open(url, "_blank")
  }

  const closeRoutePanel = () => {
    lastRouteKeyRef.current = ""
    setSelectedAreaId("")
    setRouteCoords([])
    setRouteSummary(null)
    setRouteError("")
    setIsGuiding(false)
    setShowFeedbackForm(false)
  }

  const handleStartGuidance = () => {
    if (!selectedArea) return
    previousFullScreenRef.current = isFullScreen
    setIsFullScreen(true)
    setIsGuiding(true)
    setShowFeedbackForm(false)
  }

  const handleStopGuidance = () => {
    setIsGuiding(false)
    setIsFullScreen(previousFullScreenRef.current)
    setShowFeedbackForm(true)
    setCongestionScore(2.5)
  }

  const submitCongestionScore = async () => {
    if (!selectedArea) return
    setFeedbackSubmitting(true)
    try {
      const { data } = await api.post(`/parking-areas/${selectedArea._id}/feedback`, { score: congestionScore })
      setParkingAreas((prev) => prev.map((area) => (area._id === data._id ? data : area)))
      alert("혼잡도 평가가 저장되었습니다.")
      setShowFeedbackForm(false)
    } catch (error) {
      console.error("Failed to submit congestion score:", error)
      const message = error?.response?.data?.message || "혼잡도 평가를 저장할 수 없습니다."
      alert(message)
    } finally {
      setFeedbackSubmitting(false)
    }
  }

  const handleSaveArea = async () => {
    if (!selectedArea || saveLoading) return
    if (!isLoggedIn) {
      if (window.confirm("구역을 저장하려면 로그인해야 합니다. 지금 로그인 페이지로 이동할까요?")) {
        navigate("/login")
      }
      return
    }

    const nextAction = isSaved ? "unsave" : "save"
    setPendingSaveAction(nextAction)
    setSaveLoading(true)
    try {
      const { data } = await api.post(`/parking-areas/${selectedArea._id}/save`)
      const updatedArea = data?.area ?? selectedArea
      setParkingAreas((prev) => prev.map((area) => (area._id === updatedArea._id ? updatedArea : area)))
      await refreshUser()
      if (data?.saved === true) {
        alert("이 주차 구역이 저장되었습니다.")
      } else if (data?.saved === false) {
        alert("이 주차 구역 저장이 취소되었습니다.")
      }
    } catch (error) {
      console.error("Failed to save parking area:", error)
      const message = error?.response?.data?.message || "이 구역의 저장 상태를 변경할 수 없습니다."
      alert(message)
    } finally {
      setSaveLoading(false)
      setPendingSaveAction(null)
    }
  }

  const handleDrawEnd = (manager) => {
    if (savingRef.current) return
    const data = manager.getData()
    const polygons = data.polygon || []
    const polygonObject = polygons[polygons.length - 1]
    if (!polygonObject) return
    const polygonPath = polygonObject.points

    if (Array.isArray(polygonPath)) {
      const newPolygonCoordinates = polygonPath.map((point) => [point.x, point.y])
      const title = window.prompt("새 주차 구역 이름을 입력해주세요:")
      if (!title) {
        manager.clear()
        manager.cancel?.()
        return
      }

      savingRef.current = true

      const newArea = {
        _id: Date.now().toString(),
        category: search.get("category") || "UNKNOWN",
        stadiumName: stadiumName || "미확인",
        title,
        polygon: { type: "Polygon", coordinates: [newPolygonCoordinates] },
      }

      setParkingAreas((prev) => [...prev, newArea])

      const headers = { "x-user-token": localStorage.getItem("USER_TOKEN") || "" }
      api
        .post("/parking-areas", newArea, { headers })
        .then((response) => {
          alert("새 주차 구역이 등록되었습니다.")
          setParkingAreas((prev) => prev.map((area) => (area._id === newArea._id ? response.data : area)))
        })
        .catch((err) => {
          console.error("Failed to create parking area:", err)
          alert("저장에 실패했습니다. 잠시 후 다시 시도해주세요.")
          setParkingAreas((prev) => prev.filter((area) => area._id !== newArea._id))
        })
        .finally(() => {
          manager.clear()
          manager.cancel?.()
          savingRef.current = false
        })
    }
  }

  const toggleFullScreen = () => {
    if (isGuiding) return
    setIsFullScreen((prev) => !prev)
  }

  const locateButtonBottom = selectedArea && !isGuiding && !showFeedbackForm ? 260 : 24

  return (
    <div className={`App ${isFullScreen ? "fullscreen-map" : ""}`}>
      {!isFullScreen && !hideHeader && (
        <header className="App-header">
          <h1>주차 지도</h1>
        </header>
      )}

      <div className={`map-container ${isFullScreen ? "fullscreen" : ""}`}>
        <Map center={mapCenter} style={{ width: "100%", height: "100%" }} level={4}>
          {myLocation && <MapMarker position={myLocation} />}
          {selectedPos && <MapMarker position={selectedPos} />}

          {parkingAreas.map((area) => {
            const ring = area.polygon?.coordinates?.[0]
            if (!ring) return null
            const path = ring.map(([lng, lat]) => ({ lng, lat }))
            const color = getPolygonColor(area)
            const isSelected = selectedAreaId === area._id
            return (
              <Polygon
                key={area._id}
                path={path}
                strokeWeight={isSelected ? 5 : 3}
                strokeColor={isSelected ? "#3B82F6" : color}
                strokeOpacity={0.9}
                strokeStyle="solid"
                fillColor={color}
                fillOpacity={isSelected ? 0.6 : 0.45}
                onClick={() => handleAreaSelect(area)}
              />
            )
          })}

          {routeCoords.length > 0 && (
            <Polyline
              path={routeCoords.map((point) => ({ lat: point.lat, lng: point.lng }))}
              strokeWeight={6}
              strokeColor="#2563EB"
              strokeOpacity={0.8}
              strokeStyle="solid"
            />
          )}

          {isFullScreen && isDrawMode && (
            <DrawingManager
              onDrawend={handleDrawEnd}
              guideTooltip={["draw", "drag", "edit"]}
              drawingMode={["polygon"]}
              onCreate={(manager) => {
                setDrawingManager(manager)
              }}
            >
              <Toolbox />
            </DrawingManager>
          )}
        </Map>

        <button
          type="button"
          className="map-locate-btn"
          onClick={recenterToMyLocation}
          disabled={!geolocationSupported}
          style={{ bottom: locateButtonBottom }}
        >
          내 위치로
        </button>

        {!isGuiding && (
          <button className="toggle-fullscreen-btn" onClick={toggleFullScreen}>
            {isFullScreen ? "전체 화면 지도 종료" : "지도 전체 화면 보기"}
          </button>
        )}

        {isGuiding && (
          <button className="guide-exit-btn" type="button" onClick={handleStopGuidance}>
            길안내 종료
          </button>
        )}
      </div>

      {selectedArea && !isGuiding && !showFeedbackForm && (
        <div className="route-panel">
          <div className="route-panel__header">
            <div>
              <h2>{selectedArea.title}</h2>
              <p>{selectedArea.stadiumName || "경기장 정보가 없습니다."}</p>
              {averageCongestion !== null && (
                <p style={{ marginTop: 6, color: "#475569" }}>
                  최근 혼잡도 평균 {averageCongestion.toFixed(1)} / 5
                </p>
              )}
            </div>
            <button type="button" onClick={closeRoutePanel}>
              닫기
            </button>
          </div>

          <div className="route-panel__body">
            {routeLoading && <p className="route-panel__status">경로를 불러오는 중...</p>}
            {!routeLoading && routeError && (
              <p className="route-panel__status route-panel__status--error">{routeError}</p>
            )}
            {!routeLoading && !routeError && routeSummary && (
              <div className="route-panel__summary">
                <span>예상 소요 시간 {formatDuration(routeSummary.duration)}</span>
                <span>거리 {formatDistance(routeSummary.distance)}</span>
              </div>
            )}
            {!routeLoading && !routeError && !routeSummary && (
              <p className="route-panel__status">길안내를 받으려면 위치 접근을 허용해주세요.</p>
            )}
          </div>

          <div className="route-panel__actions">
            <button type="button" onClick={handleStartGuidance} disabled={!routeSummary}>
              길안내 시작
            </button>
            <button type="button" onClick={handleSaveArea} disabled={saveLoading}>
              {saveLoading
                ? pendingSaveAction === "unsave"
                  ? "해제 중..."
                  : "저장 중..."
                : isSaved
                ? "저장 취소"
                : "이 구역 저장"}
            </button>
            <button type="button" onClick={() => openExternalMap(selectedArea)}>카카오맵에서 열기</button>
          </div>
        </div>
      )}

      {showFeedbackForm && selectedArea && (
        <div className="feedback-overlay">
          <div className="feedback-card">
            <h2>혼잡도 평가</h2>
            <p>0(한산)부터 5(매우 혼잡)까지 0.5 단위로 평가해주세요.</p>
            <div className="feedback-slider">
              <div className="feedback-slider__scale">
                <span>0</span>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.5"
                  value={congestionScore}
                  onChange={(e) => setCongestionScore(parseFloat(e.target.value))}
                />
                <span>5</span>
              </div>
              <div className="feedback-score-display">{congestionScore.toFixed(1)} / 5</div>
            </div>
            <div className="feedback-actions">
              <button type="button" onClick={submitCongestionScore} disabled={feedbackSubmitting}>
                {feedbackSubmitting ? "저장 중..." : "평가 제출"}
              </button>
              <button type="button" onClick={() => setShowFeedbackForm(false)}>닫기</button>
            </div>
          </div>
        </div>
      )}

      {isFullScreen && isDrawMode && drawingManager && (
        <div
          style={{
            position: "fixed",
            top: 16,
            right: 16,
            zIndex: 2147483647,
            background: "rgba(255,255,255,.95)",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            padding: "8px 10px",
            display: "flex",
            gap: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,.15)",
            pointerEvents: "auto",
          }}
        >
          <button onClick={() => drawingManager.select(window.kakao.maps.drawing.OverlayType.POLYGON)}>
            다각형
          </button>
          <button onClick={() => drawingManager.cancel()}>취소</button>
          <button onClick={() => drawingManager.clear()}>초기화</button>
        </div>
      )}
    </div>
  )
}
