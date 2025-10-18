const router = require('express').Router()
const { listMatches, createMatch, updateMatch, deleteMatch } = require('../controllers/matchController')
const adminAuth = require('../middleware/adminAuth')

router.get('/', listMatches)
router.post('/', adminAuth, createMatch)
router.put('/:id', adminAuth, updateMatch)
router.delete('/:id', adminAuth, deleteMatch)

module.exports = router

