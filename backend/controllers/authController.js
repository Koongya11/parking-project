const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../models/User')

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret'

exports.register = async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ message: '이메일과 비밀번호를 입력하세요.' })

    const existing = await User.findOne({ email })
    if (existing) return res.status(409).json({ message: '이미 가입된 이메일입니다.' })

    const hashed = await bcrypt.hash(password, 10)
    const user = await User.create({ email, password: hashed })

    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' })
    res.status(201).json({ token })
  } catch (err) {
    console.error('register error', err)
    res.status(500).json({ message: '서버 오류가 발생했습니다.' })
  }
}

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ message: '이메일과 비밀번호를 입력하세요.' })

    const user = await User.findOne({ email })
    if (!user) return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' })

    const match = await bcrypt.compare(password, user.password)
    if (!match) return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' })

    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' })
    res.json({ token })
  } catch (err) {
    console.error('login error', err)
    res.status(500).json({ message: '서버 오류가 발생했습니다.' })
  }
}
