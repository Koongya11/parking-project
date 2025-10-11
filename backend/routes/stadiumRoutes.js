const router = require('express').Router()
const { listStadiums, createStadium, updateStadium, deleteStadium } = require('../controllers/stadiumController')
const adminAuth = require('../middleware/adminAuth')

router.get('/', listStadiums)
router.post('/', adminAuth, createStadium)
router.put('/:id', adminAuth, updateStadium)
router.delete('/:id', adminAuth, deleteStadium)

module.exports = router
