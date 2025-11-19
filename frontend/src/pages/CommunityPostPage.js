import React, { useCallback, useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import api from "../api"
import { useAuth } from "../context/AuthContext"

const resolveBackendOrigin = () => {
  const base = api.defaults.baseURL || ""
  if (!base) return ""
  if (base.startsWith("http")) {
    try {
      const url = new URL(base)
      url.pathname = url.pathname.replace(/\/api\/?$/, "/")
      return url.toString().replace(/\/$/, "")
    } catch (error) {
      console.warn("Failed to resolve backend origin", error)
      return base.replace(/\/api\/?$/, "")
    }
  }
  return base.replace(/\/api\/?$/, "")
}

const safeTrim = (value) => (typeof value === "string" ? value.trim() : "")

export default function CommunityPostPage() {
  const { id, postId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { isLoggedIn, user } = useAuth()

  const [stadium, setStadium] = useState(location.state?.stadium || null)
  const [post, setPost] = useState(location.state?.post || null)
  const [loading, setLoading] = useState(!location.state?.post)
  const [error, setError] = useState("")
  const [commentForm, setCommentForm] = useState({ message: "" })
  const [commentError, setCommentError] = useState("")
  const [commentSubmitting, setCommentSubmitting] = useState(false)
  const [recommendSubmitting, setRecommendSubmitting] = useState(false)
  const [replyForms, setReplyForms] = useState({})

  const backendOrigin = useMemo(resolveBackendOrigin, [])
  const resolveImageUrl = useCallback(
    (imagePath) => {
      if (!imagePath) return ""
      const normalized = imagePath.startsWith("/") ? imagePath : `/${imagePath}`
      return `${backendOrigin}${normalized}`
    },
    [backendOrigin],
  )

  useEffect(() => {
    if (stadium) return
    let cancelled = false
    api
      .get("/stadiums")
      .then((res) => {
        if (cancelled) return
        const found = (res.data || []).find((item) => item._id === id)
        if (found) setStadium(found)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [id, stadium])

  useEffect(() => {
    if (!id || !postId) return
    let cancelled = false
    setLoading(true)
    setError("")
    api
      .get(`/stadiums/${id}/community/${postId}`)
      .then(({ data }) => {
        if (cancelled) return
        if (data && data._id) {
          setPost(data)
        } else {
          setError("게시글 정보를 찾을 수 없습니다.")
        }
      })
      .catch(() => {
        if (cancelled) return
        setError("게시글을 불러오는 데 실패했습니다.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id, postId])

  const resolveUserNickname = useCallback(() => {
    const nickname =
      safeTrim(user?.nickname) || safeTrim(user?.name) || (typeof user?.email === "string" ? user.email.split("@")[0] : "")
    return nickname || "익명"
  }, [user])

  const hasRecommended = post && user?.id ? (post.recommendedBy || []).includes(user.id) : false

  useEffect(() => {
    setReplyForms({})
  }, [post?._id])

  const goBackToCommunity = () => {
    navigate(`/stadium/${id}`, { state: { stadium, activeTab: "community" } })
  }

  const handleRecommend = async () => {
    if (!post?._id) return
    if (!isLoggedIn) {
      alert("추천하려면 로그인해 주세요.")
      return
    }
    if (recommendSubmitting) return

    setRecommendSubmitting(true)
    try {
      const { data } = await api.post(`/stadiums/${id}/community/${post._id}/recommend`)
      if (data && data._id) {
        setPost(data)
      }
    } catch (error) {
      console.error("failed to toggle recommendation", error)
      const message = error?.response?.data?.message || "추천 처리에 실패했습니다."
      alert(message)
    } finally {
      setRecommendSubmitting(false)
    }
  }

  const handleCommentSubmit = async (event) => {
    event.preventDefault()
    if (!post?._id) return
    if (commentSubmitting) return
    setCommentError("")

    if (!isLoggedIn) {
      setCommentError("댓글 작성은 로그인 후 이용해 주세요.")
      return
    }

    if (!commentForm.message.trim()) {
      setCommentError("댓글 내용을 입력해 주세요.")
      return
    }

    setCommentSubmitting(true)
    try {
      const { data } = await api.post(`/stadiums/${id}/community/${post._id}/comments`, {
        message: commentForm.message.trim(),
        nickname: resolveUserNickname(),
      })
      if (data && data._id) {
        setPost(data)
        setCommentForm({ message: "" })
      }
    } catch (error) {
      console.error("failed to submit comment", error)
      const message = error?.response?.data?.message || "댓글 등록에 실패했습니다."
      setCommentError(message)
    } finally {
      setCommentSubmitting(false)
    }
  }

  const toggleReplyForm = (commentId) => {
    setReplyForms((prev) => {
      const current = prev[commentId] || { open: false, message: "" }
      return { ...prev, [commentId]: { ...current, open: !current.open } }
    })
  }

  const handleReplyChange = (commentId, value) => {
    setReplyForms((prev) => ({
      ...prev,
      [commentId]: { ...prev[commentId], message: value },
    }))
  }

  const handleReplySubmit = async (commentId, event) => {
    event.preventDefault()
    if (!post?._id) return
    if (!isLoggedIn) {
      alert("답글을 남기려면 로그인해 주세요.")
      return
    }
    const value = replyForms[commentId]?.message || ""
    if (!value.trim()) {
      alert("답글 내용을 입력해 주세요.")
      return
    }
    setReplyForms((prev) => ({
      ...prev,
      [commentId]: { ...(prev[commentId] || {}), submitting: true },
    }))
    try {
      const { data } = await api.post(
        `/stadiums/${id}/community/${post._id}/comments/${commentId}/replies`,
        { message: value.trim(), nickname: resolveUserNickname() },
      )
      if (data && data._id) {
        setPost(data)
        setReplyForms((prev) => ({
          ...prev,
          [commentId]: { open: false, message: "", submitting: false },
        }))
      }
    } catch (error) {
      console.error("reply submit failed", error)
      const message = error?.response?.data?.message || "답글 등록에 실패했습니다."
      alert(message)
      setReplyForms((prev) => ({
        ...prev,
        [commentId]: { ...(prev[commentId] || {}), submitting: false },
      }))
    }
  }

  const formatDate = (value) => {
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

  return (
    <div className="page">
      <div className="page-hero community-post-hero">
        <button type="button" className="pill-button" onClick={goBackToCommunity}>
          ← 커뮤니티 목록
        </button>
        <h1 className="page-hero__title">{stadium ? `${stadium.stadiumName} 커뮤니티` : "커뮤니티 게시글"}</h1>
        {stadium && (
          <p className="page-hero__subtitle">
            {stadium.teamName} · {stadium.city || "도시 정보 없음"}
          </p>
        )}
      </div>

      {loading ? (
        <div className="empty-state">게시글을 불러오는 중입니다...</div>
      ) : error ? (
        <div className="empty-state">{error}</div>
      ) : !post ? (
        <div className="empty-state">게시글 정보를 찾을 수 없습니다.</div>
      ) : (
        <article className="community-detail">
          <header className="community-detail__head">
            <div>
              <h2>
                {post.title}
                <span className="community-detail__date">{formatDate(post.createdAt)}</span>
              </h2>
              <div className="community-meta">
                <span>작성자 {post.authorName || "익명"}</span>
                <span>조회 👁 {post.views ?? 0}</span>
                <span>댓글 💬 {post.commentCount ?? 0}</span>
              </div>
            </div>
          </header>

          <p className="community-detail__body">{post.message}</p>

          <div className="community-recommend">
            <button type="button" className={`pill-button ${hasRecommended ? "is-active" : ""}`} onClick={handleRecommend} disabled={recommendSubmitting}>
              {hasRecommended ? "추천 취소" : "추천"}
            </button>
            <span className="community-recommend__count">👍 {post.recommendCount ?? 0}</span>
          </div>

          {Array.isArray(post.images) && post.images.length > 0 && (
            <div className="community-detail__images">
              {post.images.map((image) => (
                <img key={image} src={resolveImageUrl(image)} alt="게시글 첨부 이미지" />
              ))}
            </div>
          )}

          <section className="community-comments">
            <h3>댓글</h3>
            {Array.isArray(post.comments) && post.comments.length > 0 ? (
              <div className="community-comments__list">
                {post.comments.map((comment) => (
                  <div key={comment._id || comment.createdAt} className="community-comment">
                    <div className="community-comment__meta">
                      <span className="author">{comment.authorName || "익명"}</span>
                      <span className="date">{formatDate(comment.createdAt)}</span>
                      <button type="button" className="community-reply-toggle" onClick={() => toggleReplyForm(comment._id)}>
                        {replyForms[comment._id]?.open ? "답글 닫기" : "답글"}
                      </button>
                    </div>
                    <p className="community-comment__body">{comment.message}</p>
                    {Array.isArray(comment.replies) && comment.replies.length > 0 && (
                      <div className="community-replies">
                        {comment.replies.map((reply) => (
                          <div key={reply._id || reply.createdAt} className="community-reply">
                            <div className="community-comment__meta">
                              <span className="author">{reply.authorName || "익명"}</span>
                              <span className="date">{formatDate(reply.createdAt)}</span>
                            </div>
                            <p className="community-comment__body">{reply.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {replyForms[comment._id]?.open && (
                      <form className="community-reply-form" onSubmit={(event) => handleReplySubmit(comment._id, event)}>
                        <textarea
                          rows={3}
                          value={replyForms[comment._id]?.message || ""}
                          onChange={(event) => handleReplyChange(comment._id, event.target.value)}
                          placeholder="답글을 입력해 주세요."
                          disabled={replyForms[comment._id]?.submitting}
                        />
                        <div className="community-comment__actions">
                          <button type="submit" className="cta-button" disabled={replyForms[comment._id]?.submitting}>
                            {replyForms[comment._id]?.submitting ? "등록 중..." : "답글 등록"}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state empty-state--subtle">첫 댓글을 남겨 보세요.</div>
            )}

            <form className="community-comment__form" onSubmit={handleCommentSubmit}>
              <div className="community-comment__fields">
                <textarea
                  value={commentForm.message}
                  onChange={(event) => setCommentForm({ message: event.target.value })}
                  placeholder="댓글을 입력해 주세요."
                  rows={4}
                  disabled={commentSubmitting}
                />
              </div>
              {commentError && <div className="community-form__error">{commentError}</div>}
              <div className="community-comment__actions">
                <button type="submit" className="cta-button" disabled={commentSubmitting}>
                  {commentSubmitting ? "등록 중..." : "댓글 등록"}
                </button>
              </div>
            </form>
          </section>
        </article>
      )}
    </div>
  )
}
