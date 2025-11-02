import React from "react"
import { useNavigate } from "react-router-dom"
import CATEGORIES from "../data/categories"

export default function Home() {
  const navigate = useNavigate()

  return (
    <div className="page">
      <section className="page-hero">
        <h1 className="page-hero__title">주차 정보 지도</h1>
        <p className="page-hero__subtitle">
          경기장 주변 주차 상황을 한눈에 확인하고, 가장 가까운 공간까지 실시간 길찾기를 이용해 보세요.
        </p>
        <div className="pill-group">
          <span className="pill">경기장 데이터</span>
          <span className="pill">주차장 공유</span>
          <span className="pill">실시간 가이드</span>
        </div>
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
                  {category.emoji}
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
    </div>
  )
}
