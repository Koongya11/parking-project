import React, { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import api from "../api"

const formatDate = (value) => {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })
}

const renderBlocks = (notice) => {
  if (Array.isArray(notice.blocks) && notice.blocks.length > 0) {
    return notice.blocks.map((block, index) => {
      if (block.type === "text") {
        return (
          <p key={`${notice._id}-text-${index}`} className="notice-card__body">
            {block.text}
          </p>
        )
      }
      if (block.type === "image" && block.imageUrl) {
        return (
          <img
            key={`${notice._id}-image-${index}`}
            src={block.imageUrl}
            alt={`${notice.title} 공지 이미지`}
            className="notice-card__image"
            loading="lazy"
          />
        )
      }
      return null
    })
  }

  return (
    <>
      {notice.imageUrl && (
        <img src={notice.imageUrl} alt={`${notice.title} 공지 이미지`} className="notice-card__image" loading="lazy" />
      )}
      {notice.content && <p className="notice-card__body">{notice.content}</p>}
    </>
  )
}

export default function NoticeDetailPage() {
  const { noticeId } = useParams()
  const navigate = useNavigate()
  const [notice, setNotice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError("")
      try {
        const { data } = await api.get(`/notices/${noticeId}`)
        setNotice(data)
      } catch (err) {
        console.error("Failed to load notice", err)
        setError("공지사항을 불러오지 못했습니다.")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [noticeId])

  return (
    <div className="page notice-page">
      <section className="section">
        <button type="button" className="back-button" onClick={() => navigate("/notices")}>
          목록으로
        </button>
        {loading && <div className="empty-state--subtle">공지사항을 불러오는 중입니다...</div>}
        {!loading && error && <div className="empty-state--subtle notice-error">{error}</div>}
        {!loading && !error && notice && (
          <article className="surface-card notice-card notice-card--detail">
            <header>
              <h1 className="surface-card__title">{notice.title}</h1>
              <p className="notice-card__date">{formatDate(notice.createdAt)}</p>
            </header>
            {renderBlocks(notice)}
          </article>
        )}
      </section>
    </div>
  )
}
