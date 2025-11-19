import React from "react"

export default function NicknameModal({ open, value, onChange, onSubmit, submitting, error }) {
  if (!open) return null

  return (
    <div className="auth-modal">
      <div className="auth-modal__content">
        <h2>닉네임 설정</h2>
        <p className="auth-modal__description">
          커뮤니티와 즐겨찾기에서 표시할 닉네임을 입력해 주세요. 언제든 프로필에서 다시 변경할 수 있습니다.
        </p>
        <input
          type="text"
          maxLength={24}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              onSubmit()
            }
          }}
          placeholder="닉네임"
          autoFocus
          disabled={submitting}
        />
        {error && <div className="auth-modal__error">{error}</div>}
        <button type="button" className="cta-button auth-modal__submit" onClick={onSubmit} disabled={submitting}>
          {submitting ? "저장 중..." : "완료"}
        </button>
      </div>
    </div>
  )
}
