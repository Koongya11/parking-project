import React, { useEffect, useMemo, useRef, useState } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import api from "../api"
import { useAuth } from "../context/AuthContext"

const MAX_UPLOAD_FILES = 5
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024 // 5MB

const safeTrim = (value) => (typeof value === "string" ? value.trim() : "")

export default function CommunityPostCreatePage() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { isLoggedIn, user, loadingUser } = useAuth()

  const [stadium, setStadium] = useState(location.state?.stadium || null)
  const [formValues, setFormValues] = useState({ title: "", message: "" })
  const [formFiles, setFormFiles] = useState([])
  const [imagePreviews, setImagePreviews] = useState([])
  const [submitError, setSubmitError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const fileInputRef = useRef(null)

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
    if (!loadingUser && !isLoggedIn) {
      alert("글쓰기는 로그인 후 이용해 주세요.")
      navigate(`/login`, { replace: true, state: { from: location.pathname } })
    }
  }, [isLoggedIn, loadingUser, navigate, location.pathname])

  useEffect(() => {
    if (formFiles.length === 0) {
      setImagePreviews([])
      return
    }
    const previews = formFiles.map((file) => ({
      name: file.name,
      url: URL.createObjectURL(file),
    }))
    setImagePreviews(previews)
    return () => previews.forEach((item) => URL.revokeObjectURL(item.url))
  }, [formFiles])

  const handleFormChange = (field, value) => {
    setFormValues((prev) => ({ ...prev, [field]: value }))
  }

  const handleImageChange = (event) => {
    const files = Array.from(event.target.files || [])
    if (files.length > MAX_UPLOAD_FILES) {
      alert(`사진은 최대 ${MAX_UPLOAD_FILES}장까지 업로드할 수 있습니다.`)
    }
    const limited = files.slice(0, MAX_UPLOAD_FILES)
    const oversized = limited.find((file) => file.size > MAX_UPLOAD_SIZE)
    if (oversized) {
      alert(`단일 사진은 최대 ${Math.round(MAX_UPLOAD_SIZE / (1024 * 1024))}MB까지 업로드할 수 있습니다.`)
      event.target.value = ""
      setFormFiles([])
      return
    }
    setFormFiles(limited)
  }

  const userNickname = useMemo(() => {
    const nickname =
      safeTrim(user?.nickname) || safeTrim(user?.name) || (typeof user?.email === "string" ? user.email.split("@")[0] : "")
    return nickname || "익명"
  }, [user])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (submitting) return
    setSubmitError("")

    if (!isLoggedIn) {
      setSubmitError("로그인이 필요합니다.")
      return
    }

    if (!formValues.title.trim()) {
      setSubmitError("제목을 입력해 주세요.")
      return
    }

    if (!formValues.message.trim()) {
      setSubmitError("내용을 입력해 주세요.")
      return
    }

    const formData = new FormData()
    formData.append("title", formValues.title.trim())
    formData.append("message", formValues.message.trim())
    formData.append("nickname", userNickname)
    formFiles.forEach((file) => formData.append("images", file))

    setSubmitting(true)
    try {
      const { data } = await api.post(`/stadiums/${id}/community`, formData)
      if (data && data._id) {
        if (fileInputRef.current) fileInputRef.current.value = ""
        navigate(`/stadium/${id}/community/${data._id}`, {
          replace: true,
          state: { stadium, post: data, activeTab: "community" },
        })
      }
    } catch (error) {
      console.error("failed to submit community post", error)
      const message = error?.response?.data?.message || "게시글 등록에 실패했습니다."
      setSubmitError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    navigate(`/stadium/${id}`, { state: { stadium, activeTab: "community" } })
  }

  return (
    <div className="page">
      <div className="page-hero community-post-hero">
        <button type="button" className="pill-button" onClick={handleCancel}>
          ← 커뮤니티 목록
        </button>
        <h1 className="page-hero__title">
          {stadium ? `${stadium.stadiumName} 커뮤니티 글쓰기` : "커뮤니티 글쓰기"}
        </h1>
      </div>

      <form className="community-form" onSubmit={handleSubmit}>
        <div className="community-form__row">
          <label>
            제목
            <input
              value={formValues.title}
              onChange={(event) => handleFormChange("title", event.target.value)}
              placeholder="제목을 입력해 주세요."
              disabled={submitting}
            />
          </label>
        </div>
        <label className="community-form__full">
          내용
          <textarea
            rows={6}
            value={formValues.message}
            onChange={(event) => handleFormChange("message", event.target.value)}
            placeholder="주차 팁이나 관람 후기를 자세히 작성해 주세요."
            disabled={submitting}
          />
        </label>
        <label className="community-form__full">
          사진 업로드 (최대 {MAX_UPLOAD_FILES}장, 장당 5MB)
          <input
            type="file"
            accept="image/*"
            multiple
            ref={fileInputRef}
            onChange={handleImageChange}
            disabled={submitting}
          />
        </label>
        {imagePreviews.length > 0 && (
          <div className="community-form__previews">
            {imagePreviews.map((preview) => (
              <div key={preview.url} className="community-form__preview">
                <img src={preview.url} alt={preview.name} />
                <span>{preview.name}</span>
              </div>
            ))}
          </div>
        )}
        {submitError && <div className="community-form__error">{submitError}</div>}
        <div className="community-form__actions">
          <button type="button" className="pill-button" disabled={submitting} onClick={handleCancel}>
            취소
          </button>
          <button type="submit" className="cta-button" disabled={submitting}>
            {submitting ? "등록 중..." : "게시하기"}
          </button>
        </div>
      </form>
    </div>
  )
}
