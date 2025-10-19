const express = require('express')
const router = express.Router()
const { getRoute } = require('../controllers/navigationController')

router.get('/route', getRoute)

module.exports = router
