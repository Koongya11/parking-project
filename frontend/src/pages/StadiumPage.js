import React, { useEffect, useState } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { Map, MapMarker } from "react-kakao-maps-sdk"
import api from "../api"

export default function StadiumPage() {
    const { id } = useParams()
    const nav = useNavigate()
    const loc = useLocation()

    // 카테고리 페이지에서 넘겨준 데이터 우선 사용, 없으면 조회
    const [stadium, setStadium] = useState(loc.state?.stadium || null)
    const [note, setNote] = useState(localStorage.getItem(`note:${id}`) || "")

    useEffect(() => {
        if (stadium) return
        // fallback: 목록에서 찾아오기
        api.get("/stadiums").then(res => {
            const found = res.data.find((x) => x._id === id)
            if (found) setStadium(found)
        })
    }, [id, stadium])

    const [lng, lat] = stadium.location?.coordinates || [126.9786567, 37.566826]
    const center = { lat, lng }

    // 미니 지도 클릭: 보기 모드(전체 화면) 오픈
    const openMapView = () => {
        nav(
            `/map?stadium=${encodeURIComponent(stadium.stadiumName)}&lat=${lat}&lng=${lng}&category=${stadium.category}`
        )
    }
    // 버튼: 영역 추가 모드 오픈
    const openMapForArea = () => {
        nav(
            `/map?stadium=${encodeURIComponent(stadium.stadiumName)}&lat=${lat}&lng=${lng}&draw=1&category=${stadium.category}`
        )
    }
    // 길 안내
    const startNavigation = () => {
        const url = `https://map.kakao.com/link/to/${encodeURIComponent(stadium.stadiumName)},${lat},${lng}`
        localStorage.setItem("lastDestination", JSON.stringify({
            areaId: `stadium:${stadium._id}`,     // 경기장 단위 목적지 표식
            title: stadium.stadiumName,
            timestamp: Date.now(),
        }))
        window.open(url, "_blank")
    }

    const saveNote = () => {
        localStorage.setItem(`note:${id}`, note)
        alert("메모가 저장되었습니다.")
    }

    return (
        <div className="container">
            <header className="header">
                <h1>{stadium.stadiumName}</h1>
                <p className="subtitle">{stadium.teamName} · {stadium.city || "도시 미지정"}</p>
            </header>

            {/* 미니 지도 (클릭 시 /map 이동) */}
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden", cursor: "pointer" }} onClick={openMapView}>
                <Map center={center} style={{ width: "100%", height: 320 }} level={3}>
                    <MapMarker position={center} />
                </Map>
            </div>

            {/* 의유/메모 입력 */}
            <div style={{ marginTop: 16 }}>
                <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>의유(메모)</label>
                <input
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="예) 3루 쪽 외부 공영주차장 추천"
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: 10 }}
                />
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button onClick={saveNote}>메모 저장</button>
                </div>
            </div>

            {/* 하단 버튼 두 개 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10, marginTop: 16 }}>
                <button onClick={openMapForArea} style={{ padding: "12px 10px" }}>
                    지도 열기 · 영역 추가
                </button>
            </div>
        </div>
    )
}
