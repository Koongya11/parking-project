const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret'

module.exports = function userAuth(req, res, next) {
  const token = req.headers['x-user-token'] || req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ message: '사용자 토큰이 필요합니다.' })
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded
    next()
  } catch (err) {
    return res.status(401).json({ message: '유효하지 않은 사용자 토큰입니다.' })
  }
}
