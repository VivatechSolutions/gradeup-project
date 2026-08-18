const CommunityPost = require("../model/CommunityPost");
const CommunityPoll = require("../model/CommunityPoll");
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
    metadata: post.metadata || null,
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

function serializePoll(poll, userId) {
  const options = poll.options || [];
  return {
    id: poll._id.toString(),
    question: poll.question,
    visibility: poll.visibility,
    createdAt: poll.createdAt,
    schoolName: poll.schoolName,
    classNumber: poll.classNumber,
    userVoted: (poll.votedBy || []).some((id) => id.toString() === userId),
    totalVotes: options.reduce((sum, option) => sum + Number(option.votes || 0), 0),
    options: options.map((option) => ({
      id: option._id.toString(),
      text: option.text,
      votes: option.votes || 0,
    })),
    author: {
      id: poll.authorId.toString(),
      firstName: poll.authorName || "Student",
      lastName: "",
    },
  };
}

function communityVisibilityQuery(profile, userId) {
  const school = schoolName(profile);
  return {
    deletedAt: null,
    $or: [
      { visibility: "all" },
      ...(school ? [{ visibility: "school", schoolName: school }] : []),
      { authorId: userId },
    ],
  };
}

function extractTrendingTerms(post) {
  const card = post.metadata?.sessionCard;
  const content = [card?.topic, card?.title, post.content].filter(Boolean).join(" ");
  const words = String(content)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !["with", "this", "that", "from", "join", "session", "created", "community"].includes(word));
  return Array.from(new Set(words)).slice(0, 4);
}

const controller = {
  async listPosts(req, res) {
    try {
      const profile = await getProfile(req.authUser.id);
      const posts = await CommunityPost.find(communityVisibilityQuery(profile, req.authUser.id)).sort({ createdAt: -1 }).limit(100);
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
        metadata: req.body?.metadata || null,
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

  async listPolls(req, res) {
    try {
      const profile = await getProfile(req.authUser.id);
      const polls = await CommunityPoll.find(communityVisibilityQuery(profile, req.authUser.id)).sort({ createdAt: -1 }).limit(50);
      return res.status(200).json(polls.map((poll) => serializePoll(poll, req.authUser.id)));
    } catch (error) {
      return res.status(500).json({ status: false, message: error.message || "Internal Server Error" });
    }
  },

  async createPoll(req, res) {
    try {
      const question = String(req.body?.question || "").trim();
      const options = Array.isArray(req.body?.options)
        ? req.body.options.map((option) => String(option || "").trim()).filter(Boolean)
        : [];
      if (!question) return res.status(400).json({ status: false, message: "Poll question is required" });
      if (options.length < 2) return res.status(400).json({ status: false, message: "At least two poll options are required" });
      const profile = await getProfile(req.authUser.id);
      const poll = await CommunityPoll.create({
        authorId: req.authUser.id,
        authorName: displayName(req.authUser.user),
        question,
        visibility: req.body?.visibility === "school" ? "school" : "all",
        schoolName: schoolName(profile),
        classNumber: classNumber(profile),
        options: options.slice(0, 8).map((text) => ({ text, votes: 0 })),
      });
      return res.status(201).json(serializePoll(poll, req.authUser.id));
    } catch (error) {
      return res.status(500).json({ status: false, message: error.message || "Internal Server Error" });
    }
  },

  async votePoll(req, res) {
    try {
      const poll = await CommunityPoll.findOne({ _id: req.params.pollId, deletedAt: null });
      if (!poll) return res.status(404).json({ status: false, message: "Poll not found" });
      const userId = req.authUser.id;
      if (poll.votedBy.some((id) => id.toString() === userId)) {
        return res.status(409).json({ status: false, message: "You have already voted in this poll" });
      }
      const option = poll.options.id(req.params.optionId);
      if (!option) return res.status(404).json({ status: false, message: "Poll option not found" });
      option.votes = Number(option.votes || 0) + 1;
      poll.votedBy.push(userId);
      await poll.save();
      return res.status(200).json(serializePoll(poll, userId));
    } catch (error) {
      return res.status(500).json({ status: false, message: error.message || "Internal Server Error" });
    }
  },

  async getTrendingTopics(req, res) {
    try {
      const profile = await getProfile(req.authUser.id);
      const posts = await CommunityPost.find(communityVisibilityQuery(profile, req.authUser.id))
        .sort({ createdAt: -1 })
        .limit(200)
        .lean();
      const counts = new Map();
      posts.forEach((post) => {
        extractTrendingTerms(post).forEach((term) => {
          counts.set(term, (counts.get(term) || 0) + 1);
        });
      });
      const topics = Array.from(counts.entries())
        .sort((left, right) => right[1] - left[1])
        .slice(0, 8)
        .map(([term, postsCount], index) => ({
          id: term,
          title: term.replace(/\b\w/g, (char) => char.toUpperCase()),
          posts: postsCount,
          icon: index % 2 === 0 ? "Zap" : "BookOpen",
        }));
      return res.status(200).json(topics);
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
