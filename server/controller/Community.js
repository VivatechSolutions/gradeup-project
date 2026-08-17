const CommunityPost = require("../model/CommunityPost");
const StudentProfile = require("../model/StudentProfile");
const RewardAccount = require("../model/RewardAccount");

function displayName(user) {
  return [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "Student";
}

async function getProfile(userId) {
  return StudentProfile.findOne({ userId }).lean();
}

function schoolName(profile) {
  return String(profile?.schoolContext?.name || "").trim() || null;
}

function classNumber(profile) {
  return String(profile?.independentLearningContext?.classNumber || "").trim() || null;
}

function serializeComment(comment) {
  return {
    id: comment._id.toString(),
    content: comment.content,
    createdAt: comment.createdAt,
    author: {
      id: comment.authorId.toString(),
      firstName: comment.authorName || "Student",
      lastName: "",
    },
  };
}

function serializePost(post, userId) {
  const likedBy = post.likedBy || [];
  const comments = (post.comments || []).filter((comment) => !comment.deletedAt);
  return {
    id: post._id.toString(),
    content: post.content,
    type: post.type,
    visibility: post.visibility,
    createdAt: post.createdAt,
    schoolName: post.schoolName,
    classNumber: post.classNumber,
    likesCount: likedBy.length,
    likedByMe: likedBy.some((id) => id.toString() === userId),
    commentsCount: comments.length,
    comments: comments.map(serializeComment),
    author: {
      id: post.authorId.toString(),
      firstName: post.authorName || "Student",
      lastName: "",
    },
  };
}

const controller = {
  async listPosts(req, res) {
    try {
      const profile = await getProfile(req.authUser.id);
      const school = schoolName(profile);
      const posts = await CommunityPost.find({
        deletedAt: null,
        $or: [
          { visibility: "all" },
          ...(school ? [{ visibility: "school", schoolName: school }] : []),
          { authorId: req.authUser.id },
        ],
      }).sort({ createdAt: -1 }).limit(100);
      return res.status(200).json(posts.map((post) => serializePost(post, req.authUser.id)));
    } catch (error) {
      return res.status(500).json({ status: false, message: error.message || "Internal Server Error" });
    }
  },

  async createPost(req, res) {
    try {
      const content = String(req.body?.content || "").trim();
      if (!content) return res.status(400).json({ status: false, message: "Post content is required" });
      const profile = await getProfile(req.authUser.id);
      const post = await CommunityPost.create({
        authorId: req.authUser.id,
        authorName: displayName(req.authUser.user),
        content,
        type: req.body?.type || "discussion",
        visibility: req.body?.visibility === "school" ? "school" : "all",
        schoolName: schoolName(profile),
        classNumber: classNumber(profile),
      });
      return res.status(201).json(serializePost(post, req.authUser.id));
    } catch (error) {
      return res.status(500).json({ status: false, message: error.message || "Internal Server Error" });
    }
  },

  async toggleLike(req, res) {
    try {
      const post = await CommunityPost.findOne({ _id: req.params.postId, deletedAt: null });
      if (!post) return res.status(404).json({ status: false, message: "Post not found" });
      const userId = req.authUser.id;
      const hasLiked = post.likedBy.some((id) => id.toString() === userId);
      if (hasLiked) post.likedBy = post.likedBy.filter((id) => id.toString() !== userId);
      else post.likedBy.push(userId);
      await post.save();
      return res.status(200).json(serializePost(post, userId));
    } catch (error) {
      return res.status(500).json({ status: false, message: error.message || "Internal Server Error" });
    }
  },

  async addComment(req, res) {
    try {
      const content = String(req.body?.content || "").trim();
      if (!content) return res.status(400).json({ status: false, message: "Comment content is required" });
      const post = await CommunityPost.findOne({ _id: req.params.postId, deletedAt: null });
      if (!post) return res.status(404).json({ status: false, message: "Post not found" });
      post.comments.push({
        authorId: req.authUser.id,
        authorName: displayName(req.authUser.user),
        content,
      });
      await post.save();
      return res.status(201).json(serializePost(post, req.authUser.id));
    } catch (error) {
      return res.status(500).json({ status: false, message: error.message || "Internal Server Error" });
    }
  },

  async getPoints(req, res) {
    const rewards = await RewardAccount.findOne({ userId: req.authUser.id }).lean().catch(() => null);
    return res.status(200).json(rewards?.pointsBalance || 0);
  },

  async getBadges(req, res) {
    return res.status(200).json([]);
  },

  async getLeaderboard(req, res) {
    return res.status(200).json([]);
  },

  async getClassmates(req, res) {
    return res.status(200).json([]);
  },

  async listMessages(req, res) {
    return res.status(200).json([]);
  },

  async createMessage(req, res) {
    return res.status(501).json({ status: false, message: "Use group chat for messaging" });
  },
};

module.exports = controller;
