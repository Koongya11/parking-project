import React from "react"
import { useNavigate } from "react-router-dom"
import CATEGORIES from "../data/categories"

export default function Home() {
  const navigate = useNavigate()
  return (
    <div className="container">
      <header className="header">
        <h1>스포츠 주차 정보</h1>
        <p className="subtitle">종목을 선택해 경기장별 주차 팁을 확인하세요</p>
      </header>
      <main className="grid">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            className="card"
            onClick={() => navigate(`/category/${c.id}`)}
          >
            <div className="card-icon">{c.emoji}</div>
            <div className="card-texts">
              <div className="card-title">{c.name}</div>
              <div className="card-desc">{c.desc}</div>
            </div>
          </button>
        ))}
      </main>
    </div>
  )
}
