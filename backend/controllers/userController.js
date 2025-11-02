const User = require("../models/User")

exports.getMe = async (req, res) => {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ message: "인증이 필요합니다." })

    const user = await User.findById(userId)
      .select("-password")
      .populate({
        path: "savedAreas",
        select: "title stadiumName createdAt polygon upvoteCount congestionScoreSum congestionScoreCount",
      })

    if (!user) return res.status(404).json({ message: "User not found" })

    res.json({
      id: user._id,
      email: user.email,
      name: user.name || "",
      avatar: user.avatar || "",
      savedAreas: user.savedAreas || [],
    })
  } catch (error) {
    console.error("getMe error", error)
    res.status(500).json({ message: "Server Error" })
  }
}
