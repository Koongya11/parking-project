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
  const [qCategory, setQCategory] = useState(INITIAL_CATEGORY)
  const [teams, setTeams] = useState([])
  const [form, setForm] = useState(() => createInitialForm(INITIAL_CATEGORY))
  const [editingId, setEditingId] = useState(null)
  const [logoPreview, setLogoPreview] = useState("")
  const navigate = useNavigate()

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
      setForm(prev => ({ ...prev, logoImage: "" }))
      setLogoPreview("")
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      setForm(prev => ({ ...prev, logoImage: typeof result === "string" ? result : "" }))
      setLogoPreview(typeof result === "string" ? result : "")
    }
    reader.readAsDataURL(file)
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.category || !form.name) return alert("카테고리와 팀명을 입력하세요.")
    if (!form.stadiumName) return alert("홈구장 이름을 입력하세요.")

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
    if (!window.confirm("삭제하시겠습니까?")) return
    try {
      await api.delete(`/teams/${id}`)
      if (editingId === id) resetForm()
      load()
    } catch (err) {
      console.error("delete team failed", err)
      const message = err?.response?.data?.message || "팀 삭제에 실패했습니다."
      alert(message)
    }
  }

  const handleEdit = (team) => {
    const coordinates = Array.isArray(team.homeStadium?.location?.coordinates)
      ? team.homeStadium.location.coordinates
      : []
    const lat = coordinates.length === 2 ? String(coordinates[1]) : String(DEFAULT_LOCATION.lat)
    const lng = coordinates.length === 2 ? String(coordinates[0]) : String(DEFAULT_LOCATION.lng)

    setEditingId(team._id)
    setForm({
      category: team.category,
      name: team.name || "",
      stadiumId: getIdValue(team.homeStadium?.stadiumId),
      stadiumName: team.homeStadium?.name || "",
      stadiumCity: team.homeStadium?.city || "",
      stadiumLat: lat,
      stadiumLng: lng,
      logoImage: team.logoImage || team.homeStadium?.logoImage || "",
    })
    setLogoPreview(team.logoImage || team.homeStadium?.logoImage || "")
  }

  const currentLat = toNumberOrFallback(form.stadiumLat, DEFAULT_LOCATION.lat)
  const currentLng = toNumberOrFallback(form.stadiumLng, DEFAULT_LOCATION.lng)

  return (
    <div className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>팀 관리</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => navigate("/admin")}>관리자 홈</button>
          <button onClick={logout}>로그아웃</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", margin: "8px 0 16px" }}>
        <strong>필터:</strong>
        <select
          value={qCategory}
          onChange={e => {
            const value = e.target.value
            setQCategory(value)
            setForm(prev => ({ ...prev, category: value || prev.category }))
          }}
        >
          <option value="">전체</option>
          {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button onClick={load}>새로고침</button>
        {editingId && <button onClick={() => resetForm(form.category)}>새 팀 추가로 전환</button>}
      </div>

      <form onSubmit={submit} style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 8, marginBottom: 16 }}>
        <div style={{ gridColumn: "span 6", display: "flex", gap: 16, alignItems: "center" }}>
          <div style={{ width: 96, height: 96, border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
            {logoPreview ? (
              <img src={logoPreview} alt="팀 로고 미리보기" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            ) : (
              <span style={{ color: "#94a3b8", fontSize: 12 }}>로고 미리보기</span>
            )}
          </div>
          <div>
            <label style={{ fontWeight: 600 }}>구단 마크 업로드</label>
            <input type="file" accept="image/*" onChange={e => handleFile(e.target.files?.[0] || null)} />
            {form.logoImage && (
              <button type="button" style={{ marginTop: 8 }} onClick={() => handleFile(null)}>이미지 제거</button>
            )}
          </div>
        </div>

        <div style={{ gridColumn: "span 6" }}>
          <h3 style={{ marginBottom: 8 }}>홈구장 위치 선택</h3>
          <Map
            center={{ lat: currentLat, lng: currentLng }}
            style={{ width: "100%", height: "360px" }}
            level={3}
            onClick={(_, mouseEvent) => {
              const latlng = mouseEvent.latLng
              setForm(prev => ({
                ...prev,
                stadiumLat: String(latlng.getLat()),
                stadiumLng: String(latlng.getLng()),
              }))
            }}
          >
            <MapMarker position={{ lat: currentLat, lng: currentLng }} />
          </Map>
        </div>

        <select value={form.category} onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))}>
          {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input placeholder="팀명" value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} />

        <input
          style={{ gridColumn: "span 3" }}
          placeholder="홈구장 이름"
          value={form.stadiumName}
          onChange={e => setForm(prev => ({ ...prev, stadiumName: e.target.value }))}
        />
        <input
          style={{ gridColumn: "span 3" }}
          placeholder="홈구장 도시"
          value={form.stadiumCity}
          onChange={e => setForm(prev => ({ ...prev, stadiumCity: e.target.value }))}
        />
        <input
          placeholder="경도(lng)"
          value={form.stadiumLng}
          onChange={e => setForm(prev => ({ ...prev, stadiumLng: e.target.value }))}
        />
        <input
          placeholder="위도(lat)"
          value={form.stadiumLat}
          onChange={e => setForm(prev => ({ ...prev, stadiumLat: e.target.value }))}
        />
        <button type="submit" style={{ gridColumn: editingId ? "span 3" : "span 6" }}>{editingId ? "수정 완료" : "추가"}</button>
        {editingId && <button type="button" style={{ gridColumn: "span 3" }} onClick={() => resetForm(form.category)}>취소</button>}
      </form>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>로고</th>
              <th>카테고리</th>
              <th>팀명</th>
              <th>홈구장</th>
              <th>위치(lng,lat)</th>
              <th>액션</th>
            </tr>
          </thead>
          <tbody>
            {teams.map(team => {
              const coords = Array.isArray(team.homeStadium?.location?.coordinates)
                ? team.homeStadium.location.coordinates.join(', ')
                : ''
              return (
                <tr key={team._id}>
                  <td>
                    {team.logoImage ? (
                      <img src={team.logoImage} alt={`${team.name} 로고`} style={{ width: 48, height: 48, objectFit: "contain" }} />
                    ) : (
                      <span style={{ color: "#94a3b8", fontSize: 12 }}>미등록</span>
                    )}
                  </td>
                  <td>{team.category}</td>
                  <td>{team.name}</td>
                  <td>{team.homeStadium?.name}</td>
                  <td>{coords}</td>
                  <td style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => handleEdit(team)}>수정</button>
                    <button onClick={() => handleDelete(team._id)}>삭제</button>
                  </td>
                </tr>
              )
            })}
            {teams.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", color: "#6b7280" }}>데이터 없음</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
