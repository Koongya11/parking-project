import React from "react"
import { useNavigate } from "react-router-dom"
import CATEGORIES from "../data/categories"

export default function Home() {
  const navigate = useNavigate()
  return (
    <div className="container">
      <header className="header">
        <h1>주차 정보 서비스</h1>
        <p className="subtitle">관심 있는 종목과 구단을 선택해 주차 정보를 확인해 보세요.</p>
      </header>

      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate("/login")}>로그인</button>
        <button onClick={() => navigate("/register")}>회원가입</button>
      </div>

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
