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
    const selectedTeam = teams.find((t) => t._id === form.homeTeam)
    if (!selectedTeam) return
    setForm((prev) => {
      const nextCategory = selectedTeam.category
      const stadiumId = getStadiumIdValue(selectedTeam.homeStadium?.stadiumId)
      const nextStadium = prev.stadium || stadiumId
      if (prev.category === nextCategory && prev.stadium === nextStadium) return prev
      return { ...prev, category: nextCategory, stadium: nextStadium }
    })
  }, [form.homeTeam, teams])

  const save = async (event) => {
    event.preventDefault()
    if (!form.league || !form.homeTeam || !form.awayTeam || !form.startAt) {
      alert("필수값을 모두 입력해 주세요.")
      return
    }

    try {
      const payload = {
        ...form,
        startAt: new Date(form.startAt).toISOString(),
        stadium: form.stadium || undefined,
      }

      await api.post("/matches", payload)
      setForm((prev) => ({
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
    if (!window.confirm("정말 삭제하시겠습니까?")) return
    try {
      await api.delete(`/matches/${id}`)
      load()
    } catch (err) {
      console.error("delete match failed", err)
      const message = err?.response?.data?.message || "경기 삭제에 실패했습니다."
      alert(message)
    }
  }

  const teamOptions = useMemo(() => teams.map((t) => ({ value: t._id, label: t.name })), [teams])
  const stadiumOptions = useMemo(
    () => stadiums.map((s) => ({ value: s._id, label: s.stadiumName })),
    [stadiums],
  )

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div>
          <h1 className="admin-header__title">경기 일정 관리</h1>
          <p className="page-hero__subtitle">
            종목별 경기 일정을 등록하고 확인합니다. 홈·원정 팀, 경기장 정보를 정확히 입력해 주세요.
          </p>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button type="button" className="cta-button" onClick={() => navigate("/admin")}>
            관리자 홈
          </button>
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem("ADMIN_TOKEN")
              navigate("/admin/login", { replace: true })
            }}
          >
            로그아웃
          </button>
        </div>
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
          <label>
            시작 시각
            <input type="datetime-local" value={from} onChange={(event) => setFrom(event.target.value)} />
          </label>
          <label>
            종료 시각
            <input type="datetime-local" value={to} onChange={(event) => setTo(event.target.value)} />
          </label>
          <button type="button" onClick={load}>
            새로고침
          </button>
        </div>
      </div>

      <form
        className="admin-form"
        onSubmit={save}
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}
      >
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
          리그
          <input
            placeholder="예: K리그1"
            value={form.league}
            onChange={(event) => setForm((prev) => ({ ...prev, league: event.target.value }))}
          />
        </label>
        <label>
          홈 팀
          <select value={form.homeTeam} onChange={(event) => setForm((prev) => ({ ...prev, homeTeam: event.target.value }))}>
            <option value="">홈 팀 선택</option>
            {teamOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          원정 팀
          <select value={form.awayTeam} onChange={(event) => setForm((prev) => ({ ...prev, awayTeam: event.target.value }))}>
            <option value="">원정 팀 선택</option>
            {teamOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          경기장
          <select value={form.stadium} onChange={(event) => setForm((prev) => ({ ...prev, stadium: event.target.value }))}>
            <option value="">홈 팀 경기장 자동 선택</option>
            {stadiumOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          경기 시작 시각
          <input
            type="datetime-local"
            value={form.startAt}
            onChange={(event) => setForm((prev) => ({ ...prev, startAt: event.target.value }))}
          />
        </label>
        <div style={{ gridColumn: "1 / -1", display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button type="submit" className="cta-button" style={{ width: "min(200px, 100%)" }}>
            경기 등록
          </button>
        </div>
      </form>

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>카테고리</th>
              <th>리그</th>
              <th>시작 시각</th>
              <th>홈 팀</th>
              <th>원정 팀</th>
              <th>경기장</th>
              <th>액션</th>
            </tr>
          </thead>
          <tbody>
            {list.map((match) => (
              <tr key={match._id}>
                <td>{match.category}</td>
                <td>{match.league}</td>
                <td>{new Date(match.startAt).toLocaleString()}</td>
                <td>{match.homeTeam?.name || match.homeTeam}</td>
                <td>{match.awayTeam?.name || match.awayTeam}</td>
                <td>{match.stadium?.stadiumName || ""}</td>
                <td>
                  <div className="admin-table__actions">
                    <button type="button" onClick={() => del(match._id)}>
                      삭제
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", color: "#6b7280" }}>
                  등록된 경기가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
