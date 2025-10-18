const router = require('express').Router()
const { listTeams, createTeam, updateTeam, deleteTeam } = require('../controllers/teamController')
const adminAuth = require('../middleware/adminAuth')

router.get('/', listTeams)
router.post('/', adminAuth, createTeam)
router.put('/:id', adminAuth, updateTeam)
router.delete('/:id', adminAuth, deleteTeam)

module.exports = router

