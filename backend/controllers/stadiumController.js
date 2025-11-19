const path = require("path")
const jwt = require("jsonwebtoken")
const Stadium = require("../models/Stadium")
const CommunityPost = require("../models/CommunityPost")
const CommunityPostView = require("../models/CommunityPostView")
const User = require("../models/User")

const JWT_SECRET = process.env.JWT_SECRET || "change_this_secret"
const COMMUNITY_VIEW_COOLDOWN_MINUTES_RAW = Number(process.env.COMMUNITY_VIEW_COOLDOWN_MINUTES || 180)
const COMMUNITY_VIEW_COOLDOWN_MS =
  Number.isFinite(COMMUNITY_VIEW_COOLDOWN_MINUTES_RAW) && COMMUNITY_VIEW_COOLDOWN_MINUTES_RAW > 0
    ? COMMUNITY_VIEW_COOLDOWN_MINUTES_RAW * 60 * 1000
    : 0

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

const normalizeReplies = (replies) =>
  Array.isArray(replies)
    ? replies.map((reply) => {
        const plain = toPlainObject(reply) || {}
        return {
          ...plain,
          _id: toIdString(plain._id) || plain._id,
          authorId: toIdString(plain.authorId),
        }
      })
    : []

const normalizeComments = (comments) =>
  Array.isArray(comments)
    ? comments.map((comment) => {
        const plain = toPlainObject(comment) || {}
        return {
          ...plain,
          _id: toIdString(plain._id) || plain._id,
          authorId: toIdString(plain.authorId),
          replies: normalizeReplies(plain.replies),
        }
      })
    : []

const resolveAuthorInfo = async (userPayload) => {
  const authorId = toIdString(userPayload?.id)
  if (!authorId) {
    return {
      authorId: null,
      authorName: userPayload?.nickname || userPayload?.name || userPayload?.email || "?듬챸",
    }
  }
  const user = await User.findById(authorId).select("nickname name email").lean()
  const authorName =
    (user?.nickname && user.nickname.trim()) ||
    (user?.name && user.name.trim()) ||
    (user?.email && user.email.split("@")[0]) ||
    (userPayload?.nickname && userPayload.nickname.trim()) ||
    userPayload?.name ||
    userPayload?.email ||
    "?듬챸"

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

const extractUserIdFromRequest = (req) => {
  const token = req.headers["x-user-token"] || req.headers.authorization?.replace("Bearer ", "")
  if (!token) return null
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    return toIdString(decoded?.id)
  } catch (error) {
    return null
  }
}

const getClientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"]
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim()
  }
  if (typeof req.headers["x-real-ip"] === "string" && req.headers["x-real-ip"].trim()) {
    return req.headers["x-real-ip"].trim()
  }
  return req.ip || req.connection?.remoteAddress || null
}

const resolveViewerKey = (req) => {
  const userId = extractUserIdFromRequest(req)
  if (userId) return `user:${userId}`
  const ip = getClientIp(req)
  return ip ? `ip:${ip}` : null
}

