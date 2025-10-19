import React, { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import api from "../../api"
import { useAuth } from "../../context/AuthContext"

export default function UserRegister() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuth()

  const submit = async (e) => {
    e.preventDefault()
    if (!email || !password) return alert("이메일과 비밀번호를 입력하세요.")
    setLoading(true)
    try {
      const { data } = await api.post("/auth/register", { email, password })
      login(data.token)
      alert("가입이 완료되었습니다.")
      navigate("/")
    } catch (err) {
      console.error("register failed", err)
      const message = err?.response?.data?.message || "가입에 실패했습니다."
      alert(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container" style={{ maxWidth: 420 }}>
      <h1>회원가입</h1>
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
        <button type="submit" disabled={loading}>{loading ? "가입 중..." : "가입하기"}</button>
      </form>
      <p style={{ marginTop: 16 }}>
        이미 계정이 있으신가요? <Link to="/login">로그인</Link>
      </p>
    </div>
  )
}
