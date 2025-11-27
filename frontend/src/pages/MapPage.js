import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { Map, Polygon, DrawingManager, MapMarker, Polyline, CustomOverlayMap } from "react-kakao-maps-sdk"

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



const getUserDisplayName = (user) => {

  if (!user) return "익명"

  if (typeof user.nickname === "string" && user.nickname.trim()) return user.nickname.trim()

  if (typeof user.name === "string" && user.name.trim()) return user.name.trim()

  if (typeof user.email === "string" && user.email.includes("@")) return user.email.split("@")[0]

  return "익명"

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

const toRadians = (value) => (value * Math.PI) / 180
const toDegrees = (value) => (value * 180) / Math.PI
const getDistanceMeters = (from, to) => {
  if (!from || !to) return 0
  const R = 6371000
  const dLat = toRadians(to.lat - from.lat)
  const dLng = toRadians(to.lng - from.lng)
  const lat1 = toRadians(from.lat)
  const lat2 = toRadians(to.lat)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

const getBearingDegrees = (from, to) => {
  if (!from || !to) return null
  const lat1 = toRadians(from.lat)
  const lat2 = toRadians(to.lat)
  const dLng = toRadians(to.lng - from.lng)
  const y = Math.sin(dLng) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
  const bearing = toDegrees(Math.atan2(y, x))
  if (Number.isNaN(bearing)) return null
  return bearing
}

const MIN_HEADING_DISTANCE = 3


export default function MapPage() {

  const navigate = useNavigate()

  const { user, isLoggedIn, refreshUser } = useAuth()

  const [search, setSearch] = useSearchParams()

  const location = useLocation()



  const initialLat = toNumber(search.get("lat"))

  const initialLng = toNumber(search.get("lng"))

  const initialCenter = initialLat !== null && initialLng !== null ? { lat: initialLat, lng: initialLng } : DEFAULT_CENTER



  const followUser = search.get("follow") !== "0"

  const areaIdFromQuery = search.get("areaId") || ""

  const stadiumName = search.get("stadium") || ""

  const stadiumId = search.get("stadiumId") || ""

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

  const [areaNamingModal, setAreaNamingModal] = useState({ open: false, polygon: null, manager: null })

  const [areaNameInput, setAreaNameInput] = useState("")

  const [areaNamingError, setAreaNamingError] = useState("")

  const [areaNamingSubmitting, setAreaNamingSubmitting] = useState(false)

  const [areaSavingStatus, setAreaSavingStatus] = useState({ message: "", type: "" })

  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false)

  const [feedbackNotice, setFeedbackNotice] = useState(null)

  const [saveLoading, setSaveLoading] = useState(false)

  const [pendingSaveAction, setPendingSaveAction] = useState(null)



  const [drawingManager, setDrawingManager] = useState(null)



  const updateMapCenter = useCallback(

    (center) => {

      if (!center || typeof center.lat !== "number" || typeof center.lng !== "number") return

      setMapCenter({ lat: center.lat, lng: center.lng })

    },

    [setMapCenter],

  )

  const savingRef = useRef(false)

  const previousFullScreenRef = useRef(false)

  const lastRouteKeyRef = useRef("")

  const initialAreaHandledRef = useRef(false)

  const locationWatchId = useRef(null)
  const previousLocationRef = useRef(null)
  const [travelHeading, setTravelHeading] = useState(null)
  const [isFullScreen, setIsFullScreen] = useState(() => Boolean(stadiumName) || isDrawMode)


  const updateHeadingFromMovement = useCallback((nextPos) => {
    if (!nextPos) return
    const prev = previousLocationRef.current
    if (prev) {
      const moved = getDistanceMeters(prev, nextPos)
      if (moved >= MIN_HEADING_DISTANCE) {
        const bearing = getBearingDegrees(prev, nextPos)
        if (Number.isFinite(bearing)) {
          setTravelHeading(bearing)
        }
      }
    }
    previousLocationRef.current = nextPos
  }, [])

  useEffect(() => {
    if (!showFeedbackForm) {
      setFeedbackNotice(null)
    }
  }, [showFeedbackForm])



  useEffect(() => {

    if (!areaSavingStatus.message) return

    const timer = setTimeout(() => {

      setAreaSavingStatus({ message: "", type: "" })

    }, 2800)

    return () => clearTimeout(timer)

  }, [areaSavingStatus])



  const exitDrawMode = useCallback(() => {

    const next = new URLSearchParams(search)

    next.delete("draw")

    setSearch(next, { replace: true })

  }, [search, setSearch])



  const startDrawing = useCallback(() => {

    if (!drawingManager || !window.kakao?.maps?.drawing) return

    drawingManager.select(window.kakao.maps.drawing.OverlayType.POLYGON)

  }, [drawingManager])



  const cancelDrawingMode = useCallback(() => {

    drawingManager?.cancel?.()

    drawingManager?.clear?.()

    exitDrawMode()

  }, [drawingManager, exitDrawMode])



  const closeAreaNamingFlow = useCallback(() => {

    setAreaNamingModal({ open: false, polygon: null, manager: null })

    setAreaNameInput("")

    setAreaNamingError("")

  }, [])



  const clearDrawingOverlay = useCallback(() => {

    const manager = areaNamingModal.manager || drawingManager

    manager?.clear()

    manager?.cancel?.()

  }, [areaNamingModal.manager, drawingManager])



  const handleCancelAreaNaming = useCallback(() => {

    clearDrawingOverlay()

    closeAreaNamingFlow()

  }, [clearDrawingOverlay, closeAreaNamingFlow])



  const handleAreaNamingSubmit = useCallback(async () => {

    if (!areaNamingModal.polygon) {

      setAreaNamingError("영역 정보를 찾지 못했습니다.")

      return

    }

    const name = areaNameInput.trim()

    if (!name) {

      setAreaNamingError("주차 구역 이름을 입력해주세요.")

      return

    }



    setAreaNamingError("")

    savingRef.current = true

    setAreaNamingSubmitting(true)



    const manager = areaNamingModal.manager || drawingManager

    const newArea = {

      _id: Date.now().toString(),

      category: search.get("category") || "UNKNOWN",

      stadiumName: stadiumName || "미확인",

      title: name,

      polygon: { type: "Polygon", coordinates: [areaNamingModal.polygon] },

      createdByName: getUserDisplayName(user),

    }

    if (stadiumId) {

      newArea.stadiumId = stadiumId

    }



    setParkingAreas((prev) => [...prev, newArea])

    closeAreaNamingFlow()



    const headers = { "x-user-token": localStorage.getItem("USER_TOKEN") || "" }

    try {

      const { data } = await api.post("/parking-areas", newArea, { headers })

      const storedArea = data?.area ?? data

      if (storedArea && storedArea._id) {

        setParkingAreas((prev) => prev.map((area) => (area._id === newArea._id ? storedArea : area)))

      }

      setAreaSavingStatus({ message: "새 주차 구역이 등록되었습니다.", type: "success" })

    } catch (error) {

      console.error("Failed to create parking area:", error)

      const message = error?.response?.data?.message || "등록에 실패했습니다. 잠시 후 다시 시도해주세요."

      setAreaSavingStatus({ message, type: "error" })

      setParkingAreas((prev) => prev.filter((area) => area._id !== newArea._id))

    } finally {

      clearDrawingOverlay()

      savingRef.current = false

      setAreaNamingSubmitting(false)

    }

  }, [

    areaNameInput,

    areaNamingModal,

    drawingManager,

    search,

    stadiumId,

    stadiumName,

    user,

    closeAreaNamingFlow,

    clearDrawingOverlay,

  ])



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

  const routeHeading = useMemo(() => {
    if (!routeCoords || routeCoords.length < 2) return null
    for (let i = 1; i < routeCoords.length; i += 1) {
      const from = routeCoords[i - 1]
      const to = routeCoords[i]
      const distance = getDistanceMeters(from, to)
      if (distance >= MIN_HEADING_DISTANCE) {
        return getBearingDegrees(from, to)
      }
    }
    return null
  }, [routeCoords])

  const effectiveHeading = Number.isFinite(travelHeading) ? travelHeading : routeHeading
  const hasHeading = Number.isFinite(effectiveHeading)
  const normalizedHeading = useMemo(() => {
    if (!hasHeading) return 0
    const mod = effectiveHeading % 360
    return mod < 0 ? mod + 360 : mod
  }, [effectiveHeading, hasHeading])
  const shouldRotateMap = isGuiding && hasHeading
  const arrowHeading = hasHeading ? normalizedHeading : 0


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

      updateMapCenter({ lat, lng })

    }

  }, [search, updateMapCenter])



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

          const filteredByName = data.filter((area) => area.stadiumName === stadiumName)

          if (filteredByName.length > 0) {

            data = filteredByName

          }

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
        updateHeadingFromMovement(newPos)
        if (followUser && !selectedAreaId) {
          updateMapCenter(newPos)
        }
      },
      (err) => {

        console.error("Geolocation error:", err)

      },

    )

  }, [followUser, selectedAreaId, updateMapCenter, updateHeadingFromMovement])


  useEffect(() => {

    if (typeof navigator === "undefined" || !navigator.geolocation) return undefined



    if (isGuiding || followUser) {

      const watchId = navigator.geolocation.watchPosition(

        (position) => {

          const newPos = { lat: position.coords.latitude, lng: position.coords.longitude }
          setMyLocation(newPos)
          updateHeadingFromMovement(newPos)
          if (isGuiding || followUser) {
            updateMapCenter(newPos)
          }
        },

        (error) => {

          console.error("geolocation watch error", error)

        },

        { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },

      )

      locationWatchId.current = watchId

      return () => {

        navigator.geolocation.clearWatch(watchId)

        locationWatchId.current = null

      }

    }



    if (locationWatchId.current !== null) {

      navigator.geolocation.clearWatch(locationWatchId.current)

      locationWatchId.current = null

    }



    return undefined

  }, [isGuiding, followUser, updateMapCenter, updateHeadingFromMovement])


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

        updateMapCenter({ lat: centroid.lat, lng: centroid.lng })

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

    [myLocation, updateMapCenter],

  )



  const recenterToMyLocation = useCallback(() => {
    if (myLocation) {

      updateMapCenter(myLocation)

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
        updateHeadingFromMovement(newPos)
        updateMapCenter(newPos)
      },

      (error) => {

        console.error("Geolocation error:", error)

        alert("현재 위치를 가져올 수 없습니다.")

      },

      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 },

    )

  }, [myLocation, updateMapCenter, updateHeadingFromMovement])


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

        updateMapCenter({ lat: centroid.lat, lng: centroid.lng })

      }

      fetchRouteFor(area, { recenter, force: true, silent })

    },

    [fetchRouteFor, updateMapCenter],

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

    setFeedbackNotice(null)

    setCongestionScore(2.5)

  }



  const submitCongestionScore = async () => {

    if (!selectedArea) return

    if (!isLoggedIn) {

      setFeedbackNotice({ type: "error", message: "로그인 후 혼잡도를 평가할 수 있습니다." })

      return

    }

    setFeedbackNotice(null)

    setFeedbackSubmitting(true)

    try {

      const payload = { score: congestionScore }

      if (stadiumId) payload.stadiumId = stadiumId

      const { data } = await api.post(`/parking-areas/${selectedArea._id}/feedback`, payload)

      const updatedArea = data?.area ?? data

      if (updatedArea && updatedArea._id) {

        setParkingAreas((prev) => prev.map((area) => (area._id === updatedArea._id ? updatedArea : area)))

      }

      const successMessage = data?.message || "혼잡도 평가가 저장되었습니다."

      setFeedbackNotice({ type: "success", message: successMessage })

      setTimeout(() => {

        setShowFeedbackForm(false)

      }, 1600)

    } catch (error) {

      console.error("Failed to submit congestion score:", error)

      const message = error?.response?.data?.message || "혼잡도 평가를 저장할 수 없습니다."

      setFeedbackNotice({ type: "error", message })

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

        setAreaSavingStatus({ message: "이 주차 구역이 저장되었습니다.", type: "success" })

      } else if (data?.saved === false) {

        setAreaSavingStatus({ message: "이 주차 구역 저장이 취소되었습니다.", type: "success" })

      } else {

        setAreaSavingStatus({ message: "저장 상태가 변경되었습니다.", type: "success" })

      }

    } catch (error) {

      console.error("Failed to save parking area:", error)

      const message = error?.response?.data?.message || "이 구역의 저장 상태를 변경할 수 없습니다."

      setAreaSavingStatus({ message, type: "error" })

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



      setAreaNamingModal({



        open: true,



        polygon: polygonPath.map((point) => [point.x, point.y]),



        manager,



      })



      setAreaNameInput("")



      setAreaNamingError("")



    }



  }





