const fs = require("fs")
const path = require("path")
const Notice = require("../models/Notice")

const buildImageUrl = (req, file) => {
  if (!file) return ""
  return `${req.protocol}://${req.get("host")}/uploads/notices/${file.filename}`
}

const toAbsoluteUrl = (req, url) => {
  if (!url) return ""
  if (url.startsWith("http://") || url.startsWith("https://")) return url
  const pathValue = url.startsWith("/") ? url : `/${url}`
  return `${req.protocol}://${req.get("host")}${pathValue}`
}

const deleteImageIfExists = (imageUrl) => {
  if (!imageUrl) return
  let normalized = imageUrl
  const protocolIndex = normalized.indexOf("://")
  if (protocolIndex !== -1) {
    normalized = normalized.slice(protocolIndex + 3)
    const slashIndex = normalized.indexOf("/")
    normalized = slashIndex !== -1 ? normalized.slice(slashIndex + 1) : ""
  }
  normalized = normalized.replace(/^\/+/, "")
  if (!normalized) return
  const filePath = path.join(__dirname, "..", normalized)
  fs.unlink(filePath, () => {})
}

const parseBlocksPayload = (payload) => {
  if (!payload) return []
  if (Array.isArray(payload)) return payload
  try {
    const parsed = JSON.parse(payload)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    return []
  }
}

exports.listNotices = async (req, res) => {
  try {
    const limit = req.query.limit ? Math.max(0, parseInt(req.query.limit, 10)) : 0
    let query = Notice.find().sort({ createdAt: -1 })
    if (limit > 0) {
      query = query.limit(limit)
    }
    const notices = await query
    const payload = notices.map((notice) => {
      const doc = notice.toObject()
      doc.imageUrl = toAbsoluteUrl(req, doc.imageUrl)
      doc.blocks = Array.isArray(doc.blocks)
        ? doc.blocks.map((block) => ({
            ...block,
            imageUrl: block.type === "image" ? toAbsoluteUrl(req, block.imageUrl) : "",
          }))
        : []
      return doc
    })
    res.json(payload)
  } catch (error) {
    res.status(500).json({ message: "공지사항을 불러오지 못했습니다." })
  }
}

exports.getNotice = async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id)
    if (!notice) return res.status(404).json({ message: "공지사항을 찾을 수 없습니다." })
    const doc = notice.toObject()
    doc.imageUrl = toAbsoluteUrl(req, doc.imageUrl)
    doc.blocks = Array.isArray(doc.blocks)
      ? doc.blocks.map((block) => ({
          ...block,
          imageUrl: block.type === "image" ? toAbsoluteUrl(req, block.imageUrl) : "",
        }))
      : []
    res.json(doc)
  } catch (error) {
    res.status(500).json({ message: "공지사항을 불러오지 못했습니다." })
  }
}

exports.createNotice = async (req, res) => {
  try {
    const { title } = req.body
    if (!title || !title.trim()) {
      return res.status(400).json({ message: "제목을 입력해 주세요." })
    }

    const files = Array.isArray(req.files)
      ? req.files
      : req.files && Array.isArray(req.files.images)
      ? req.files.images
      : []
    const blocksInput = parseBlocksPayload(req.body.blocks)
    const resolvedBlocks = []
    const textPieces = []

    blocksInput.forEach((block) => {
      if (!block || typeof block !== "object") return
      if (block.type === "text") {
        const text = (block.text || "").trim()
        if (text) {
          resolvedBlocks.push({ type: "text", text })
          textPieces.push(text)
        }
      } else if (block.type === "image") {
        const index = Number(block.imageIndex)
        if (!Number.isInteger(index)) return
        const file = files[index]
        if (file) {
          const imageUrl = buildImageUrl(req, file)
          resolvedBlocks.push({ type: "image", imageUrl })
        }
      }
    })

    if (resolvedBlocks.length === 0) {
      return res.status(400).json({ message: "내용을 추가해 주세요." })
    }

    const coverImage = resolvedBlocks.find((block) => block.type === "image")?.imageUrl || ""

    const notice = await Notice.create({
      title: title.trim(),
      content: textPieces.join("\n\n"),
      imageUrl: coverImage,
      blocks: resolvedBlocks,
    })

    const doc = notice.toObject()
    doc.imageUrl = toAbsoluteUrl(req, doc.imageUrl)
    doc.blocks = Array.isArray(doc.blocks)
      ? doc.blocks.map((block) => ({
          ...block,
          imageUrl: block.type === "image" ? toAbsoluteUrl(req, block.imageUrl) : "",
        }))
      : []
    res.status(201).json(doc)
  } catch (error) {
    res.status(400).json({ message: error.message || "공지사항을 생성하지 못했습니다." })
  }
}

exports.deleteNotice = async (req, res) => {
  try {
    const notice = await Notice.findByIdAndDelete(req.params.id)
    if (!notice) return res.status(404).json({ message: "공지사항을 찾을 수 없습니다." })
    deleteImageIfExists(notice.imageUrl)
    if (Array.isArray(notice.blocks)) {
      notice.blocks.forEach((block) => {
        if (block?.type === "image" && block.imageUrl) {
          deleteImageIfExists(block.imageUrl)
        }
      })
    }
    res.json({ ok: true })
  } catch (error) {
    res.status(500).json({ message: "공지사항을 삭제하지 못했습니다." })
  }
}
