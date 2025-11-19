const mongoose = require("mongoose")

const communityReplySchema = new mongoose.Schema(
  {
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    authorName: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
  },
  {
    timestamps: true,
  },
)

const communityCommentSchema = new mongoose.Schema(
  {
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    authorName: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    replies: [communityReplySchema],
  },
  {
    timestamps: true,
  },
)

const communityPostSchema = new mongoose.Schema(
  {
    stadiumId: { type: mongoose.Schema.Types.ObjectId, ref: "Stadium", required: true, index: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    authorName: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    images: [{ type: String }],
    views: { type: Number, default: 0 },
    recommendCount: { type: Number, default: 0 },
    recommendedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    comments: [communityCommentSchema],
  },
  {
    timestamps: true,
  },
)

communityPostSchema.index({ stadiumId: 1, createdAt: -1 })
communityPostSchema.index({ title: 1, message: 1 })

module.exports = mongoose.model("CommunityPost", communityPostSchema)
