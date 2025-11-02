import React, { useState } from "react"
import { useNavigate } from "react-router-dom"

export default function AdminLogin() {
  const [token, setToken] = useState("")
  const navigate = useNavigate()

  const submit = (event) => {
    event.preventDefault()
    if (!token) {
      alert("관리자 토큰을 입력해 주세요.")
      return
    }
    localStorage.setItem("ADMIN_TOKEN", token)
    navigate("/admin")
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div>
          <h1>관리자 로그인</h1>
          <p className="page-hero__subtitle" style={{ marginTop: 10 }}>
            발급받은 관리자 토큰을 입력하면 데이터 관리 페이지로 이동합니다.
          </p>
        </div>

        <form onSubmit={submit}>
          <input
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="ADMIN_TOKEN"
          />
          <button type="submit" className="cta-button">
            로그인
          </button>
        </form>
      </div>
    </div>
  )
}
