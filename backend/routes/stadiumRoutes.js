const router = require("express").Router()
const path = require("path")
const fs = require("fs")
const multer = require("multer")
const {
  listStadiums,
  createStadium,
  updateStadium,
  deleteStadium,
  listCommunityPosts,
  createCommunityPost,
  getCommunityPost,
  addCommunityComment,
  toggleRecommendCommunityPost,
} = require("../controllers/stadiumController")
const adminAuth = require("../middleware/adminAuth")
const userAuth = require("../middleware/userAuth")

const communityUploadDir = path.join(__dirname, "..", "uploads", "community")
fs.mkdirSync(communityUploadDir, { recursive: true })

const communityImageUpload = multer({
  storage: multer.diskStorage({
    destination: communityUploadDir,
    filename: (req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname || "")}`
      cb(null, unique)
    },
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith("image/")) {
      cb(null, true)
    } else {
      cb(new Error("이미지 파일만 업로드할 수 있습니다."))
    }
  },
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
})

router.get("/", listStadiums)
router.post("/", adminAuth, createStadium)
router.put("/:id", adminAuth, updateStadium)
router.delete("/:id", adminAuth, deleteStadium)

router.get("/:id/community", listCommunityPosts)
router.get("/:id/community/:postId", getCommunityPost)
router.post("/:id/community", userAuth, communityImageUpload.array("images", 5), createCommunityPost)
router.post("/:id/community/:postId/comments", userAuth, addCommunityComment)
router.post("/:id/community/:postId/recommend", userAuth, toggleRecommendCommunityPost)

module.exports = router
