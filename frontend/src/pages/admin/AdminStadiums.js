import React, { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import api from "../../api"
import { Map, MapMarker } from "react-kakao-maps-sdk"

const CATEGORIES = [
  { id: "football", name: "축구" },
  { id: "baseball", name: "야구" },
  { id: "basketball", name: "농구" },
  { id: "volleyball", name: "배구" },
]

export default function AdminStadiums() {
  const nav = useNavigate()
  const [list, setList] = useState([])

  const [qCategory, setQCategory] = useState("")
  const [form, setForm] = useState({
    category: "baseball",
    teamName: "",
    stadiumName: "",
    city: "",
    lng: 126.9786567,
    lat: 37.566826,
  })

  const load = async () => {
    const { data } = await api.get("/stadiums", { params: { category: qCategory || undefined } })
    setList(data)
  }
  useEffect(() => { load() }, [qCategory])

  const save = async (e) => {
    e.preventDefault()
    const body = {
      category: form.category,
      teamName: form.teamName,
      stadiumName: form.stadiumName,
      city: form.city,
      location: { type: "Point", coordinates: [Number(form.lng), Number(form.lat)] }
    }
    await api.post("/stadiums", body)
    setForm({ ...form, teamName: "", stadiumName: "", city: "" })
    await load()
    alert("저장 완료")
  }

  const update = async (id, patch) => {
    await api.put(`/stadiums/${id}`, patch)
    await load()
  }

  const del = async (id) => {
    if (!window.confirm("삭제할까요?")) return
    await api.delete(`/stadiums/${id}`)
    await load()
  }

  const logout = () => {
    localStorage.removeItem("ADMIN_TOKEN")
    nav("/admin/login")
  }

  return (
    <div className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>경기장 관리</h1>
        <button onClick={logout}>로그아웃</button>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", margin: "8px 0 16px" }}>
        <strong>필터:</strong>
        <select value={qCategory} onChange={e => setQCategory(e.target.value)}>
          <option value="">전체</option>
          {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button onClick={load}>새로고침</button>
      </div>

      <form onSubmit={save} style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 8, marginBottom: 16 }}>
        <div style={{ marginTop: 20 }}>
          <h3>지도에서 좌표 선택</h3>
          <Map
            center={{ lat: Number(form.lat), lng: Number(form.lng) }}
            style={{ width: "100%", height: "400px" }}
            level={3}
            onClick={(_, mouseEvent) => {
              const latlng = mouseEvent.latLng
              setForm((f) => ({
                ...f,
                lat: latlng.getLat(),
                lng: latlng.getLng(),
              }))
            }}
          >
            <MapMarker position={{ lat: Number(form.lat), lng: Number(form.lng) }} />
          </Map>
        </div>

        <div style={{ overflowX: "auto" }}></div>
        <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
          {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input placeholder="팀명" value={form.teamName} onChange={e => setForm(f => ({ ...f, teamName: e.target.value }))} />
        <input placeholder="경기장명" value={form.stadiumName} onChange={e => setForm(f => ({ ...f, stadiumName: e.target.value }))} />
        <input placeholder="도시" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
        <input placeholder="경도(lng)" value={form.lng} onChange={e => setForm(f => ({ ...f, lng: e.target.value }))} />
        <input placeholder="위도(lat)" value={form.lat} onChange={e => setForm(f => ({ ...f, lat: e.target.value }))} />
        <button type="submit" style={{ gridColumn: "span 6" }}>추가</button>
      </form>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>카테고리</th><th>팀</th><th>경기장</th><th>도시</th><th>lng,lat</th><th>액션</th>
            </tr>
          </thead>
          <tbody>
            {list.map(s => (
              <tr key={s._id}>
                <td>{s.category}</td>
                <td>{s.teamName}</td>
                <td>{s.stadiumName}</td>
                <td>{s.city}</td>
                <td>{s.location?.coordinates?.join(', ')}</td>
                <td style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => update(s._id, { city: prompt("도시 수정", s.city || "") ?? s.city })}>도시수정</button>
                  <button onClick={() => del(s._id)}>삭제</button>
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={6} style={{ textAlign: "center", color: "#6b7280" }}>자료 없음</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
