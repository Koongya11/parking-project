import React, { useState } from "react"
import { useNavigate, useLocation, Link } from "react-router-dom"
import api from "../../api"
import { useAuth } from "../../context/AuthContext"
import GoogleAuthButton from "../../components/auth/GoogleAuthButton"

export default function UserRegister() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [nickname, setNickname] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const redirectTo = location.state?.from || "/"
  const hasGoogleLogin = Boolean((process.env.REACT_APP_GOOGLE_CLIENT_ID || "").trim())

  const submit = async (event) => {
    event.preventDefault()
    if (!email || !password || !nickname.trim()) {
      alert("이메일, 비밀번호, 닉네임을 모두 입력해 주세요.")
      return
    }
    setLoading(true)
    try {
      const { data } = await api.post("/auth/register", { email, password, nickname: nickname.trim() })
      login(data.token)
      navigate(redirectTo, { replace: true })
    } catch (err) {
      console.error("register failed", err)
      const message = err?.response?.data?.message || "가입에 실패했습니다."
      alert(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div>
          <h1>회원가입</h1>
          <p className="page-hero__subtitle" style={{ marginTop: 10 }}>
            즐겨찾기와 길찾기 기록을 저장하려면 간단한 정보만 입력하면 됩니다.
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
            type="text"
            placeholder="닉네임"
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button type="submit" className="cta-button" disabled={loading}>
            {loading ? "가입 중..." : "가입하기"}
          </button>
        </form>

        {hasGoogleLogin && (
          <>
            <div className="auth-divider">
              <span>또는</span>
            </div>
            <GoogleAuthButton buttonText="구글 계정으로 가입하기" />
          </>
        )}

        <p className="auth-card__footer">
          이미 계정이 있으신가요? <Link to="/login">로그인</Link>
        </p>
      </div>
    </div>
  )
}
