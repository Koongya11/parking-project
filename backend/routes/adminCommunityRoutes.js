const router = require("express").Router()
const adminAuth = require("../middleware/adminAuth")
const { adminListCommunityPosts, adminDeleteCommunityPost } = require("../controllers/stadiumController")

router.get("/", adminAuth, adminListCommunityPosts)
router.delete("/:postId", adminAuth, adminDeleteCommunityPost)

module.exports = router
