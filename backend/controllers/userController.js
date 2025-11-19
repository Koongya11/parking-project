const User = require("../models/User")
const ParkingArea = require("../models/ParkingArea")
const CommunityPost = require("../models/CommunityPost")

exports.getMe = async (req, res) => {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ message: "인증이 필요합니다." })

    const user = await User.findById(userId)
      .select("-password")
      .populate({
        path: "savedAreas",
        select:
          "title stadiumName createdAt polygon upvoteCount congestionScoreSum congestionScoreCount createdByName createdBy",
        populate: { path: "createdBy", select: "nickname name email" },
      })

    if (!user) return res.status(404).json({ message: "User not found" })

    const [myParkingAreas, rawPosts] = await Promise.all([
      ParkingArea.find({ createdBy: userId })
        .sort({ createdAt: -1 })
        .select("title stadiumName createdAt upvoteCount polygon createdByName")
        .lean(),
      CommunityPost.find({ authorId: userId })
        .sort({ createdAt: -1 })
        .select("title stadiumId createdAt recommendCount views")
        .populate({ path: "stadiumId", select: "stadiumName" })
        .lean(),
    ])

    res.json({
      id: user._id,
      email: user.email,
      name: user.name || "",
      nickname: user.nickname || "",
      avatar: user.avatar || "",
      savedAreas: user.savedAreas || [],
      myParkingAreas,
      myCommunityPosts: rawPosts.map((post) => ({
        _id: post._id,
        title: post.title,
        stadiumId: post.stadiumId?._id?.toString?.() || post.stadiumId?.toString?.() || "",
        stadiumName: post.stadiumId?.stadiumName || "",
        createdAt: post.createdAt,
        recommendCount: post.recommendCount || 0,
        views: post.views || 0,
      })),
    })
  } catch (error) {
    console.error("getMe error", error)
    res.status(500).json({ message: "Server Error" })
  }
}

exports.updateMe = async (req, res) => {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ message: "로그인이 필요합니다." })

    const { nickname, name, avatar } = req.body || {}
    const updates = {}

    if (typeof nickname === "string") {
      const trimmed = nickname.trim()
      if (!trimmed) {
        return res.status(400).json({ message: "닉네임을 입력해 주세요." })
      }
      updates.nickname = trimmed
    }

    if (typeof name === "string") updates.name = name.trim()
    if (typeof avatar === "string") updates.avatar = avatar.trim()

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "변경할 정보를 입력해 주세요." })
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updates, { new: true })
      .select("-password")
      .populate({
        path: "savedAreas",
        select:
          "title stadiumName createdAt polygon upvoteCount congestionScoreSum congestionScoreCount createdByName createdBy",
        populate: { path: "createdBy", select: "nickname name email" },
      })

    if (!updatedUser) return res.status(404).json({ message: "User not found" })

    res.json({
      id: updatedUser._id,
      email: updatedUser.email,
      name: updatedUser.name || "",
      nickname: updatedUser.nickname || "",
      avatar: updatedUser.avatar || "",
      savedAreas: updatedUser.savedAreas || [],
    })
  } catch (error) {
    console.error("updateMe error", error)
    res.status(500).json({ message: "Server Error" })
  }
}
