const mongoose = require("mongoose")

const communityPostViewSchema = new mongoose.Schema(
  {
    postId: { type: mongoose.Schema.Types.ObjectId, ref: "CommunityPost", required: true, index: true },
    viewerKey: { type: String, required: true, index: true },
    lastViewedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

communityPostViewSchema.index({ postId: 1, viewerKey: 1 }, { unique: true })

module.exports = mongoose.model("CommunityPostView", communityPostViewSchema)
