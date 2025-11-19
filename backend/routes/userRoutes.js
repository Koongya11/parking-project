const express = require("express")
const router = express.Router()
const { getMe, updateMe } = require("../controllers/userController")
const userAuth = require("../middleware/userAuth")

router.get("/me", userAuth, getMe)
router.patch("/me", userAuth, updateMe)

module.exports = router
