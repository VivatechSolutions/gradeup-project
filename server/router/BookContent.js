const express = require("express");

const router = express.Router();
const {
  importBookContent,
  listBooks,
  getBookContent,
  getBookPage,
} = require("../controller/BookContent");

router.post("/import", importBookContent);
router.get("/", listBooks);
router.get("/:bookId", getBookContent);
router.get("/:bookId/pages/:pageNumber", getBookPage);

module.exports = router;
