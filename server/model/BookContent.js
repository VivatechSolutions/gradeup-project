const mongoose = require("mongoose");

const schema = mongoose.Schema;

const blockSchema = new schema(
  {
    blockId: String,
    type: String,
    order: Number,
    title: String,
    text: String,
    html: String,
    imageUrl: String,
    audioUrl: String,
    videoUrl: String,
    metadata: schema.Types.Mixed,
  },
  { _id: false },
);

const pageSchema = new schema(
  {
    pageNumber: Number,
    title: String,
    chapterId: String,
    chapterTitle: String,
    imageUrl: String,
    s3Key: String,
    blocks: [blockSchema],
    metadata: schema.Types.Mixed,
    raw: schema.Types.Mixed,
  },
  { _id: false },
);

const chapterSchema = new schema(
  {
    chapterId: String,
    title: String,
    order: Number,
    startPage: Number,
    endPage: Number,
    metadata: schema.Types.Mixed,
  },
  { _id: false },
);

const bookContentSchema = new schema(
  {
    externalBookId: {
      type: String,
      index: true,
    },
    slug: {
      type: String,
      index: true,
    },
    title: String,
    subtitle: String,
    description: String,
    grade: String,
    board: String,
    subject: String,
    language: String,
    coverImageUrl: String,
    sourceType: {
      type: String,
      default: "json",
    },
    storageFormat: {
      type: String,
      default: "hybrid",
    },
    importStatus: {
      type: String,
      default: "active",
    },
    pageCount: Number,
    chapterCount: Number,
    pages: [pageSchema],
    chapters: [chapterSchema],
    rawContent: schema.Types.Mixed,
    metadata: schema.Types.Mixed,
  },
  { timestamps: true },
);

bookContentSchema.index({ grade: 1, board: 1, subject: 1 });
bookContentSchema.index({ title: 1, subject: 1 });

module.exports = mongoose.model("BookContent", bookContentSchema);
