const router = require("express").Router()
const path = require("path")
const fs = require("fs")
const multer = require("multer")
const adminAuth = require("../middleware/adminAuth")
const { listNotices, getNotice, createNotice, deleteNotice } = require("../controllers/noticeController")

const noticeUploadDir = path.join(__dirname, "..", "uploads", "notices")
fs.mkdirSync(noticeUploadDir, { recursive: true })

const noticeImageUpload = multer({
  storage: multer.diskStorage({
    destination: noticeUploadDir,
    filename: (req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname || "")}`
      cb(null, unique)
    },
  }),
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith("image/")) {
      cb(new Error("이미지 파일만 업로드할 수 있습니다."))
    } else {
      cb(null, true)
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 },
})

router.get("/", listNotices)
router.get("/:id", getNotice)
router.post("/", adminAuth, noticeImageUpload.array("images", 10), createNotice)
router.delete("/:id", adminAuth, deleteNotice)

module.exports = router
