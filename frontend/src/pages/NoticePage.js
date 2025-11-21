import React, { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import api from "../api"

const formatDate = (value) => {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })
}

export default function NoticePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [notices, setNotices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError("")
      try {
        const { data } = await api.get("/notices")
        setNotices(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error("Failed to load notices", err)
        setError("공지사항을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.")
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const highlightedId = location.state?.noticeId || ""

  return (
    <div className="page notice-page">
      <section className="section">
        <div className="section__head">
          <div>
            <h1>공지사항</h1>
            <p style={{ color: "#64748b", marginTop: 8 }}>서비스 소식과 점검 안내를 확인해 보세요.</p>
          </div>
        </div>
        {loading && <div className="empty-state--subtle">공지사항을 불러오는 중입니다...</div>}
        {!loading && error && <div className="empty-state--subtle notice-error">{error}</div>}
        {!loading && !error && notices.length === 0 && (
          <div className="empty-state--subtle">등록된 공지사항이 없습니다.</div>
        )}
        {!loading && !error && notices.length > 0 && (
          <div className="notice-list-compact">
            {notices.map((notice) => (
              <button
                key={notice._id}
                type="button"
                className={`notice-list-compact__item${highlightedId === notice._id ? " is-active" : ""}`}
                onClick={() => navigate(`/notice/${notice._id}`)}
              >
                <span className="notice-list-compact__title">{notice.title}</span>
                <span className="notice-list-compact__date">{formatDate(notice.createdAt)}</span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
