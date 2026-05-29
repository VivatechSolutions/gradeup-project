const BookContent = require("../model/BookContent");
const mongoose = require("mongoose");

const toSlug = (value = "") =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const getS3KeyFromUrl = (url = "") => {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.pathname.replace(/^\/+/, "");
  } catch (error) {
    return "";
  }
};

const normaliseBlock = (block, index) => {
  if (typeof block === "string") {
    return {
      blockId: `block-${index + 1}`,
      type: "paragraph",
      order: index,
      text: block,
    };
  }

  const metadata = block.metadata || block.meta || null;

  return {
    blockId: block.blockId || block.id || `block-${index + 1}`,
    type: block.type || "paragraph",
    order: block.order ?? index,
    title: block.title || null,
    text: block.text || block.content || block.value || null,
    html: block.html || null,
    imageUrl: block.imageUrl || block.image || block.url || null,
    audioUrl: block.audioUrl || null,
    videoUrl: block.videoUrl || null,
    metadata,
  };
};

const normalisePage = (page, index) => {
  const pageNumber = Number(
    page.pageNumber ?? page.page ?? page.page_no ?? page.page_index ?? index + 1,
  );
  const imageUrl =
    page.imageUrl || page.pageImageUrl || page.image || page.page_image || null;
  const blocks = Array.isArray(page.blocks)
    ? page.blocks
    : Array.isArray(page.content)
      ? page.content
      : Array.isArray(page.elements)
        ? page.elements
        : [];

  return {
    pageNumber,
    title: page.title || page.pageTitle || null,
    chapterId: page.chapterId || page.chapter_id || null,
    chapterTitle: page.chapterTitle || page.chapter_title || null,
    imageUrl,
    s3Key: page.s3Key || getS3KeyFromUrl(imageUrl),
    blocks: blocks.map(normaliseBlock),
    metadata: page.metadata || page.meta || null,
    raw: page,
  };
};

const normaliseChapter = (chapter, index) => ({
  chapterId: chapter.chapterId || chapter.id || `chapter-${index + 1}`,
  title: chapter.title || chapter.name || `Chapter ${index + 1}`,
  order: chapter.order ?? index,
  startPage: chapter.startPage ?? chapter.start_page ?? null,
  endPage: chapter.endPage ?? chapter.end_page ?? null,
  metadata: chapter.metadata || chapter.meta || null,
});

const buildBookDocument = (payload) => {
  const rawPages = Array.isArray(payload.pages)
    ? payload.pages
    : Array.isArray(payload.bookContent)
      ? payload.bookContent
      : Array.isArray(payload.content)
        ? payload.content
        : [];
  const rawChapters = Array.isArray(payload.chapters) ? payload.chapters : [];
  const title = payload.title || payload.bookTitle || payload.name || "Untitled Book";
  const grade = payload.grade || payload.className || null;
  const board = payload.board || null;
  const subject = payload.subject || null;
  const slugSource = payload.slug || payload.externalBookId || title;
  const pages = rawPages.map(normalisePage);
  const chapters = rawChapters.map(normaliseChapter);

  return {
    externalBookId: payload.externalBookId || payload.bookId || payload.id || null,
    slug: toSlug(slugSource),
    title,
    subtitle: payload.subtitle || null,
    description: payload.description || null,
    grade,
    board,
    subject,
    language: payload.language || "en",
    coverImageUrl: payload.coverImageUrl || payload.coverImage || null,
    sourceType: payload.sourceType || "json",
    storageFormat: "hybrid",
    importStatus: payload.importStatus || "active",
    pageCount: payload.pageCount || pages.length,
    chapterCount: payload.chapterCount || chapters.length,
    pages,
    chapters,
    rawContent: payload,
    metadata: payload.metadata || payload.meta || null,
  };
};

const buildLookupFilter = (bookId) => {
  if (!bookId) {
    return null;
  }

  const filters = [{ externalBookId: bookId }, { slug: bookId }];

  if (mongoose.Types.ObjectId.isValid(bookId)) {
    filters.unshift({ _id: bookId });
  }

  return {
    $or: filters,
  };
};

const controller = {
  async importBookContent(req, res) {
    try {
      const payload = req.body;

      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        return res.status(400).json({
          status: false,
          message: "Book payload must be a JSON object",
        });
      }

      const bookDocument = buildBookDocument(payload);
      const lookupFilter =
        buildLookupFilter(bookDocument.externalBookId || bookDocument.slug) || {};
      const book = await BookContent.findOneAndUpdate(
        lookupFilter,
        { $set: bookDocument },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      );

      return res.status(200).json({
        status: true,
        message: "Book content imported successfully",
        data: book,
      });
    } catch (error) {
      console.log("Error importing book content", error);
      return res.status(500).json({
        status: false,
        message: "Internal Server Error",
        error: error.message,
      });
    }
  },

  async listBooks(req, res) {
    try {
      const { grade, board, subject, search } = req.query;
      const filter = {};

      if (grade) {
        filter.grade = grade;
      }
      if (board) {
        filter.board = board;
      }
      if (subject) {
        filter.subject = subject;
      }
      if (search) {
        filter.title = { $regex: search, $options: "i" };
      }

      const books = await BookContent.find(filter)
        .select("-rawContent -pages.raw")
        .sort({ updatedAt: -1 });

      return res.status(200).json({ status: true, data: books });
    } catch (error) {
      console.log("Error listing books", error);
      return res.status(500).json({
        status: false,
        message: "Internal Server Error",
        error: error.message,
      });
    }
  },

  async getBookContent(req, res) {
    try {
      const { bookId } = req.params;
      const filter = buildLookupFilter(bookId);
      const book = await BookContent.findOne(filter).select("-pages.raw");

      if (!book) {
        return res
          .status(404)
          .json({ status: false, message: "Book not found" });
      }

      return res.status(200).json({ status: true, data: book });
    } catch (error) {
      console.log("Error fetching book content", error);
      return res.status(500).json({
        status: false,
        message: "Internal Server Error",
        error: error.message,
      });
    }
  },

  async getBookPage(req, res) {
    try {
      const { bookId, pageNumber } = req.params;
      const filter = buildLookupFilter(bookId);
      const book = await BookContent.findOne(filter).select("title slug pages");

      if (!book) {
        return res
          .status(404)
          .json({ status: false, message: "Book not found" });
      }

      const page = book.pages.find(
        (currentPage) => currentPage.pageNumber === Number(pageNumber),
      );

      if (!page) {
        return res
          .status(404)
          .json({ status: false, message: "Page not found" });
      }

      return res.status(200).json({
        status: true,
        data: {
          bookId: book._id,
          title: book.title,
          slug: book.slug,
          page,
        },
      });
    } catch (error) {
      console.log("Error fetching book page", error);
      return res.status(500).json({
        status: false,
        message: "Internal Server Error",
        error: error.message,
      });
    }
  },
};

module.exports = controller;
