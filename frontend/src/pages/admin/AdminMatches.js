import React, { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import api from "../../api"
import CATEGORIES from "../../data/categories"

function toLocalInputValue(value) {
  if (!value) return ""
  const target = new Date(value)
  if (Number.isNaN(target.getTime())) return ""
  const pad = (n) => String(n).padStart(2, "0")
  const yyyy = target.getFullYear()
  const MM = pad(target.getMonth() + 1)
  const dd = pad(target.getDate())
  const hh = pad(target.getHours())
  const mm = pad(target.getMinutes())
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}`
}

const INITIAL_CATEGORY = CATEGORIES[0]?.id || ""

const getStadiumIdValue = (value) => {
  if (!value) return ""
  if (typeof value === "string") return value
  if (typeof value === "object" && value._id) return value._id
  return ""
}

export default function AdminMatches() {
  const [qCategory, setQCategory] = useState(INITIAL_CATEGORY)
  const [from, setFrom] = useState(() => toLocalInputValue(new Date()))
  const [to, setTo] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 30)
    return toLocalInputValue(d)
  })
  const [list, setList] = useState([])
  const [teams, setTeams] = useState([])
  const [stadiums, setStadiums] = useState([])
  const [form, setForm] = useState(() => ({
    category: INITIAL_CATEGORY,
    league: "",
    homeTeam: "",
    awayTeam: "",
    stadium: "",
    startAt: toLocalInputValue(new Date()),
  }))
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem("ADMIN_TOKEN")
    if (!token) navigate("/admin/login", { replace: true })
  }, [navigate])

  const load = async () => {
    const params = {
      category: qCategory || undefined,
      from: from ? new Date(from).toISOString() : undefined,
      to: to ? new Date(to).toISOString() : undefined,
    }
    const [matchRes, teamRes, stadiumRes] = await Promise.all([
      api.get("/matches", { params }),
      api.get("/teams", { params: { category: qCategory || undefined } }),
      api.get("/stadiums", { params: { category: qCategory || undefined } }),
    ])
    setList(matchRes.data || [])
    setTeams(teamRes.data || [])
    setStadiums(stadiumRes.data || [])
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qCategory, from, to])

  useEffect(() => {
    if (!form.homeTeam) return
    const selectedTeam = teams.find(t => t._id === form.homeTeam)
    if (!selectedTeam) return
    setForm(prev => {
      const nextCategory = selectedTeam.category
      const stadiumId = getStadiumIdValue(selectedTeam.homeStadium?.stadiumId)
      const nextStadium = prev.stadium || stadiumId
      if (prev.category === nextCategory && prev.stadium === nextStadium) return prev
      return { ...prev, category: nextCategory, stadium: nextStadium }
    })
  }, [form.homeTeam, teams])

  const save = async (e) => {
    e.preventDefault()
    if (!form.league || !form.homeTeam || !form.awayTeam || !form.startAt) {
      alert("필수값을 입력하세요.")
      return
    }

    try {
      const payload = {
        ...form,
        startAt: new Date(form.startAt).toISOString(),
        stadium: form.stadium || undefined,
      }

      await api.post("/matches", payload)
      setForm(prev => ({
        ...prev,
        league: "",
        homeTeam: "",
        awayTeam: "",
        stadium: "",
        startAt: toLocalInputValue(new Date()),
      }))
      load()
    } catch (err) {
      console.error("create match failed", err)
      const message = err?.response?.data?.message || "경기 등록에 실패했습니다."
      alert(message)
    }
  }

  const del = async (id) => {
    if (!window.confirm("삭제하시겠습니까?")) return
    try {
      await api.delete(`/matches/${id}`)
      load()
    } catch (err) {
      console.error("delete match failed", err)
      const message = err?.response?.data?.message || "경기 삭제에 실패했습니다."
      alert(message)
    }
  }

  const teamOptions = useMemo(() => teams.map(t => ({ value: t._id, label: t.name })), [teams])
  const stadiumOptions = useMemo(() => stadiums.map(s => ({ value: s._id, label: s.stadiumName })), [stadiums])

  return (
    <div className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>경기일정 관리</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => navigate("/admin")}>관리자 홈</button>
          <button onClick={() => { localStorage.removeItem("ADMIN_TOKEN"); navigate("/admin/login", { replace: true }) }}>로그아웃</button>
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
        <input type="datetime-local" value={from} onChange={e => setFrom(e.target.value)} />
        <span>~</span>
        <input type="datetime-local" value={to} onChange={e => setTo(e.target.value)} />
        <button onClick={load}>새로고침</button>
      </div>

      <form onSubmit={save} style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 8, marginBottom: 16 }}>
        <select value={form.category} onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))}>
          {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input placeholder="리그명" value={form.league} onChange={e => setForm(prev => ({ ...prev, league: e.target.value }))} />
        <select value={form.homeTeam} onChange={e => setForm(prev => ({ ...prev, homeTeam: e.target.value }))}>
          <option value="">홈팀 선택</option>
          {teamOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <select value={form.awayTeam} onChange={e => setForm(prev => ({ ...prev, awayTeam: e.target.value }))}>
          <option value="">원정팀 선택</option>
          {teamOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <select value={form.stadium} onChange={e => setForm(prev => ({ ...prev, stadium: e.target.value }))}>
          <option value="">경기장 선택(미선택 시 홈구장)</option>
          {stadiumOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <input type="datetime-local" value={form.startAt} onChange={e => setForm(prev => ({ ...prev, startAt: e.target.value }))} />
        <button type="submit" style={{ gridColumn: "span 6" }}>추가</button>
      </form>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>카테고리</th>
              <th>리그</th>
              <th>일시</th>
              <th>홈</th>
              <th>원정</th>
              <th>경기장</th>
              <th>액션</th>
            </tr>
          </thead>
          <tbody>
            {list.map(match => (
              <tr key={match._id}>
                <td>{match.category}</td>
                <td>{match.league}</td>
                <td>{new Date(match.startAt).toLocaleString()}</td>
                <td>{match.homeTeam?.name || match.homeTeam}</td>
                <td>{match.awayTeam?.name || match.awayTeam}</td>
                <td>{match.stadium?.stadiumName || ""}</td>
                <td style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => del(match._id)}>삭제</button>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
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
