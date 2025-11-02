import React from "react"
import { useNavigate } from "react-router-dom"

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="page page--narrow">
      <section className="page-hero">
        <h1 className="page-hero__title">페이지를 찾을 수 없어요</h1>
        <p className="page-hero__subtitle">
          주소가 잘못되었거나 삭제된 페이지입니다. 홈으로 돌아가 다시 한 번 찾아볼까요?
        </p>
      </section>
      <div className="empty-state">
        <button type="button" className="cta-button" onClick={() => navigate("/")}>
          홈으로 이동
        </button>
      </div>
    </div>
  )
}
