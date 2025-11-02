import React, { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Map, MapMarker } from "react-kakao-maps-sdk"
import api from "../../api"
import CATEGORIES from "../../data/categories"

const DEFAULT_LOCATION = { lat: 37.566826, lng: 126.9786567 }
const INITIAL_CATEGORY = CATEGORIES[0]?.id || ""

const createInitialForm = (category = INITIAL_CATEGORY) => ({
  category,
  name: "",
  stadiumId: "",
  stadiumName: "",
  stadiumCity: "",
  stadiumLat: String(DEFAULT_LOCATION.lat),
  stadiumLng: String(DEFAULT_LOCATION.lng),
  logoImage: "",
})

const toNumberOrFallback = (value, fallback) => {
  if (value === null || value === undefined) return fallback
  if (typeof value === "string" && value.trim() === "") return fallback
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

const getIdValue = (value) => {
  if (!value) return ""
  if (typeof value === "string") return value
  if (typeof value === "object") {
    if (value._id) return value._id
    if (value.id) return value.id
  }
  return ""
}

export default function AdminTeams() {
  const navigate = useNavigate()
  const [qCategory, setQCategory] = useState(INITIAL_CATEGORY)
  const [teams, setTeams] = useState([])
  const [form, setForm] = useState(() => createInitialForm(INITIAL_CATEGORY))
  const [editingId, setEditingId] = useState(null)
  const [logoPreview, setLogoPreview] = useState("")

  useEffect(() => {
    const token = localStorage.getItem("ADMIN_TOKEN")
    if (!token) navigate("/admin/login", { replace: true })
  }, [navigate])

  const logout = () => {
    localStorage.removeItem("ADMIN_TOKEN")
    navigate("/admin/login", { replace: true })
  }

  const load = async () => {
    const params = { category: qCategory || undefined }
    const teamRes = await api.get("/teams", { params })
    setTeams(teamRes.data || [])
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qCategory])

  const resetForm = (category = form.category) => {
    setEditingId(null)
    setForm(createInitialForm(category))
    setLogoPreview("")
  }

  const handleFile = (file) => {
    if (!file) {
      setForm((prev) => ({ ...prev, logoImage: "" }))
      setLogoPreview("")
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      setForm((prev) => ({ ...prev, logoImage: typeof result === "string" ? result : "" }))
      setLogoPreview(typeof result === "string" ? result : "")
    }
    reader.readAsDataURL(file)
  }

  const submit = async (event) => {
    event.preventDefault()
    if (!form.category || !form.name) return alert("카테고리와 팀명을 입력해 주세요.")
    if (!form.stadiumName) return alert("홈구장 이름을 입력해 주세요.")

    try {
      const payload = {
        category: form.category,
        name: form.name,
        logoImage: form.logoImage,
        city: form.stadiumCity,
        homeStadium: {
          stadiumId: form.stadiumId || undefined,
          name: form.stadiumName,
          city: form.stadiumCity,
          lat: form.stadiumLat,
          lng: form.stadiumLng,
          logoImage: form.logoImage,
        },
      }

      if (editingId) {
        await api.put(`/teams/${editingId}`, payload)
      } else {
        await api.post("/teams", payload)
      }

      resetForm(form.category)
      load()
    } catch (err) {
      console.error("save team failed", err)
      const message = err?.response?.data?.message || "팀 저장에 실패했습니다."
      alert(message)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return
    try {
      await api.delete(`/teams/${id}`)
      if (editingId === id) resetForm()
      load()
    } catch (err) {
      console.error("delete team failed", err)
      alert("삭제에 실패했습니다.")
    }
  }

  const handleEdit = (team) => {
    setEditingId(team._id)
    const home = team.homeStadium || {}
    const coords = Array.isArray(home.location?.coordinates)
      ? home.location.coordinates
      : [toNumberOrFallback(home.lng, DEFAULT_LOCATION.lng), toNumberOrFallback(home.lat, DEFAULT_LOCATION.lat)]

    setForm({
      category: team.category,
      name: team.name,
      stadiumId: getIdValue(home.stadiumId),
      stadiumName: home.name || team.homeStadium?.stadiumId?.stadiumName || "",
      stadiumCity: home.city || team.city || "",
      stadiumLat: String(toNumberOrFallback(coords[1], DEFAULT_LOCATION.lat)),
      stadiumLng: String(toNumberOrFallback(coords[0], DEFAULT_LOCATION.lng)),
      logoImage: team.logoImage || "",
    })
    setLogoPreview(team.logoImage || "")
  }

  const currentLat = Number(form.stadiumLat) || DEFAULT_LOCATION.lat
  const currentLng = Number(form.stadiumLng) || DEFAULT_LOCATION.lng

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div>
          <h1 className="admin-header__title">팀 관리</h1>
          <p className="page-hero__subtitle">
            종목별 팀과 홈구장 정보를 관리합니다. 경기장 위치와 로고를 최신 상태로 유지해 주세요.
          </p>
        </div>
        <button type="button" className="cta-button" onClick={logout}>
          로그아웃
        </button>
      </header>

      <div className="admin-toolbar">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <label>
            카테고리
            <select
              value={qCategory}
              onChange={(event) => {
                const value = event.target.value
                setQCategory(value)
                setForm((prev) => ({ ...prev, category: value || prev.category }))
              }}
            >
              <option value="">전체</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={load}>
            새로고침
          </button>
          {editingId && (
            <button type="button" onClick={() => resetForm(form.category)}>
              새 팀 추가로 전환
            </button>
          )}
        </div>
      </div>

      <form className="admin-form" onSubmit={submit}>
        <div className="admin-form__row" style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div style={{ width: 96, height: 96, borderRadius: 18, border: "1px dashed #cbd5f5", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", overflow: "hidden" }}>
            {logoPreview ? (
              <img src={logoPreview} alt="팀 로고 미리보기" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            ) : (
              <span style={{ color: "#94a3b8", fontSize: 12 }}>로고 미리보기</span>
            )}
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            <label style={{ fontWeight: 600 }}>
              구단 마크 업로드
              <input type="file" accept="image/*" onChange={(event) => handleFile(event.target.files?.[0] || null)} />
            </label>
            {form.logoImage && (
              <button type="button" onClick={() => handleFile(null)}>
                이미지 제거
              </button>
            )}
          </div>
        </div>

        <div className="admin-form__row">
          <label>
            카테고리
            <select value={form.category} onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            팀명
            <input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
          </label>
        </div>

        <div className="admin-form__row" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          <label>
            홈구장 이름
            <input
              value={form.stadiumName}
              onChange={(event) => setForm((prev) => ({ ...prev, stadiumName: event.target.value }))}
              placeholder="예: 상암월드컵경기장"
            />
          </label>
          <label>
            도시
            <input
              value={form.stadiumCity}
              onChange={(event) => setForm((prev) => ({ ...prev, stadiumCity: event.target.value }))}
              placeholder="예: 서울특별시"
            />
          </label>
        </div>

        <div className="admin-form__map">
          <Map
            center={{ lat: currentLat, lng: currentLng }}
            level={3}
            style={{ width: "100%", height: 360 }}
            onClick={(_, mouseEvent) => {
              const latlng = mouseEvent.latLng
              setForm((prev) => ({
                ...prev,
                stadiumLat: String(latlng.getLat()),
                stadiumLng: String(latlng.getLng()),
              }))
            }}
          >
            <MapMarker position={{ lat: currentLat, lng: currentLng }} />
          </Map>
        </div>

        <div className="admin-form__row" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          <label>
            경도 (lng)
            <input
              value={form.stadiumLng}
              onChange={(event) => setForm((prev) => ({ ...prev, stadiumLng: event.target.value }))}
            />
          </label>
          <label>
            위도 (lat)
            <input
              value={form.stadiumLat}
              onChange={(event) => setForm((prev) => ({ ...prev, stadiumLat: event.target.value }))}
            />
          </label>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button type="submit" className="cta-button">
            {editingId ? "팀 정보 수정" : "새 팀 등록"}
          </button>
          {editingId && (
            <button type="button" onClick={() => resetForm(form.category)}>
              취소
            </button>
          )}
        </div>
      </form>

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>로고</th>
              <th>카테고리</th>
              <th>팀명</th>
              <th>홈구장</th>
              <th>좌표</th>
              <th>액션</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team) => {
              const coords = Array.isArray(team.homeStadium?.location?.coordinates)
                ? team.homeStadium.location.coordinates.join(", ")
                : ""
              return (
                <tr key={team._id}>
                  <td>
                    {team.logoImage ? (
                      <img src={team.logoImage} alt={`${team.name} 로고`} style={{ width: 48, height: 48, objectFit: "contain" }} />
                    ) : (
                      <span style={{ color: "#94a3b8", fontSize: 12 }}>없음</span>
                    )}
                  </td>
                  <td>{team.category}</td>
                  <td>{team.name}</td>
                  <td>{team.homeStadium?.name}</td>
                  <td>{coords}</td>
                  <td>
                    <div className="admin-table__actions">
                      <button type="button" onClick={() => handleEdit(team)}>
                        수정
                      </button>
                      <button type="button" onClick={() => handleDelete(team._id)}>
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {teams.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", color: "#6b7280" }}>
                  등록된 팀이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
