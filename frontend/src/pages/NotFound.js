import React from "react"
import { useNavigate } from "react-router-dom"

export default function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="container">
      <header className="header">
        <h1>페이지를 찾을 수 없습니다</h1>
        <p className="subtitle">주소를 다시 확인해주세요.</p>
      </header>
      <button className="back-btn" onClick={() => navigate("/")}>메인으로</button>
    </div>
  )
}
