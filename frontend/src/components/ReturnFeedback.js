import React, { useEffect, useState } from "react"
import axios from "axios"

export default function ReturnFeedback() {
  const [show, setShow] = useState(false)
  const [entry, setEntry] = useState(null) // { areaId, title, timestamp }

  useEffect(() => {
    try {
      const raw = localStorage.getItem("lastDestination")
      if (!raw) return
      const obj = JSON.parse(raw)
      // 최근 6시간 이내만 물어보기
      const SIX_HOURS = 6 * 60 * 60 * 1000
      if (Date.now() - (obj.timestamp || 0) <= SIX_HOURS) {
        setEntry(obj)
        setShow(true)
      } else {
        // 너무 오래됐으면 정리
        localStorage.removeItem("lastDestination")
      }
    } catch {}
  }, [])

  const close = () => {
    setShow(false)
    // 한 번 응답했으면 지움 (중복 방지)
    localStorage.removeItem("lastDestination")
  }

  const send = async (type) => {
    if (!entry?.areaId) return close()
    try {
      await axios.post(`http://localhost:5000/api/parking-areas/${entry.areaId}/feedback`, { type })
      close()
      alert("피드백 감사합니다!")
    } catch (e) {
      console.error(e)
      alert("피드백 전송 실패")
    }
  }

  if (!show || !entry) return null

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.35)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999999
    }}>
      <div style={{
        width: 360, maxWidth: "92%", background: "white", borderRadius: 12,
        boxShadow: "0 12px 32px rgba(0,0,0,.25)", padding: 16
      }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>
          최근 “{entry.title}”로 길 안내를 받으셨네요!
        </div>
        <div style={{ marginTop: 6, color: "#6b7280" }}>
          주차는 어떻게 되셨나요?
        </div>
        <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
          <button onClick={() => send("success")}>✅ 성공했습니다</button>
          <button onClick={() => send("failure")}>❌ 실패해서 못했습니다</button>
          <button onClick={() => send("abandon")}>🚗 다른 곳 찾으려고 바로 종료했어요</button>
          <button onClick={() => send("recommend")}>👍 이 구역 추천합니다</button>
        </div>
        <button onClick={close} style={{ marginTop: 10, width: "100%", color: "#6b7280" }}>
          나중에 할게요
        </button>
      </div>
    </div>
  )
}
