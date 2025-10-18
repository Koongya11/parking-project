import React, { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import api from "../../api"

export default function UserLogin() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    if (!email || !password) return alert("이메일과 비밀번호를 입력하세요.")
    setLoading(true)
    try {
      const { data } = await api.post("/auth/login", { email, password })
      localStorage.setItem("USER_TOKEN", data.token)
      alert("로그인되었습니다.")
      navigate("/")
    } catch (err) {
      console.error("login failed", err)
      const message = err?.response?.data?.message || "로그인에 실패했습니다."
      alert(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container" style={{ maxWidth: 420 }}>
      <h1>로그인</h1>
      <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        <button type="submit" disabled={loading}>{loading ? "로그인 중..." : "로그인"}</button>
      </form>
      <p style={{ marginTop: 16 }}>
        아직 계정이 없으신가요? <Link to="/register">회원가입</Link>
      </p>
    </div>
  )
}
