import React, { useEffect } from "react"
import { useNavigate } from "react-router-dom"

const NAV_ITEMS = [
  { path: "/admin/teams", label: "팀 관리", description: "구단 정보를 추가하고 업데이트합니다." },
  { path: "/admin/matches", label: "경기 일정 관리", description: "경기 일정을 등록하고 다가오는 경기를 정리합니다." },
  { path: "/admin/parking-areas", label: "주차 구역 관리", description: "주차 구역 데이터를 검수하고 품질을 유지합니다." },
]

export default function AdminHome() {
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem("ADMIN_TOKEN")
    if (!token) navigate("/admin/login", { replace: true })
  }, [navigate])

  const logout = () => {
    localStorage.removeItem("ADMIN_TOKEN")
    navigate("/admin/login", { replace: true })
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div>
          <h1 className="admin-header__title">관리자 센터</h1>
          <p className="page-hero__subtitle">
            주차장 데이터와 경기 일정 정보를 최신 상태로 유지하세요.
          </p>
        </div>
        <button type="button" className="cta-button" onClick={logout}>
          로그아웃
        </button>
      </header>

      <section className="admin-nav">
        {NAV_ITEMS.map((item) => (
          <button key={item.path} type="button" onClick={() => navigate(item.path)}>
            <div className="surface-card__title" style={{ fontSize: 20 }}>{item.label}</div>
            <div className="surface-card__desc">{item.description}</div>
          </button>
        ))}
      </section>
    </div>
  )
}
