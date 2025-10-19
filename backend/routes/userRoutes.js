const express = require("express")
const router = express.Router()
const { getMe } = require("../controllers/userController")
const userAuth = require("../middleware/userAuth")

router.get("/me", userAuth, getMe)

module.exports = router
