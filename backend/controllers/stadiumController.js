const path = require("path")
const Stadium = require("../models/Stadium")
const CommunityPost = require("../models/CommunityPost")
const User = require("../models/User")

const toPlainObject = (value) => {
  if (!value) return value
  if (typeof value.toObject === "function") return value.toObject()
  return value
}

const toIdString = (value) => {
  if (!value) return null
  if (typeof value === "string") return value
  if (typeof value.toString === "function") return value.toString()
  return String(value)
}

const normalizeComments = (comments) =>
  Array.isArray(comments)
    ? comments.map((comment) => {
        const plain = toPlainObject(comment) || {}
        return {
          ...plain,
          _id: toIdString(plain._id) || plain._id,
          authorId: toIdString(plain.authorId),
        }
      })
    : []

const resolveAuthorInfo = async (userPayload) => {
  const authorId = toIdString(userPayload?.id)
  if (!authorId) {
    return {
      authorId: null,
      authorName: userPayload?.name || userPayload?.email || "익명",
    }
  }
  const user = await User.findById(authorId).select("name email").lean()
  const authorName =
    (user?.name && user.name.trim()) ||
    (user?.email && user.email.split("@")[0]) ||
    userPayload?.name ||
    userPayload?.email ||
    "익명"

  return { authorId, authorName }
}

const buildCommunityPostPayload = (post, currentUserId = null) => {
  const plain = toPlainObject(post) || {}
  const images = Array.isArray(plain.images) ? plain.images : []
  const comments = normalizeComments(plain.comments)
  const recommendedBy = Array.isArray(plain.recommendedBy)
    ? plain.recommendedBy
        .map((value) => toIdString(value))
        .filter((value) => Boolean(value))
    : []
  const recommendCount =
    typeof plain.recommendCount === "number" && !Number.isNaN(plain.recommendCount)
      ? plain.recommendCount
      : recommendedBy.length
  const normalizedCurrentUserId = toIdString(currentUserId)

  return {
    ...plain,
    images,
    comments,
    commentCount: comments.length,
    recommendedBy,
    recommendCount,
    recommended: normalizedCurrentUserId ? recommendedBy.includes(normalizedCurrentUserId) : false,
  }
}

// GET /api/stadiums?category=baseball
exports.listStadiums = async (req, res) => {
  try {
    const q = {}
    if (req.query.category) q.category = req.query.category
    const docs = await Stadium.find(q).sort({ teamName: 1, stadiumName: 1 })
    res.json(docs)
  } catch (e) {
    res.status(500).json({ message: "Server Error" })
  }
}

// POST /api/stadiums   (admin)
exports.createStadium = async (req, res) => {
  try {
    const doc = await Stadium.create(req.body)
    res.status(201).json(doc)
  } catch (e) {
    res.status(400).json({ message: e.message })
  }
}

// PUT /api/stadiums/:id (admin)
exports.updateStadium = async (req, res) => {
  try {
    const doc = await Stadium.findByIdAndUpdate(req.params.id, req.body, { new: true })
    if (!doc) return res.status(404).json({ message: "Not found" })
    res.json(doc)
  } catch (e) {
    res.status(400).json({ message: e.message })
  }
}

// DELETE /api/stadiums/:id (admin)
exports.deleteStadium = async (req, res) => {
  try {
    const doc = await Stadium.findByIdAndDelete(req.params.id)
    if (!doc) return res.status(404).json({ message: "Not found" })
    res.json({ ok: true })
  } catch (e) {
    res.status(400).json({ message: e.message })
  }
}

// COMMUNITY POSTS
exports.listCommunityPosts = async (req, res) => {
  try {
    const { id } = req.params
    const { q, sort = "latest" } = req.query
    const filter = { stadiumId: id }

    if (q && q.trim()) {
      const regex = new RegExp(q.trim(), "i")
      filter.$or = [{ title: regex }, { message: regex }, { "comments.message": regex }]
    }

    const sortOption = sort === "popular" ? { recommendCount: -1, views: -1, createdAt: -1 } : { createdAt: -1 }
    const posts = await CommunityPost.find(filter).sort(sortOption).lean()

    res.json(posts.map((post) => buildCommunityPostPayload(post)))
  } catch (error) {
    console.error("listCommunityPosts error", error)
    res.status(500).json({ message: "Server Error" })
  }
}