const shouldCountCommunityView = async (postId, viewerKey) => {
  if (!viewerKey) return true
  const now = new Date()
  const record = await CommunityPostView.findOne({ postId, viewerKey })
  if (!record) {
    try {
      await CommunityPostView.create({ postId, viewerKey, lastViewedAt: now })
      return true
    } catch (error) {
      if (error?.code === 11000) {
        return false
      }
      throw error
    }
  }

  const lastViewedAt = record.lastViewedAt ? new Date(record.lastViewedAt).getTime() : 0
  if (!COMMUNITY_VIEW_COOLDOWN_MS || now.getTime() - lastViewedAt >= COMMUNITY_VIEW_COOLDOWN_MS) {
    record.lastViewedAt = now
    await record.save()
    return true
  }
  return false
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
    const post = await CommunityPost.findOne({ _id: postId, stadiumId: id })

    if (!post) return res.status(404).json({ message: "Post not found" })

    const viewerKey = resolveViewerKey(req)
    const canIncrease = await shouldCountCommunityView(post._id, viewerKey)
    if (canIncrease) {
      post.views = (post.views || 0) + 1
      await post.save()
    }

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

exports.addCommunityReply = async (req, res) => {
  try {
    const { id, postId, commentId } = req.params
    const { message } = req.body

    if (!message || !message.trim()) {
      return res.status(400).json({ message: "답글 내용을 입력해 주세요." })
    }

    const post = await CommunityPost.findOne({ _id: postId, stadiumId: id })
    if (!post) return res.status(404).json({ message: "Post not found" })

    const comment = post.comments.id(commentId)
    if (!comment) return res.status(404).json({ message: "Comment not found" })

    const { authorId, authorName } = await resolveAuthorInfo(req.user)

    comment.replies = Array.isArray(comment.replies) ? comment.replies : []
    comment.replies.push({
      authorId,
      authorName,
      message: message.trim(),
    })
    await post.save()

    res.status(201).json(buildCommunityPostPayload(post, authorId))
  } catch (error) {
    console.error("addCommunityReply error", error)
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

exports.deleteCommunityPost = async (req, res) => {
  try {
    const { id, postId } = req.params
    const userId = toIdString(req.user?.id)
    if (!userId) return res.status(401).json({ message: "삭제 권한이 없습니다." })

    const post = await CommunityPost.findOne({ _id: postId, stadiumId: id })
    if (!post) return res.status(404).json({ message: "Post not found" })

    if (toIdString(post.authorId) !== userId) {
      return res.status(403).json({ message: "본인이 작성한 글만 삭제할 수 있습니다." })
    }

    await CommunityPost.deleteOne({ _id: post._id })
    await CommunityPostView.deleteMany({ postId: post._id }).catch(() => {})

    res.json({ ok: true })
  } catch (error) {
    console.error("deleteCommunityPost error", error)
    res.status(500).json({ message: "Server Error" })
  }
}

exports.adminListCommunityPosts = async (req, res) => {
  try {
    const { stadiumId, q, page = 1, limit = 50 } = req.query
    const numericLimit = Math.min(Math.max(Number(limit) || 50, 1), 200)
    const numericPage = Math.max(Number(page) || 1, 1)
    const filter = {}

    if (stadiumId) filter.stadiumId = stadiumId
    if (q && q.trim()) {
      const regex = new RegExp(q.trim(), "i")
      filter.$or = [{ title: regex }, { message: regex }, { authorName: regex }]
    }

    const [items, total] = await Promise.all([
      CommunityPost.find(filter)
        .sort({ createdAt: -1 })
        .skip((numericPage - 1) * numericLimit)
        .limit(numericLimit)
        .populate({ path: "stadiumId", select: "stadiumName" })
        .lean(),
      CommunityPost.countDocuments(filter),
    ])

    res.json({
      items: items.map((post) => ({
        _id: post._id,
        title: post.title,
        authorName: post.authorName,
        stadiumId: post.stadiumId?._id?.toString?.() || post.stadiumId?.toString?.() || "",
        stadiumName: post.stadiumId?.stadiumName || "",
        views: post.views || 0,
        recommendCount: post.recommendCount || 0,
        createdAt: post.createdAt,
      })),
      total,
      page: numericPage,
      limit: numericLimit,
    })
  } catch (error) {
    console.error("adminListCommunityPosts error", error)
    res.status(500).json({ message: "Server Error" })
  }
}

exports.adminDeleteCommunityPost = async (req, res) => {
  try {
    const { postId } = req.params
    const post = await CommunityPost.findById(postId)
    if (!post) return res.status(404).json({ message: "Post not found" })

    await CommunityPost.deleteOne({ _id: post._id })
    await CommunityPostView.deleteMany({ postId: post._id }).catch(() => {})

    res.json({ ok: true })
  } catch (error) {
    console.error("adminDeleteCommunityPost error", error)
    res.status(500).json({ message: "Server Error" })
  }
}
