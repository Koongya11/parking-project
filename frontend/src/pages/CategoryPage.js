import React, { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import api from "../api"
import CATEGORIES from "../data/categories"

export default function CategoryPage() {
  const { categoryId } = useParams()
  const navigate = useNavigate()
  const category = CATEGORIES.find(c => c.id === categoryId)
  const [stadiums, setStadiums] = useState([])
  const [matches, setMatches] = useState([])

  useEffect(() => {
    if (!category) return
    api.get("/stadiums", { params: { category: categoryId } })
      .then(res => setStadiums(res.data))
      .catch(() => setStadiums([]))
  }, [category, categoryId])

  useEffect(() => {
    if (!category) return
    api.get("/matches", { params: { category: categoryId } })
      .then(res => {
        const now = Date.now()
        const upcoming = (res.data || [])
          .filter(match => {
            const time = new Date(match.startAt).getTime()
            return !Number.isNaN(time) && time >= now
          })
          .sort((a, b) => new Date(a.startAt) - new Date(b.startAt))
          .slice(0, 5)
        setMatches(upcoming)
      })
      .catch(() => setMatches([]))
  }, [category, categoryId])

  const matchItems = useMemo(() => matches.map(match => {
    const startAt = new Date(match.startAt)
    const formatted = Number.isNaN(startAt.getTime()) ? "일정 미정" : startAt.toLocaleString()
    const home = match.homeTeam?.name || match.homeTeam || "-"
    const away = match.awayTeam?.name || match.awayTeam || "-"
    const stadiumName = match.stadium?.stadiumName || match.stadiumName || match.stadium || ""
    const key = match._id || `${home}-${away}-${match.startAt}`
    return { key, formatted, home, away, stadiumName }
  }), [matches])

  if (!category) {
    return (
      <div className="container">
        <h1>카테고리를 찾을 수 없습니다.</h1>
        <button className="back-btn" onClick={() => navigate("/")}>메인으로</button>
      </div>
    )
  }

  const goStadium = (stadium) => {
    navigate(`/stadium/${stadium._id}`, { state: { stadium } })
  }

  return (
    <div className="container">
      <div className="header">
        <h1>{category.name}</h1>
        <p className="subtitle">{category.desc}</p>
      </div>

      {matchItems.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ marginBottom: 12 }}>다가오는 경기 일정</h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 12 }}>
            {matchItems.map(item => (
              <li key={item.key} style={{ padding: 12, border: "1px solid #e2e8f0", borderRadius: 8 }}>
                <div style={{ fontWeight: 600 }}>{item.formatted}</div>
                <div style={{ margin: "4px 0" }}>{item.home} vs {item.away}</div>
                {item.stadiumName && <div style={{ color: "#64748b" }}>{item.stadiumName}</div>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid">
        {stadiums.map(stadium => (
          <button key={stadium._id} className="card" onClick={() => goStadium(stadium)}>
            <div className="card-icon" style={{ background: "#f1f5f9", borderRadius: "50%", width: 64, height: 64, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {stadium.logoImage ? (
                <img src={stadium.logoImage} alt={`${stadium.teamName} 로고`} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              ) : (
                <span role="img" aria-label="stadium">🏟</span>
              )}
            </div>
            <div className="card-texts">
              <div className="card-title">{stadium.teamName}</div>
              <div className="card-desc">{stadium.stadiumName} · {stadium.city || "도시 미정"}</div>
            </div>
          </button>
        ))}
        {stadiums.length === 0 && (
          <div className="placeholder">아직 등록된 경기장이 없습니다. 관리자에서 추가해 주세요.</div>
        )}
      </div>
    </div>
  )
}
