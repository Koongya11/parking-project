import React, { useState } from "react"
import { useNavigate } from "react-router-dom"

export default function AdminLogin() {
  const [token, setToken] = useState("")
  const navigate = useNavigate()

  const submit = (e) => {
    e.preventDefault()
    if (!token) return alert("토큰을 입력하세요")
    localStorage.setItem("ADMIN_TOKEN", token)
    navigate("/admin")
  }

  return (
    <div className="container">
      <h1>관리자 로그인</h1>
      <form onSubmit={submit} style={{ display: "grid", gap: 8, maxWidth: 360 }}>
        <input value={token} onChange={e=>setToken(e.target.value)} placeholder="ADMIN_TOKEN" />
        <button type="submit">로그인</button>
      </form>
    </div>
  )
}
