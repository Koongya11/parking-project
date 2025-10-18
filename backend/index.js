const express = require('express')
const cors = require('cors')
const connectDB = require('./config/db')
const stadiumRoutes = require('./routes/stadiumRoutes')
const teamRoutes = require('./routes/teamRoutes')
const matchRoutes = require('./routes/matchRoutes')
const parkingAreaRoutes = require('./routes/parkingAreaRoutes')
const authRoutes = require('./routes/authRoutes')

connectDB()

const app = express()
const port = 5000

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use('/api/auth', authRoutes)
app.use('/api/parking-areas', parkingAreaRoutes)
app.use('/api/stadiums', stadiumRoutes)
app.use('/api/teams', teamRoutes)
app.use('/api/matches', matchRoutes)

app.listen(port, () => {
  console.log(`Backend server running at http://localhost:${port}`)
})
