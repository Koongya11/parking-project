import React, { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import api from "../api"
import CATEGORIES from "../data/categories"

export default function CategoryPage() {
  const { categoryId } = useParams()
  const navigate = useNavigate()
  const category = CATEGORIES.find((c) => c.id === categoryId)
  const [stadiums, setStadiums] = useState([])
  const [matches, setMatches] = useState([])

  useEffect(() => {
    if (!category) return
    api
      .get("/stadiums", { params: { category: categoryId } })
      .then((res) => setStadiums(res.data))
      .catch(() => setStadiums([]))
  }, [category, categoryId])

  useEffect(() => {
    if (!category) return
    api
      .get("/matches", { params: { category: categoryId } })
      .then((res) => {
        const now = Date.now()
        const upcoming = (res.data || [])
          .filter((match) => {
            const time = new Date(match.startAt).getTime()
            return !Number.isNaN(time) && time >= now
          })
          .sort((a, b) => new Date(a.startAt) - new Date(b.startAt))
          .slice(0, 5)
        setMatches(upcoming)
      })
      .catch(() => setMatches([]))
  }, [category, categoryId])

  const matchItems = useMemo(
    () =>
      matches.map((match) => {
        const startAt = new Date(match.startAt)
        const formatted = Number.isNaN(startAt.getTime())
          ? "시간 미정"
          : startAt.toLocaleString("ko-KR", { hour12: false })
        const homeTeam = match.homeTeam || {}
        const awayTeam = match.awayTeam || {}
        const home = homeTeam.name || homeTeam.teamName || homeTeam || "-"
        const away = awayTeam.name || awayTeam.teamName || awayTeam || "-"
        const stadiumObj =
          match.stadium && typeof match.stadium === "object" ? match.stadium : null
        const stadiumName =
          stadiumObj?.stadiumName || match.stadiumName || match.stadium || ""
        const key = match._id || `${home}-${away}-${match.startAt}`
        return {
          key,
          formatted,
          home,
          away,
          homeLogo: homeTeam.logoImage || "",
          awayLogo: awayTeam.logoImage || "",
          stadiumName,
          stadiumObj,
          stadiumId: stadiumObj?._id || match.stadium?._id || match.stadium,
        }
      }),
    [matches]
  )

  if (!category) {
    return (
      <div className="container">
        <h1>카테고리를 찾을 수 없습니다.</h1>
        <button className="back-btn" onClick={() => navigate("/")}>
          이전으로
        </button>
      </div>
    )
  }

  const goStadium = (stadium) => {
    navigate(`/stadium/${stadium._id}`, { state: { stadium } })
  }

  const accentColor = category?.color || "#0C4A6E"
  const accentBg = `${accentColor}20`

  return (
    <div className="category-page">
      <div
        className="category-page__hero"
        style={{ borderColor: accentColor, backgroundColor: accentBg }}
      >
        <div
          className="category-page__hero-emoji"
          style={{ color: accentColor, backgroundColor: `${accentColor}15` }}
          aria-hidden="true"
        >
          {category.emoji}
        </div>
        <div className="category-page__hero-copy">
          <h1>{category.name}</h1>
          <p>{category.desc}</p>
        </div>
      </div>

      {matchItems.length > 0 && (
        <section className="category-page__section">
          <div className="category-page__section-head">
            <h2>다가오는 경기</h2>
            <span>최대 5개의 경기 일정</span>
          </div>
          <ul className="category-page__match-list">
            {matchItems.map((item) => (
              <li key={item.key}>
                <button
                  type="button"
                  className="category-page__match-card"
                  onClick={() => {
                    if (item.stadiumObj?._id) {
                      navigate(`/stadium/${item.stadiumObj._id}`, {
                        state: { stadium: item.stadiumObj },
                      })
                    } else if (item.stadiumId) {
                      navigate(`/stadium/${item.stadiumId}`)
                    }
                  }}
                >
                  <div className="category-page__match-time">{item.formatted}</div>
                  <div className="category-page__match-teams">
                    <div className="category-page__match-team">
                      {item.homeLogo ? (
                        <img src={item.homeLogo} alt={`${item.home} 로고`} className="category-page__match-logo" />
                      ) : (
                        <span className="category-page__match-logo category-page__match-logo--placeholder">
                          {item.home?.[0] || 'H'}
                        </span>
                      )}
                      <span>{item.home}</span>
                    </div>
                    <span aria-hidden="true" className="category-page__match-versus">
                      vs
                    </span>
                    <div className="category-page__match-team">
                      {item.awayLogo ? (
                        <img src={item.awayLogo} alt={`${item.away} 로고`} className="category-page__match-logo" />
                      ) : (
                        <span className="category-page__match-logo category-page__match-logo--placeholder">
                          {item.away?.[0] || 'A'}
                        </span>
                      )}
                      <span>{item.away}</span>
                    </div>
                  </div>
                  {item.stadiumName && (
                    <div className="category-page__match-stadium">{item.stadiumName}</div>
                  )}
                </button>
              </li>
            ))}
          </ul>
          </section>
        )}

        <section className="category-page__section">
        <div className="category-page__section-head">
          <h2>경기장 주차 정보</h2>
          {stadiums.length > 0 && (
            <span>상세 정보를 확인하려면 카드를 눌러 주세요</span>
          )}
        </div>

        {stadiums.length === 0 ? (
          <div className="category-page__empty">
            등록된 경기장이 없습니다. 관리자에서 추가해 주세요.
          </div>
        ) : (
          <div className="category-page__stadium-grid">
            {stadiums.map((stadium) => (
              <button
                type="button"
                key={stadium._id}
                className="stadium-card"
                onClick={() => goStadium(stadium)}
              >
                <div className="stadium-card__header">
                  {stadium.logoImage ? (
                    <img
                      src={stadium.logoImage}
                      alt={`${stadium.teamName} 로고`}
                    />
                  ) : (
                    <span
                      className="stadium-card__placeholder"
                      aria-hidden="true"
                    >
                      {category.emoji}
                    </span>
                  )}
                  <div className="stadium-card__heading">
                    <h3>{stadium.teamName}</h3>
                    <p>{stadium.stadiumName}</p>
                  </div>
                </div>
                <div className="stadium-card__meta">
                  <span>{stadium.city || "도시 정보 없음"}</span>
                  {Array.isArray(stadium?.homeStadium?.location?.coordinates) && (
                    <span>
                      {stadium.homeStadium.location.coordinates.join(", ")}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}


