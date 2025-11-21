import React, { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import api from "../../api"

const formatDateTime = (value) => {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const createTextBlock = () => ({
  id: generateId(),
  type: "text",
  text: "",
})

const createImageBlock = () => ({
  id: generateId(),
  type: "image",
  file: null,
  preview: "",
})

export default function AdminNotices() {
  const navigate = useNavigate()
  const [title, setTitle] = useState("")
  const [blocks, setBlocks] = useState([createTextBlock()])
  const [submitting, setSubmitting] = useState(false)
  const [notices, setNotices] = useState([])
  const [loadingList, setLoadingList] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const token = localStorage.getItem("ADMIN_TOKEN")
    if (!token) navigate("/admin/login", { replace: true })
  }, [navigate])

  useEffect(() => {
    loadNotices()
  }, [])

  const logout = () => {
    localStorage.removeItem("ADMIN_TOKEN")
    navigate("/admin/login", { replace: true })
  }

  const loadNotices = async () => {
    try {
      setLoadingList(true)
      const { data } = await api.get("/notices")
      setNotices(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("Failed to fetch notices", err)
      setError("공지사항 목록을 불러오지 못했습니다.")
    } finally {
      setLoadingList(false)
    }
  }

  const addTextBlock = () => {
    setBlocks((prev) => [...prev, createTextBlock()])
  }

  const addImageBlock = () => {
    setBlocks((prev) => [...prev, createImageBlock()])
  }

  const removeBlock = (id) => {
    setBlocks((prev) => {
      const target = prev.find((block) => block.id === id)
      if (target?.type === "image" && target.preview) {
        URL.revokeObjectURL(target.preview)
      }
      const filtered = prev.filter((block) => block.id !== id)
      return filtered.length > 0 ? filtered : [createTextBlock()]
    })
  }

  const updateTextBlock = (id, value) => {
    setBlocks((prev) =>
      prev.map((block) => (block.id === id ? { ...block, text: value } : block)),
    )
  }

  const updateImageBlock = (id, file) => {
    setBlocks((prev) =>
      prev.map((block) => {
        if (block.id !== id) return block
        if (block.preview) URL.revokeObjectURL(block.preview)
        return {
          ...block,
          file,
          preview: file ? URL.createObjectURL(file) : "",
        }
      }),
    )
  }

  const resetForm = () => {
    blocks.forEach((block) => {
      if (block.type === "image" && block.preview) URL.revokeObjectURL(block.preview)
    })
    setTitle("")
    setBlocks([createTextBlock()])
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!title.trim()) {
      setError("제목을 입력해 주세요.")
      return
    }

    const payloadBlocks = []
    const imageFiles = []

    blocks.forEach((block) => {
      if (block.type === "text") {
        const text = (block.text || "").trim()
        if (text) {
          payloadBlocks.push({ type: "text", text })
        }
      } else if (block.type === "image" && block.file) {
        const imageIndex = imageFiles.length
        imageFiles.push(block.file)
        payloadBlocks.push({ type: "image", imageIndex })
      }
    })

    if (payloadBlocks.length === 0) {
      setError("본문 텍스트 또는 이미지를 추가해 주세요.")
      return
    }

    setSubmitting(true)
    setError("")

    try {
      const formData = new FormData()
      formData.append("title", title.trim())
      formData.append("blocks", JSON.stringify(payloadBlocks))
      imageFiles.forEach((file) => formData.append("images", file))

      await api.post("/notices", formData)
      resetForm()
      await loadNotices()
    } catch (err) {
      console.error("Failed to create notice", err)
      const message = err?.response?.data?.message || "공지사항을 등록하지 못했습니다."
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (noticeId) => {
    if (!window.confirm("해당 공지사항을 삭제하시겠어요?")) return
    try {
      await api.delete(`/notices/${noticeId}`)
      await loadNotices()
    } catch (err) {
      console.error("Failed to delete notice", err)
      const message = err?.response?.data?.message || "공지사항을 삭제하지 못했습니다."
      setError(message)
    }
  }

  const summaryText = (notice) => {
    if (Array.isArray(notice?.blocks) && notice.blocks.length > 0) {
      const joined = notice.blocks
        .filter((block) => block.type === "text" && block.text)
        .map((block) => block.text)
        .join(" ")
      return joined || notice.content || ""
    }
    return notice?.content || ""
  }

  const hasError = Boolean(error)

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div>
          <h1 className="admin-header__title">공지사항 관리</h1>
        </div>
        <button type="button" className="cta-button" onClick={logout}>
          로그아웃
        </button>
      </header>

      <form className="admin-form" onSubmit={handleSubmit}>
        <div className="admin-form__row">
          <label htmlFor="notice-title">제목</label>
          <input
            id="notice-title"
            name="title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="공지 제목을 입력하세요."
            required
          />
        </div>

        <div className="admin-form__row">
          <label>본문 블록</label>
          <div className="notice-block-list">
            {blocks.map((block, index) => (
              <div key={block.id} className="notice-block">
                <div className="notice-block__head">
                  <span>
                    #{index + 1} {block.type === "text" ? "텍스트" : "이미지"}
                  </span>
                  <button type="button" onClick={() => removeBlock(block.id)}>
                    삭제
                  </button>
                </div>
                {block.type === "text" ? (
                  <textarea
                    rows="4"
                    value={block.text}
                    onChange={(event) => updateTextBlock(block.id, event.target.value)}
                    placeholder="본문 내용을 입력하세요."
                  />
                ) : (
                  <div className="notice-block__image-input">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) =>
                        updateImageBlock(block.id, event.target.files?.[0] || null)
                      }
                    />
                    {block.preview && (
                      <img
                        src={block.preview}
                        alt="공지 이미지 미리보기"
                        className="notice-block__image-preview"
                      />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="notice-block-actions">
            <button type="button" onClick={addTextBlock}>
              텍스트 블록 추가
            </button>
            <button type="button" onClick={addImageBlock}>
              이미지 블록 추가
            </button>
          </div>
        </div>

        {hasError && <div className="form-error">{error}</div>}

        <button type="submit" className="cta-button" disabled={submitting}>
          {submitting ? "등록 중..." : "공지 등록"}
        </button>
      </form>

      <section className="admin-table-wrapper" style={{ marginTop: 24 }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: "45%" }}>제목</th>
              <th style={{ width: "35%" }}>작성일</th>
              <th style={{ width: "20%" }}>관리</th>
            </tr>
          </thead>
          <tbody>
            {loadingList ? (
              <tr>
                <td colSpan="3">공지 목록을 불러오는 중입니다...</td>
              </tr>
            ) : notices.length === 0 ? (
              <tr>
                <td colSpan="3">등록된 공지사항이 없습니다.</td>
              </tr>
            ) : (
              notices.map((notice) => {
                const summary = summaryText(notice)
                return (
                  <tr key={notice._id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{notice.title}</div>
                      <div style={{ color: "#475569", marginTop: 4 }}>
                        {summary.slice(0, 60)}
                        {summary.length > 60 ? "..." : ""}
                      </div>
                    </td>
                  <td>{formatDateTime(notice.createdAt)}</td>
                  <td>
                    <div className="admin-table__actions">
                      {notice.imageUrl && (
                        <a href={notice.imageUrl} target="_blank" rel="noreferrer">
                          이미지 보기
                        </a>
                      )}
                      <button type="button" onClick={() => handleDelete(notice._id)}>
                        삭제
                      </button>
                    </div>
                  </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </section>
    </div>
  )
}
