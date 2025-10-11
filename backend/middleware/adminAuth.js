module.exports = function adminAuth(req, res, next) {
  const token = req.headers['x-admin-token']
  if (!token) return res.status(401).json({ message: 'No admin token' })
  if (token !== process.env.ADMIN_TOKEN) return res.status(403).json({ message: 'Invalid token' })
  next()
}