exports.createCommunityPost = async (req, res) => {
  try {
    const { id } = req.params
    const { title, message } = req.body

    if (!title || !title.trim()) {
      return res.status(400).json({ message: "제목을 입력해 주세요." })
    }

    if (!message || !message.trim()) {
      return res.status(400).json({ message: "내용을 입력해 주세요." })
    }

    const stadium = await Stadium.findById(id)
    if (!stadium) return res.status(404).json({ message: "Stadium not found" })

    const { authorId, authorName } = await resolveAuthorInfo(req.user)

    const images =
      Array.isArray(req.files) && req.files.length > 0
        ? req.files.map((file) => {
            const relative = path.relative(path.join(__dirname, ".."), file.path).replace(/\\/g, "/")
            return `/${relative}`
          })
        : []

    const post = await CommunityPost.create({
      stadiumId: stadium._id,
      title: title.trim(),
      message: message.trim(),
      authorName,
      authorId,
      images,
    })

    res.status(201).json(buildCommunityPostPayload(post, authorId))
  } catch (error) {
    console.error("createCommunityPost error", error)
    res.status(500).json({ message: "Server Error" })
  }
}

exports.getCommunityPost = async (req, res) => {
  try {
    const { id, postId } = req.params
    const post = await CommunityPost.findOneAndUpdate(
      { _id: postId, stadiumId: id },
      { $inc: { views: 1 } },
      { new: true },
    )

    if (!post) return res.status(404).json({ message: "Post not found" })

    res.json(buildCommunityPostPayload(post))
  } catch (error) {
    console.error("getCommunityPost error", error)
    res.status(500).json({ message: "Server Error" })
  }
}

exports.addCommunityComment = async (req, res) => {
  try {
    const { id, postId } = req.params
    const { message } = req.body

    if (!message || !message.trim()) {
      return res.status(400).json({ message: "댓글 내용을 입력해 주세요." })
    }

    const post = await CommunityPost.findOne({ _id: postId, stadiumId: id })
    if (!post) return res.status(404).json({ message: "Post not found" })

    const { authorId, authorName } = await resolveAuthorInfo(req.user)

    post.comments.push({
      authorId,
      authorName,
      message: message.trim(),
    })
    await post.save()

    res.status(201).json(buildCommunityPostPayload(post, authorId))
  } catch (error) {
    console.error("addCommunityComment error", error)
    res.status(500).json({ message: "Server Error" })
  }
}

exports.toggleRecommendCommunityPost = async (req, res) => {
  try {
    const { id, postId } = req.params
    const userId = toIdString(req.user?.id)

    if (!userId) return res.status(401).json({ message: "인증된 사용자만 추천할 수 있습니다." })

    const post = await CommunityPost.findOne({ _id: postId, stadiumId: id })
    if (!post) return res.status(404).json({ message: "Post not found" })

    const recommendedBy = Array.isArray(post.recommendedBy) ? post.recommendedBy : []
    const alreadyRecommended = recommendedBy.some((value) => toIdString(value) === userId)

    if (alreadyRecommended) {
      post.recommendedBy = recommendedBy.filter((value) => toIdString(value) !== userId)
    } else {
      post.recommendedBy = [...recommendedBy, userId]
    }
    post.recommendCount = Array.isArray(post.recommendedBy) ? post.recommendedBy.length : 0

    await post.save()

    res.json(buildCommunityPostPayload(post, userId))
  } catch (error) {
    console.error("toggleRecommendCommunityPost error", error)
    res.status(500).json({ message: "Server Error" })
  }
}
