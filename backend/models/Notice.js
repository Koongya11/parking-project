const { Schema, model } = require("mongoose")

const noticeBlockSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["text", "image"],
      required: true,
    },
    text: {
      type: String,
      default: "",
      trim: true,
    },
    imageUrl: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: false },
)

const noticeSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      default: "",
      trim: true,
    },
    imageUrl: {
      type: String,
      default: "",
      trim: true,
    },
    blocks: {
      type: [noticeBlockSchema],
      default: [],
    },
  },
  { timestamps: true },
)

module.exports = model("Notice", noticeSchema)