const toggleFullScreen = () => {

    if (isGuiding) return

    setIsFullScreen((prev) => !prev)

  }



  const locateButtonBottom = selectedArea && !isGuiding && !showFeedbackForm ? 260 : 24

  const mapRotationAngle = shouldRotateMap ? -arrowHeading : 0
  const mapRotationStyle = shouldRotateMap
    ? { transform: `translate(-50%, -50%) rotate(${mapRotationAngle}deg)` }
    : { transform: "none" }



  return (

    <div className={`App ${isFullScreen ? "fullscreen-map" : ""}`}>

      {!isFullScreen && !hideHeader && (

        <header className="App-header">

          <h1>주차 지도</h1>

        </header>

      )}



      <div className={`map-container ${isFullScreen ? "fullscreen" : ""}`}>

        <div className="map-rotation-shell">

          <div

            className={`map-rotation-wrapper${shouldRotateMap ? " map-rotation-wrapper--active" : ""}`}

            style={mapRotationStyle}

          >

            <Map center={mapCenter} style={{ width: "100%", height: "100%" }} level={4}>

              {myLocation && (

                <CustomOverlayMap position={myLocation}>

                  <div className={`user-location-marker${isGuiding ? " user-location-marker--guiding" : ""}`}>

                    <span

                      className="user-location-marker__arrow"

                      style={{

                        transform: isGuiding ? `translateY(-2px) rotate(${arrowHeading}deg)` : "translateY(-2px)",

                      }}

                    />

                    {isGuiding && <span className="user-location-marker__pulse" />}

                  </div>

                </CustomOverlayMap>

              )}

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

                </DrawingManager>

              )}

            </Map>

          </div>

        </div>



        <button

          type="button"

          className={`map-locate-btn${isGuiding ? " map-locate-btn--guiding" : ""}`}

          onClick={recenterToMyLocation}

          disabled={!geolocationSupported}

          style={{ "--locate-bottom": `${locateButtonBottom}px` }}

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

              <p style={{ marginTop: 4, color: "#475569", fontSize: 14 }}>

                제보자 {getAreaCreatorName(selectedArea)}

              </p>

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



      {areaNamingModal.open && (

        <div className="map-modal-overlay">

          <div className="map-modal">

            <h3>새 주차 구역 이름</h3>

            <p>이 구역을 한눈에 알아볼 수 있는 이름을 입력해주세요.</p>

            <input

              type="text"

              value={areaNameInput}

              onChange={(e) => setAreaNameInput(e.target.value)}

              className="map-modal__input"

              autoFocus

            />

            {areaNamingError && <p className="map-modal__error">{areaNamingError}</p>}

            <div className="map-modal__actions">

              <button type="button" onClick={handleCancelAreaNaming} disabled={areaNamingSubmitting}>

                취소

              </button>

              <button type="button" onClick={handleAreaNamingSubmit} disabled={areaNamingSubmitting}>

                {areaNamingSubmitting ? "등록 중..." : "등록하기"}

              </button>

            </div>

          </div>

        </div>

      )}



      {areaSavingStatus.message && (

        <div

          className={`map-toast ${

            areaSavingStatus.type === "error" ? "map-toast--error" : "map-toast--success"

          }`}

        >

          {areaSavingStatus.message}

        </div>

      )}



      {showFeedbackForm && selectedArea && (

        <div className="feedback-overlay">

          <div className="feedback-card">

            <h2>혼잡도 평가</h2>

            <p>슬라이드를 움직여 현재 혼잡도를 알려주세요. 수치는 0.5 단위로 조정됩니다.</p>

            <div className="feedback-slider">

              <div className="feedback-slider__scale">

                <span className="feedback-slider__label feedback-slider__label--low">여유</span>

                <input

                  type="range"

                  min="0"

                  max="5"

                  step="0.5"

                  value={congestionScore}

                  onChange={(e) => setCongestionScore(parseFloat(e.target.value))}

                  className="feedback-slider__input"

                />

                <span className="feedback-slider__label feedback-slider__label--high">혼잡</span>

              </div>

              <div className="feedback-score-display">{congestionScore.toFixed(1)} / 5</div>

            </div>

            {feedbackNotice?.message && (

              <div className={`feedback-notice feedback-notice--${feedbackNotice.type}`}>{feedbackNotice.message}</div>

            )}

            {!isLoggedIn && <p className="feedback-hint">로그인 후 혼잡도를 평가할 수 있습니다.</p>}

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

        <div className="draw-manager-controls">

          <button type="button" className="cta-button" onClick={startDrawing}>

            추가

          </button>

          <button type="button" onClick={cancelDrawingMode}>

            취소

          </button>

        </div>

      )}

    </div>

  )

}













