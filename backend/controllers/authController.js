const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const fetch = require("node-fetch")
const User = require("../models/User")

const JWT_SECRET = process.env.JWT_SECRET || "change_this_secret"
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ""
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ""

exports.register = async (req, res) => {
  try {
    const { email, password, nickname } = req.body
    if (!email || !password || !nickname || !nickname.trim()) {
      return res.status(400).json({ message: "이메일, 비밀번호, 닉네임을 모두 입력해 주세요." })
    }

    const nicknameTrimmed = nickname.trim()
    const passwordRule = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()[\]{};:'"\\|,.<>/?`~\-_=+]).{8,}$/
    if (!passwordRule.test(password)) {
      return res.status(400).json({
        message: "비밀번호는 영어, 숫자, 특수문자를 모두 포함한 8자 이상이어야 합니다.",
      })
    }

    const existing = await User.findOne({ email })
    if (existing) return res.status(409).json({ message: "이미 가입된 이메일입니다." })

    const nicknameExists = await User.findOne({ nickname: nicknameTrimmed })
    if (nicknameExists) return res.status(409).json({ message: "이미 사용 중인 닉네임입니다." })

    const hashed = await bcrypt.hash(password, 10)
    const user = await User.create({
      email,
      password: hashed,
      provider: "local",
      nickname: nicknameTrimmed,
    })

    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: "7d" })
    res.status(201).json({ token })
  } catch (err) {
    console.error("register error", err)
    res.status(500).json({ message: "서버 오류가 발생했습니다." })
  }
}

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ message: "이메일과 비밀번호를 입력해 주세요." })

    const user = await User.findOne({ email })
    if (!user) return res.status(401).json({ message: "이메일 또는 비밀번호가 올바르지 않습니다." })
    if (!user.password) {
      return res.status(401).json({ message: "이 계정은 구글 로그인을 통해서만 접속할 수 있습니다." })
    }

    const match = await bcrypt.compare(password, user.password)
    if (!match) return res.status(401).json({ message: "이메일 또는 비밀번호가 올바르지 않습니다." })

    user.lastLoginAt = new Date()
    await user.save()

    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: "7d" })
    res.json({ token })
  } catch (err) {
    console.error("login error", err)
    res.status(500).json({ message: "서버 오류가 발생했습니다." })
  }
}

exports.googleLogin = async (req, res) => {
  try {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return res.status(500).json({ message: "Google OAuth 환경변수가 설정되지 않았습니다." })
    }

    const { code } = req.body || {}
    if (!code) return res.status(400).json({ message: "구글 인증 코드가 필요합니다." })

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: "postmessage",
        grant_type: "authorization_code",
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error("google token error", errorText)
      return res.status(400).json({ message: "구글 인증에 실패했습니다. 다시 시도해 주세요." })
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData?.access_token
    if (!accessToken) {
      return res.status(400).json({ message: "구글 토큰을 불러오지 못했습니다." })
    }

    const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!profileResponse.ok) {
      const errorText = await profileResponse.text()
      console.error("google profile error", errorText)
      return res.status(400).json({ message: "구글 사용자 정보를 불러오지 못했습니다." })
    }

    const profile = await profileResponse.json()
    const googleId = profile?.sub
    const email = profile?.email?.toLowerCase()
    const fullName = (profile?.name || "").trim()
    const avatar = profile?.picture || ""

    if (!googleId || !email) {
      return res.status(400).json({ message: "구글 계정 정보가 올바르지 않습니다." })
    }

    let user = await User.findOne({ email })
    if (!user) {
      user = await User.create({
        email,
        googleId,
        provider: "google",
        name: fullName,
        avatar,
        nickname: "",
      })
    } else {
      if (!user.googleId) user.googleId = googleId
      user.provider = "google"
      if (avatar) user.avatar = avatar
      if (fullName && !user.name) user.name = fullName
    }

    user.lastLoginAt = new Date()
    await user.save()

    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: "7d" })
    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        nickname: user.nickname || "",
        name: user.name || "",
        avatar: user.avatar || avatar || "",
      },
      needsNickname: !user.nickname,
    })
  } catch (err) {
    console.error("google login error", err)
    res.status(500).json({ message: "구글 로그인 중 오류가 발생했습니다." })
  }
}
