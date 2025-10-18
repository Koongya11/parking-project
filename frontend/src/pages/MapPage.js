import React, { useEffect, useRef, useState } from "react"
import axios from "axios"
import {
    Map,
    Polygon,
    DrawingManager,
    Toolbox,
    MapMarker,
} from "react-kakao-maps-sdk"
import "../App.css"
import { useSearchParams } from "react-router-dom"


export default function MapPage() {
    const [parkingAreas, setParkingAreas] = useState([])
    const [mapCenter, setMapCenter] = useState({ lat: 37.566826, lng: 126.9786567 })
    const [isFullScreen, setIsFullScreen] = useState(false)
    const [myLocation, setMyLocation] = useState(null)
    const [selectedAreaId, setSelectedAreaId] = useState(null)
    const selectedArea = parkingAreas.find(a => a._id === selectedAreaId) || null

    const [search] = useSearchParams()
    const [dm, setDm] = useState(null)
    const savingRef = useRef(false)

    const stadiumName = search.get("stadium")

    const isDrawMode = search.get("draw") === "1"

    useEffect(() => {
        const lat = parseFloat(search.get("lat"))
        const lng = parseFloat(search.get("lng"))
        if (!isNaN(lat) && !isNaN(lng)) {
            setMapCenter({ lat, lng })
        }
    }, [search])

    // Automatically switch to fullscreen when navigating from stadium page
    useEffect(() => {
        if (stadiumName) setIsFullScreen(true)
    }, [stadiumName])

    // When draw=1, enable polygon drawing mode
    useEffect(() => {
        if (isDrawMode && dm && window.kakao?.maps?.drawing) {
            setIsFullScreen(true)
            dm.select(window.kakao.maps.drawing.OverlayType.POLYGON)
        }
    }, [isDrawMode, dm])

    useEffect(() => {
        if (isDrawMode) {
            const token = localStorage.getItem("USER_TOKEN")
            if (!token) {
                alert("주차 구역을 추가하려면 로그인하세요.")
                window.location.href = "/login"
            }
        }
    }, [isDrawMode])

    useEffect(() => {
        fetchParkingAreas()
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const newPos = { lat: position.coords.latitude, lng: position.coords.longitude }
                    setMyLocation(newPos)
                    setMapCenter(newPos)
                },
                (err) => { console.error("Geolocation error:", err) }
            )
        }
    }, [])

    const fetchParkingAreas = () => {
        axios
            .get("http://localhost:5000/api/parking-areas")
            .then((response) => {
                let data = response.data
                if (stadiumName) {
                    data = data.filter(a => a.stadiumName === stadiumName)
                }
                setParkingAreas(data)
            })
            .catch((err) => {
                console.error("Failed to fetch parking areas:", err)
            })
    }

    const getPolygonColor = (area) => {
        const total = (area.successCount || 0) + (area.failureCount || 0)
        if (total === 0) return "#8AA3FF"
        const ratio = (area.failureCount || 0) / total
        if (ratio < 0.3) return "#39DE2A"
        if (ratio < 0.6) return "#FFD700"
        return "#FF4D4F"
    }

    const getAreaCentroid = (area) => {
        const ring = area?.polygon?.coordinates?.[0] || []
        if (ring.length === 0) return null
        let sumLng = 0, sumLat = 0
        ring.forEach(([lng, lat]) => { sumLng += lng; sumLat += lat })
        return { lng: sumLng / ring.length, lat: sumLat / ring.length }
    }

    const startNavigation = (area) => {
        const c = getAreaCentroid(area)
        if (!c) return alert("좌표가 없습니다.")
        const url = `https://map.kakao.com/link/to/${encodeURIComponent(area.title)},${c.lat},${c.lng}`
        localStorage.setItem("lastDestination", JSON.stringify({
            areaId: area._id, title: area.title, timestamp: Date.now(),
        }))
        window.open(url, "_blank")
    }

    const sendFeedback = async (areaId, type) => {
        try {
            const { data } = await axios.post(
                `http://localhost:5000/api/parking-areas/${areaId}/feedback`,
                { type }
            )
            alert("피드백 감사합니다!")
            setSelectedAreaId(null)
            setParkingAreas(prev => prev.map(a => a._id === data._id ? data : a))
        } catch (e) {
            console.error("feedback error:", e)
            alert("피드백 전송에 실패했습니다.")
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
            const newPolygonCoordinates = polygonPath.map(point => [point.x, point.y])
            const title = window.prompt("새로운 주차 구역의 제목을 입력하세요:")
            if (!title) {
                manager.clear()
                manager.cancel?.()
                return
            }

            savingRef.current = true

            const newArea = {
                _id: Date.now().toString(),
                category: search.get("category") || "UNKNOWN",
                stadiumName: stadiumName || "미지정",
                title,
                polygon: { type: "Polygon", coordinates: [newPolygonCoordinates] },
            }

            setParkingAreas(prev => [...prev, newArea])

            const headers = { 'x-user-token': localStorage.getItem('USER_TOKEN') || '' }
            axios.post("http://localhost:5000/api/parking-areas", newArea, { headers })
                .then((response) => {
                    alert("새로운 주차 구역이 성공적으로 추가되었습니다.")
                    setParkingAreas(prev => prev.map(a => (a._id === newArea._id ? response.data : a)))
                })
                .catch((err) => {
                    console.error("Failed to create parking area:", err)
                    alert("서버 요청 중 오류가 발생했습니다. 콘솔을 확인하세요.")
                    setParkingAreas(prev => prev.filter(a => a._id !== newArea._id))
                })
                .finally(() => {
                    manager.clear()
                    manager.cancel?.()
                    savingRef.current = false
                })
        }
    }
    const toggleFullScreen = () => setIsFullScreen(!isFullScreen)

    const selectedPos = selectedArea ? getAreaCentroid(selectedArea) : null

    return (
        <div className={`App ${isFullScreen ? "fullscreen-map" : ""}`}>
            {!isFullScreen && (
                <header className="App-header">
                    <h1>주차 구역 지도</h1>
                </header>
            )}

            <div className={`map-container ${isFullScreen ? "fullscreen" : ""}`}>
                <Map center={mapCenter} style={{ width: "100%", height: "100%" }} level={4}>
                    {myLocation && <MapMarker position={myLocation} />}

                    {parkingAreas.map((area) => {
                        const ring = area.polygon?.coordinates?.[0]
                        if (!ring) return null
                        const path = ring.map(([lng, lat]) => ({ lng, lat }))
                        const color = getPolygonColor(area)
                        return (
                            <Polygon
                                key={area._id}
                                path={path}
                                strokeWeight={3}
                                strokeColor={color}
                                strokeOpacity={0.9}
                                strokeStyle="solid"
                                fillColor={color}
                                fillOpacity={0.45}
                                onClick={() => {
                                    if (window.confirm(`"${area.title}"(으)로 안내를 시작할까요?`)) {
                                        startNavigation(area)
                                    }
                                }}
                            />
                        )
                    })}


                    {isFullScreen && isDrawMode && (
                        <DrawingManager
                            onDrawend={handleDrawEnd}
                            guideTooltip={["draw", "drag", "edit"]}
                            drawingMode={["polygon"]}
                            onCreate={(manager) => {
                                setDm(manager)
                                // console.log('DM ready', manager)
                            }}
                        >
                            <Toolbox />
                        </DrawingManager>
                    )}
                </Map>

                <button className="toggle-fullscreen-btn" onClick={toggleFullScreen}>
                    {isFullScreen ? "지도 축소 · 그리기 종료" : "지도 확대 · 주차 구역 그리기"}
                </button>
            </div>
            {isFullScreen && isDrawMode && dm && (
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
                    <button
                        onClick={() => dm?.select(window.kakao.maps.drawing.OverlayType.POLYGON)}
                    >
                        다각형
                    </button>
                    <button onClick={() => dm?.cancel()}>취소</button>
                    <button onClick={() => dm?.clear()}>지우기</button>
                </div>
            )}
        </div >
    )
}




