import React, { useState } from "react"
import { useNavigate, useLocation, Link } from "react-router-dom"
import api from "../../api"
import { useAuth } from "../../context/AuthContext"
import GoogleAuthButton from "../../components/auth/GoogleAuthButton"

export default function UserLogin() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const redirectTo = location.state?.from || "/"
  const hasGoogleLogin = Boolean((process.env.REACT_APP_GOOGLE_CLIENT_ID || "").trim())

  const submit = async (event) => {
    event.preventDefault()
    if (!email || !password) {
      alert("이메일과 비밀번호를 입력해 주세요.")
      return
    }
    setLoading(true)
    try {
      const { data } = await api.post("/auth/login", { email, password })
      login(data.token)
      navigate(redirectTo, { replace: true })
    } catch (err) {
      console.error("login failed", err)
      const message = err?.response?.data?.message || "로그인에 실패했습니다."
      alert(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div>
          <h1>로그인</h1>
          <p className="page-hero__subtitle" style={{ marginTop: 10 }}>
            저장한 주차장과 맞춤 길찾기 기능을 이용하려면 계정으로 로그인해 주세요.
          </p>
        </div>

        <form onSubmit={submit}>
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button type="submit" className="cta-button" disabled={loading}>
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        {hasGoogleLogin && (
          <>
            <div className="auth-divider">
              <span>또는</span>
            </div>
            <GoogleAuthButton buttonText="구글 계정으로 계속하기" />
          </>
        )}

        <p className="auth-card__footer">
          아직 계정이 없으신가요? <Link to="/register">회원가입</Link>
        </p>
      </div>
    </div>
  )
}
