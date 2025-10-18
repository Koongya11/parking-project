import React, { useEffect } from "react"
import { useNavigate } from "react-router-dom"

const NAV_ITEMS = [
  { path: "/admin/teams", label: "팀 관리" },
  { path: "/admin/matches", label: "경기 일정 관리" },
  { path: "/admin/parking-areas", label: "주차 영역 관리" },
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
    <div className="container" style={{ maxWidth: 640 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ marginBottom: 8 }}>관리자 홈</h1>
          <p style={{ color: "#64748b", margin: 0 }}>원하는 관리 도구를 선택하세요.</p>
        </div>
        <button onClick={logout}>로그아웃</button>
      </header>

      <section style={{ display: "grid", gap: 16 }}>
        {NAV_ITEMS.map(item => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            style={{
              padding: "16px 20px",
              textAlign: "left",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 600 }}>{item.label}</div>
            <div style={{ color: "#94a3b8", marginTop: 4 }}>
              {item.path.endsWith("teams") && "팀과 홈구장을 등록·수정합니다."}
              {item.path.endsWith("matches") && "경기 일정을 추가하고 관리합니다."}
              {item.path.endsWith("parking-areas") && "주차 영역의 정보와 집계 수치를 관리합니다."}
            </div>
          </button>
        ))}
      </section>
    </div>
  )
}
