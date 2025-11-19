import React, { useMemo, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useGoogleLogin } from "@react-oauth/google"
import api from "../../api"
import { useAuth } from "../../context/AuthContext"
import NicknameModal from "./NicknameModal"

const deriveNickname = (payload) => {
  const nickname =
    typeof payload?.user?.nickname === "string" && payload.user.nickname.trim()
      ? payload.user.nickname.trim()
      : ""
  if (nickname) return nickname
  const name = typeof payload?.user?.name === "string" ? payload.user.name.trim() : ""
  if (name) return name
  const email = typeof payload?.user?.email === "string" ? payload.user.email : ""
  if (email.includes("@")) return email.split("@")[0]
  return ""
}

export default function GoogleAuthButton({ buttonText = "구글 계정으로 계속하기" }) {
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = useMemo(() => location.state?.from || "/", [location.state])
  const { login, refreshUser } = useAuth()

  const [processing, setProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [nicknameState, setNicknameState] = useState({ open: false, value: "", submitting: false, error: "" })

  const handleNicknameSubmit = async () => {
    const trimmed = nicknameState.value.trim()
    if (!trimmed) {
      setNicknameState((prev) => ({ ...prev, error: "닉네임을 입력해 주세요." }))
      return
    }

    setNicknameState((prev) => ({ ...prev, submitting: true, error: "" }))
    try {
      await api.patch("/users/me", { nickname: trimmed })
      await refreshUser()
      setNicknameState({ open: false, value: "", submitting: false, error: "" })
      navigate(redirectTo, { replace: true })
    } catch (error) {
      console.error("nickname update failed", error)
      const message = error?.response?.data?.message || "닉네임 저장에 실패했습니다."
      setNicknameState((prev) => ({ ...prev, submitting: false, error: message }))
    }
  }

  const googleLogin = useGoogleLogin({
    flow: "auth-code",
    onSuccess: async (codeResponse) => {
      if (!codeResponse?.code) {
        setProcessing(false)
        setErrorMessage("구글 인증 결과가 올바르지 않습니다.")
        return
      }

      try {
        const { data } = await api.post("/auth/google", { code: codeResponse.code })
        if (data?.token) {
          login(data.token)
        }
        if (data?.needsNickname) {
          setNicknameState({
            open: true,
            value: deriveNickname(data),
            submitting: false,
            error: "",
          })
        } else {
          await refreshUser()
          navigate(redirectTo, { replace: true })
        }
      } catch (error) {
        console.error("google login failed", error)
        const message = error?.response?.data?.message || "구글 로그인에 실패했습니다."
        setErrorMessage(message)
      } finally {
        setProcessing(false)
      }
    },
    onError: (error) => {
      console.error("google oauth window error", error)
      setProcessing(false)
      setErrorMessage("구글 인증 창을 열지 못했습니다. 잠시 후 다시 시도해 주세요.")
    },
  })

  const handleGoogleClick = () => {
    if (nicknameState.open) return
    setErrorMessage("")
    setProcessing(true)
    googleLogin()
  }

  return (
    <>
      <button
        type="button"
        className="oauth-button"
        onClick={handleGoogleClick}
        disabled={processing || nicknameState.open}
      >
        {processing ? "구글 확인 중..." : buttonText}
      </button>
      {errorMessage && <div className="oauth-error">{errorMessage}</div>}
      <NicknameModal
        open={nicknameState.open}
        value={nicknameState.value}
        submitting={nicknameState.submitting}
        error={nicknameState.error}
        onChange={(value) => setNicknameState((prev) => ({ ...prev, value, error: "" }))}
        onSubmit={handleNicknameSubmit}
      />
    </>
  )
}
