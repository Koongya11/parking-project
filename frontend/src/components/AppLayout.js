import React, { useEffect, useRef, useState } from "react"
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import CATEGORIES from "../data/categories"

export default function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isLoggedIn, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!menuOpen) return
    const handleOutsideClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleOutsideClick)
    return () => document.removeEventListener("mousedown", handleOutsideClick)
  }, [menuOpen])

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!sidebarOpen) return
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setSidebarOpen(false)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [sidebarOpen])

  const searchParams = new URLSearchParams(location.search)
  const isMapPage = location.pathname.startsWith("/map")
  const hideTopNav = isMapPage && searchParams.has("stadium")

  const activeCategory = location.pathname.startsWith("/category/")
    ? location.pathname.split("/")[2]
    : null

  const toggleSidebar = () => setSidebarOpen((prev) => !prev)
  const closeSidebar = () => setSidebarOpen(false)

  const goHome = () => navigate("/")

  const goCategory = (id) => navigate(`/category/${id}`)

  const handleProfileClick = () => {
    setMenuOpen(false)
    navigate("/profile")
  }

  const handleLogout = () => {
    setMenuOpen(false)
    logout()
    navigate("/")
  }

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate("/")
    }
  }

  const showBackButton = location.pathname !== "/"

  return (
    <div className={`app-layout${hideTopNav ? " app-layout--chromeless" : ""}`}>
      {!hideTopNav && (
        <header className="top-nav">
          <div className="top-nav__left">
            {showBackButton && (
              <button
                type="button"
                className="back-button top-nav__back"
                onClick={handleBack}
                aria-label="뒤로가기"
              >
                {"\u2190"}
              </button>
            )}
            <button
              type="button"
              className="sidebar-toggle"
              onClick={toggleSidebar}
              aria-expanded={sidebarOpen}
              aria-controls="global-sidebar"
              >
                메뉴
              </button>
          </div>

          <Link to="/" className="top-nav__brand">
            주차 정보 지도
          </Link>

          <div className="top-nav__actions">
            {isLoggedIn ? (
              <div className="profile" ref={menuRef}>
                <button
                  type="button"
                  className="profile__trigger"
                  onClick={() => setMenuOpen((prev) => !prev)}
                >
                  내 프로필
                </button>
                {menuOpen && (
                  <div className="profile__menu">
                    <button type="button" onClick={handleProfileClick}>
                      계정 관리
                    </button>
                    <button type="button" onClick={handleLogout}>
                      로그아웃
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <button type="button" onClick={() => navigate("/login")}>
                  로그인
                </button>
                <button type="button" onClick={() => navigate("/register")}>
                  회원가입
                </button>
              </>
            )}
          </div>
        </header>
      )}

      {sidebarOpen && <div className="sidebar-backdrop" onClick={closeSidebar} />}

      {hideTopNav && showBackButton && (
        <button
          type="button"
          className="back-button floating-back"
          onClick={handleBack}
          aria-label="뒤로가기"
        >
          {"\u2190"}
        </button>
      )}

      <div className="app-layout__body">
        <aside id="global-sidebar" className={`sidebar ${sidebarOpen ? "is-open" : ""}`}>
          <div className="sidebar__header">
            <h2>종목 탐색</h2>
            <button type="button" className="sidebar__close" onClick={closeSidebar}>
              닫기
            </button>
          </div>
          <nav className="sidebar__nav">
            <button
              type="button"
              className={`sidebar__link ${location.pathname === "/" ? "is-active" : ""}`}
              onClick={goHome}
            >
              홈으로 가기
            </button>
            <div className="sidebar__section-label">종목별</div>
            <div className="sidebar__list">
              {CATEGORIES.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  className={`sidebar__link ${activeCategory === category.id ? "is-active" : ""}`}
                  onClick={() => goCategory(category.id)}
                >
                  <span className="sidebar__emoji" aria-hidden="true">
                    {category.emoji}
                  </span>
                  <span>{category.name}</span>
                </button>
              ))}
            </div>
          </nav>
        </aside>

        <main className="app-layout__content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
