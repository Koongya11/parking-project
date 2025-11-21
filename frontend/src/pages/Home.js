import React, { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import api from "../api"
import CATEGORIES from "../data/categories"

const MATCH_RANGE_DAYS = 7

const formatNumber = (value) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "0"
  return value.toLocaleString("ko-KR")
}

const formatMatchDateTime = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "시간 정보 없음"
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

export default function Home() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    stadiums: null,
    parkingAreas: null,
    matchesWeek: null,
  })
  const [highlightMatches, setHighlightMatches] = useState([])
  const [loadingHomeData, setLoadingHomeData] = useState(true)
  const [homeError, setHomeError] = useState("")
  const [latestNotice, setLatestNotice] = useState(null)

  useEffect(() => {
    let active = true

    const fetchHomeData = async () => {
      setLoadingHomeData(true)
      setHomeError("")

      try {
        const now = new Date()
        const end = new Date()
        end.setDate(now.getDate() + MATCH_RANGE_DAYS)

        const [stadiumRes, parkingRes, matchRes] = await Promise.all([
          api.get("/stadiums"),
          api.get("/parking-areas"),
          api.get("/matches", {
            params: {
              from: now.toISOString(),
              to: end.toISOString(),
            },
          }),
        ])

        if (!active) return

        const stadiumList = Array.isArray(stadiumRes.data) ? stadiumRes.data : []
        const parkingList = Array.isArray(parkingRes.data) ? parkingRes.data : []
        const matchList = Array.isArray(matchRes.data) ? matchRes.data : []

        setStats({
          stadiums: stadiumList.length,
          parkingAreas: parkingList.length,
          matchesWeek: matchList.length,
        })

        const normalizedMatches = matchList
          .map((match) => {
            const startAt = new Date(match.startAt)
            const timestamp = startAt.getTime()
            const homeTeam = match.homeTeam || {}
            const awayTeam = match.awayTeam || {}
            const home = homeTeam.name || homeTeam.teamName || homeTeam || "-"
            const away = awayTeam.name || awayTeam.teamName || awayTeam || "-"
            const stadiumData = match.stadium && typeof match.stadium === "object" ? match.stadium : null
            const stadiumName = stadiumData?.stadiumName || match.stadiumName || ""
            const isValidStart = !Number.isNaN(timestamp)
            const diffHours = isValidStart ? (timestamp - now.getTime()) / (1000 * 60 * 60) : Infinity

            let statusTone = "normal"
            let status = "진행"
            if (diffHours <= 4) {
              statusTone = "busy"
              status = "곧 시작"
            } else if (diffHours <= 24) {
              statusTone = "busy"
              status = "오늘 경기"
            } else if (diffHours <= 72) {
              statusTone = "normal"
              status = "이번 주"
            } else {
              statusTone = "free"
              status = "여유 있음"
            }

            return {
              id: match._id || `${home}-${away}-${match.startAt}`,
              stadium: stadiumName,
              home,
              away,
              homeLogo: homeTeam.logoImage || "",
              awayLogo: awayTeam.logoImage || "",
              stadiumData,
              stadiumId: stadiumData?._id || match.stadium?._id || match.stadium,
              timeLabel: isValidStart ? formatMatchDateTime(startAt) : "시간 정보 없음",
              status,
              statusTone,
              startAt: isValidStart ? timestamp : null,
            }
          })
          .filter((match) => match.startAt !== null)
          .sort((a, b) => a.startAt - b.startAt)
          .slice(0, 3)

        setHighlightMatches(normalizedMatches)
      } catch (error) {
        console.error("failed to load home data", error)
        if (!active) return
        setHomeError("실제 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.")
        setHighlightMatches([])
      } finally {
        if (active) setLoadingHomeData(false)
      }
    }

    fetchHomeData()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let mounted = true
    const fetchLatestNotice = async () => {
      try {
        const { data } = await api.get("/notices", { params: { limit: 1 } })
        if (!mounted) return
        setLatestNotice(Array.isArray(data) && data.length > 0 ? data[0] : null)
      } catch (error) {
        if (mounted) setLatestNotice(null)
      }
    }
    fetchLatestNotice()
    return () => {
      mounted = false
    }
  }, [])

  const statsEntries = useMemo(
    () => [
      { label: "등록 경기장", value: stats.stadiums, desc: "전체 카테고리 기준" },
      { label: "등록 주차 구역", value: stats.parkingAreas, desc: "실측 및 제보 데이터" },
      { label: "이번 주 예정 경기", value: stats.matchesWeek, desc: "앞으로 7일 기준" },
    ],
    [stats.parkingAreas, stats.matchesWeek, stats.stadiums],
  )

  return (
    <div className="page">
      <section className="page-hero">
        <h1 className="page-hero__title">주차 정보 지도</h1>
        <p className="page-hero__subtitle">
          경기장 주변 주차 상황을 한눈에 확인하고, 가장 가까운 공간까지 실시간 길찾기를 이용해 보세요.
        </p>
        <button
          type="button"
          className="cta-button cta-button--muted"
          style={{ marginTop: 16 }}
          onClick={() => navigate("/notices")}
        >
          공지사항
        </button>
        {latestNotice && (
          <div className="home-latest-notice">
            <span className="home-latest-notice__label" aria-label="최근 공지">
              📢 최근 공지
            </span>
            <button
              type="button"
              onClick={() => navigate("/notices", { state: { noticeId: latestNotice._id || "" } })}
            >
              {latestNotice.title}
            </button>
          </div>
        )}
      </section>

      <section className="section">
        <div className="section__head">
          <h2>관심 종목 선택</h2>
          <span>종목별 경기장 정보를 빠르게 찾아보세요</span>
        </div>
        <div className="card-grid card-grid--cols-2">
          {CATEGORIES.map((category) => (
            <button
              key={category.id}
              type="button"
              className="surface-card"
              onClick={() => navigate(`/category/${category.id}`)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span
                  aria-hidden="true"
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 16,
                    background: `${category.color}14`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 26,
                  }}
                >
                  {category.iconImage ? (
                    <img src={category.iconImage} alt={`${category.name} 로고`} className="category-icon-image" />
                  ) : (
                    category.emoji
                  )}
                </span>
                <div>
                  <h3 className="surface-card__title">{category.name}</h3>
                  <p className="surface-card__desc">{category.desc}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="home-highlight">
        <div className="home-highlight__copy">
          <p className="home-highlight__kicker">이번 주 이용 현황</p>
          <h2>
            {typeof stats.stadiums === "number" && typeof stats.parkingAreas === "number"
              ? `지금 ${formatNumber(stats.stadiums)}개 경기장과 ${formatNumber(stats.parkingAreas)}개 주차 구역이 연결되어 있어요.`
              : "실제 주차 데이터를 불러오는 중입니다."}
          </h2>
          <p>
            {typeof stats.matchesWeek === "number"
              ? `앞으로 ${MATCH_RANGE_DAYS}일 동안 ${formatNumber(stats.matchesWeek)}개의 경기가 예정되어 있어요.`
              : "곧 이번 주 경기 일정이 표시됩니다."}
          </p>
          {homeError && <p className="home-highlight__error">{homeError}</p>}
        </div>
        <div className="stats-grid">
          {statsEntries.map((stat) => (
            <div key={stat.label} className="stat-card">
              <span className="stat-card__label">{stat.label}</span>
              <strong className="stat-card__value">
                {typeof stat.value === "number" ? formatNumber(stat.value) : loadingHomeData ? "?" : "0"}
              </strong>
              <span className="stat-card__desc">{stat.desc}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section home-games-section">
        <div className="section__head">
          <h2>이번 주 경기</h2>
          <span>다가오는 경기 일정과 혼잡도를 미리 확인하세요.</span>
        </div>
        {loadingHomeData ? (
          <div className="empty-state--subtle">경기 정보를 불러오는 중입니다…</div>
        ) : highlightMatches.length === 0 ? (
          <div className="empty-state--subtle">일주일 내 등록된 경기가 없습니다.</div>
        ) : (
          <div className="match-list">
            {highlightMatches.map((game) => (
              <button
                key={game.id}
                type="button"
                className="match-card"
                onClick={() => {
                  if (game.stadiumData?._id) {
                    navigate(`/stadium/${game.stadiumData._id}`, { state: { stadium: game.stadiumData } })
                  } else if (game.stadiumId) {
                    navigate(`/stadium/${game.stadiumId}`)
                  }
                }}
              >
                <div className="match-card__body">
                  <span className="match-card__stadium">{game.stadium}</span>
                  <div className="match-card__teams">
                    <div className="match-card__team">
                      {game.homeLogo ? (
                        <img src={game.homeLogo} alt={`${game.home} 로고`} className="match-card__team-logo" />
                      ) : (
                        <span className="match-card__team-logo match-card__team-logo--placeholder">{game.home?.[0] || "H"}</span>
                      )}
                      <span>{game.home}</span>
                    </div>
                    <span aria-hidden="true" className="match-card__versus">
                      vs
                    </span>
                    <div className="match-card__team">
                      {game.awayLogo ? (
                        <img src={game.awayLogo} alt={`${game.away} 로고`} className="match-card__team-logo" />
                      ) : (
                        <span className="match-card__team-logo match-card__team-logo--placeholder">{game.away?.[0] || "A"}</span>
                      )}
                      <span>{game.away}</span>
                    </div>
                  </div>
                  <span className="match-card__time">{game.timeLabel}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

