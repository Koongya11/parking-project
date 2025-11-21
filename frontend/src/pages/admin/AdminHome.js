import React, { useEffect } from "react"
import { useNavigate } from "react-router-dom"

const NAV_ITEMS = [
  { path: "/admin/teams", label: "팀 관리", description: "구단 정보를 추가하고 데이터를 관리합니다." },
  { path: "/admin/matches", label: "경기 일정 관리", description: "경기 일정을 등록하고 최신 정보를 반영합니다." },
  { path: "/admin/parking-areas", label: "주차 구역 관리", description: "주차 구역 데이터를 검토하고 상태를 조정합니다." },
  { path: "/admin/community", label: "커뮤니티 관리", description: "게시글을 검토하고 부적절한 내용을 정리합니다." },
  { path: "/admin/notices", label: "공지사항 관리", description: "공지사항을 작성하고 이미지를 첨부할 수 있습니다." },
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
          <p className="page-hero__subtitle">운영 도구를 활용해 최신 데이터를 유지하세요.</p>
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
