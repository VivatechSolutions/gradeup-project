const SubjectUnit = require("../model/SubjectUnit");
const SubjectUpload = require("../model/SubjectUpload");
const { handleAdminSubjectUpload } = require("../services/adminSubjectService");
const {
  buildSubjectTitle,
  compareSubjectIdentity,
  getSubjectIdentityKey,
  unitCountLabel,
} = require("../utils/subjectIdentity");
// const { logApiStep, logError } = require("../utils/logger");
const multer = require("multer");
const axios = require("axios");
const QuestionBank = require("../model/QuestionBank");
const SubjectMetadata = require("../model/SubjectMetadata");
const { callPython } = require("../services/pythonGateway");
function formatTimestamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function emit({ api = "APP", status = "INFO", message, requestId = null }) {
  const prefix = `[${formatTimestamp()}] [${api}] [${status}]`;
  const trace = requestId ? ` [${requestId}]` : "";
  console.log(`${prefix}${trace} ${message}`);
}
function logApiStep({ api, status, message, requestId }) {
  emit({ api, status, message, requestId });
}

  function logError({ api, message, error, requestId }) {
  emit({
    api,
    status: "ERROR",
    requestId,
    message: `${message}${error ? `: ${error.message}` : ""}`,
  });
}
const API_NAME = "UPLOAD_SUBJECT";

function escapeRegExp(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildFallbackGroupKey(unit) {
  return getSubjectIdentityKey(unit);
}

function getGroupKeyFromUnit(unit) {
  return unit.subjectGroupKey || buildFallbackGroupKey(unit);
}

function formatUnit(unit) {
  return {
    id: unit._id,
    uploadId: unit.uploadId,
    documentId: unit.documentId,
    board: unit.board,
    standard: unit.standard,
    subject: unit.subject,
    subjectGroupKey: unit.subjectGroupKey || null,
    part: unit.part,
    term: unit.term,
    partSequence: unit.partSequence,
    termSequence: unit.termSequence,
    unitNumber: unit.unitNumber,
    unitLabel: unit.unitLabel,
    unitTitle: unit.unitTitle,
    chapterName: unit.chapterName,
    originalFileName: unit.originalFileName,
    processingStatus: unit.processing?.status,
    debateTopics: unit.debateTopics || null,
    createdAt: unit.createdAt,
    updatedAt: unit.updatedAt,
  };
}

function formatGroupFromUnits(units = []) {
  if (!units.length) {
    return null;
  }

  const firstUnit = units[0];
  const sortedUnits = [...units].sort((left, right) => {
    // Sort by part sequence first, then term sequence, then unit number
    if (left.partSequence !== right.partSequence) {
      return (left.partSequence ?? Number.MAX_SAFE_INTEGER) - (right.partSequence ?? Number.MAX_SAFE_INTEGER);
    }
    if (left.termSequence !== right.termSequence) {
      return (left.termSequence ?? Number.MAX_SAFE_INTEGER) - (right.termSequence ?? Number.MAX_SAFE_INTEGER);
    }
    const leftOrder = left.unitNumber ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = right.unitNumber ?? Number.MAX_SAFE_INTEGER;
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }
    return new Date(left.createdAt) - new Date(right.createdAt);
  });

  const status = sortedUnits.some((unit) => unit.processing?.status === "failed")
    ? "failed"
    : sortedUnits.some((unit) => unit.processing?.status === "processing")
      ? "processing"
      : "completed";

  const subjectTitle = buildSubjectTitle(firstUnit);

  return {
    id: getSubjectIdentityKey(firstUnit),
    subjectGroupKey: firstUnit.subjectGroupKey || null,
    board: firstUnit.board,
    standard: firstUnit.standard,
    class: firstUnit.standard,
    subject: firstUnit.subject,
    part: firstUnit.part || null,
    term: firstUnit.term || null,
    subjectTitle,
    status,
    unitCount: sortedUnits.length,
    unitCountLabel: unitCountLabel(sortedUnits.length),
    displayMode: sortedUnits.length === 1 ? "single_subject" : "subject_with_units",
    createdAt: sortedUnits[0].createdAt,
    updatedAt: sortedUnits[sortedUnits.length - 1].updatedAt,
    units: sortedUnits.map((unit) => formatUnit(unit)),
  };
}

function buildSubjectGroups(items = []) {
  const grouped = new Map();

  items.forEach((unit) => {
    const key = getSubjectIdentityKey(unit);
    const existing = grouped.get(key) || [];
    existing.push(unit);
    grouped.set(key, existing);
  });

  return Array.from(grouped.values())
    .map((units) => formatGroupFromUnits(units))
    .filter(Boolean)
    .sort((left, right) => compareSubjectIdentity(left, right));
}

async function findGroupUnits(groupKey) {
  let units = await SubjectUnit.find({
    $or: [{ subjectGroupKey: groupKey }, { subjectGroupKey: String(groupKey).toLowerCase() }],
  }).sort({
    partSequence: 1,
    termSequence: 1,
    unitNumber: 1,
    createdAt: 1,
  });

  if (units.length) {
    return units;
  }

  const parts = String(groupKey).split("::");
  let fallbackFilter;

  if (parts[0] === "subject" && parts.length >= 6) {
    const [, board, standard, rawTerm, subject, rawPart] = parts;
    fallbackFilter = {
      board: new RegExp(`^${escapeRegExp(board)}$`, "i"),
      standard: new RegExp(`^${escapeRegExp(standard)}$`, "i"),
      subject: new RegExp(`^${escapeRegExp(subject)}$`, "i"),
      term: rawTerm === "__none__" ? null : new RegExp(`^${escapeRegExp(rawTerm)}$`, "i"),
      part: rawPart === "__none__" ? null : new RegExp(`^${escapeRegExp(rawPart)}$`, "i"),
    };
  } else {
    const [board, standard, subject, rawPart, rawTerm, uploadId] = parts.length >= 6 ? parts : [parts[0], parts[1], parts[2], parts[3], null, parts[4]];
  
    if (!board || !standard || !subject) {
      return [];
    }

    fallbackFilter = {
      board,
      standard,
      subject,
      part: rawPart === "general" || !rawPart ? null : rawPart,
      term: rawTerm === "general" || !rawTerm ? null : rawTerm,
    };

    if (uploadId && uploadId !== "standalone") {
      fallbackFilter.uploadId = uploadId;
    }
  }

  units = await SubjectUnit.find(fallbackFilter).sort({
    partSequence: 1,
    termSequence: 1,
    unitNumber: 1,
    createdAt: 1,
  });

  return units;
}

async function getGroupUploads(groupKey, units = []) {
  const subjectGroupKey = units[0]?.subjectGroupKey;

  if (subjectGroupKey) {
    return SubjectUpload.find({ subjectGroupKey }).sort({ createdAt: -1 });
  }

  const uploadIds = [...new Set(units.map((unit) => String(unit.uploadId)).filter(Boolean))];
  if (!uploadIds.length) {
    return [];
  }

  return SubjectUpload.find({ _id: { $in: uploadIds } }).sort({ createdAt: -1 });
}
async function getOrCreateSubjectMetadata(board, classNumber, subject, userId) {
  try {
    // Try to find existing metadata
    let metadata = await SubjectMetadata.findOne({
      board: board.trim(),
      classNumber: String(classNumber).trim(),
      subject: subject.trim(),
    });

    // If not found, create new metadata
    if (!metadata) {
      metadata = new SubjectMetadata({
        board: board.trim(),
        classNumber: String(classNumber).trim(),
        subject: subject.trim(),
        createdBy: "admin",
      });
      await metadata.save();
      
      logApiStep({
        api: "SUBJECT_METADATA",
        status: "CREATED",
        message: `New subject metadata created for ${board} - Class ${classNumber} - ${subject}`,
      });
    }

    return metadata;
  } catch (error) {
    logError({
      api: "SUBJECT_METADATA",
      message: "Error getting/creating subject metadata",
      error,
    });
    throw error;
  }
}


const controller = {
  async uploadSubject(req, res) {
    try {
      logApiStep({
        api: API_NAME,
        status: "STARTED",
        requestId: req.requestId,
        message: "Process Initiated",
      });

      const result = await handleAdminSubjectUpload(req);

      logApiStep({
        api: API_NAME,
        status: "SUCCESS",
        requestId: req.requestId,
        message: "Accepted for FIFO processing",
      });

      return res.status(202).json({
        status: true,
        message: "Subject upload accepted and added to the processing queue.",
        data: {
          uploadId: result.upload._id,
          queued: true,
          uploadStatus: result.upload.status,
          queuePosition: result.upload.queuePosition,
          progressStage: result.upload.progressStage,
          progressMessage: result.upload.progressMessage,
          unitsCreated: 0,
          units: [],
        },
      });
    } catch (error) {
      logError({
        api: API_NAME,
        requestId: req.requestId,
        message: "Error",
        error,
      });

      return res.status(error.statusCode || 500).json({
        status: false,
        message: error.message || "Processing failed",
        error: {
          source: error.source || "node",
          details: error.details || null,
        },
      });
    }
  },

  async listSubjects(req, res) {
    try {
      const filter = {};
      const search = String(req.query.search || "").trim();

      if (req.query.board) {
        filter.board = req.query.board;
      }
      if (req.query.standard) {
        filter.standard = req.query.standard;
      }
      if (req.query.class || req.query.classNumber) {
        filter.standard = String(req.query.class || req.query.classNumber);
      }
      if (req.query.subject) {
        filter.subject = new RegExp(`^${escapeRegExp(req.query.subject)}$`, "i");
      }
      if (Object.prototype.hasOwnProperty.call(req.query, "term")) {
        filter.term = req.query.term ? new RegExp(`^${escapeRegExp(req.query.term)}$`, "i") : null;
      }
      if (Object.prototype.hasOwnProperty.call(req.query, "part")) {
        filter.part = req.query.part ? new RegExp(`^${escapeRegExp(req.query.part)}$`, "i") : null;
      }
      if (search) {
        filter.$or = [
          { unitTitle: { $regex: search, $options: "i" } },
          { chapterName: { $regex: search, $options: "i" } },
          { documentId: { $regex: search, $options: "i" } },
          { subject: { $regex: search, $options: "i" } },
        ];
      }

      const items = await SubjectUnit.find(filter).sort({
        updatedAt: -1,
        createdAt: -1,
        unitNumber: 1,
      });

      const formattedItems = items.map((unit) => formatUnit(unit));
      const groupedItems = buildSubjectGroups(items);

      return res.status(200).json({
        status: true,
        data: {
          items: formattedItems,
          groupedItems,
          pagination: {
            page: 1,
            limit: groupedItems.length || 1,
            totalItems: formattedItems.length,
            totalPages: 1,
          },
        },
      });
    } catch (error) {
      console.log("Error listing admin subjects", error);
      return res.status(500).json({
        status: false,
        message: "Internal Server Error",
        error: error.message,
      });
    }
  },

  async getSubjectGroup(req, res) {
    try {
      const units = await findGroupUnits(req.params.groupKey);

      if (!units.length) {
        return res.status(404).json({
          status: false,
          message: "Subject group not found",
        });
      }

      const uploads = await getGroupUploads(req.params.groupKey, units);
      const group = formatGroupFromUnits(units);

      return res.status(200).json({
        status: true,
        data: {
          ...group,
          uploads: uploads.map((upload) => ({
            id: upload._id,
            status: upload.status,
            progressStage: upload.progressStage,
            progressMessage: upload.progressMessage,
            createdAt: upload.createdAt,
            processedAt: upload.processedAt,
          })),
        },
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: "Internal Server Error",
        error: error.message,
      });
    }
  },

  async updateSubjectGroup(req, res) {
    try {
      const units = await findGroupUnits(req.params.groupKey);

      if (!units.length) {
        return res.status(404).json({
          status: false,
          message: "Subject group not found",
        });
      }

      const updates = {};
      ["board", "standard", "subject", "part"].forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(req.body, field)) {
          updates[field] = req.body[field] || null;
        }
      });

      if (!Object.keys(updates).length) {
        return res.status(400).json({
          status: false,
          message: "No subject fields provided",
        });
      }

      const groupFilter = units[0].subjectGroupKey
        ? { subjectGroupKey: units[0].subjectGroupKey }
        : { _id: { $in: units.map((unit) => unit._id) } };

      await Promise.all([
        SubjectUnit.updateMany(groupFilter, { $set: updates }),
        units[0].subjectGroupKey
          ? SubjectUpload.updateMany(
              { subjectGroupKey: units[0].subjectGroupKey },
              { $set: updates },
            )
          : Promise.resolve(),
      ]);

      const refreshedUnits = await findGroupUnits(req.params.groupKey);
      return res.status(200).json({
        status: true,
        message: "Subject updated successfully",
        data: formatGroupFromUnits(refreshedUnits),
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: "Internal Server Error",
        error: error.message,
      });
    }
  },

  async deleteSubjectGroup(req, res) {
    try {
      const units = await findGroupUnits(req.params.groupKey);

      if (!units.length) {
        return res.status(404).json({
          status: false,
          message: "Subject group not found",
        });
      }

      const uploads = await getGroupUploads(req.params.groupKey, units);

      await Promise.all([
        SubjectUnit.deleteMany({ _id: { $in: units.map((unit) => unit._id) } }),
        uploads.length
          ? SubjectUpload.deleteMany({ _id: { $in: uploads.map((upload) => upload._id) } })
          : Promise.resolve(),
      ]);

      return res.status(200).json({
        status: true,
        message: "Subject deleted successfully",
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: "Internal Server Error",
        error: error.message,
      });
    }
  },

  async deleteSubjectUnit(req, res) {
    try {
      const unit = await SubjectUnit.findById(req.params.unitId);

      if (!unit) {
        return res.status(404).json({
          status: false,
          message: "Subject unit not found",
        });
      }

      await SubjectUnit.findByIdAndDelete(req.params.unitId);

      return res.status(200).json({
        status: true,
        message: "Unit deleted successfully",
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: "Internal Server Error",
        error: error.message,
      });
    }
  },

  async getUploadStatus(req, res) {
    try {
      const upload = await SubjectUpload.findById(req.params.id);

      if (!upload) {
        return res.status(404).json({
          status: false,
          message: "Upload not found",
        });
      }

      const units = await SubjectUnit.find({ uploadId: upload._id })
        .sort({ unitNumber: 1, createdAt: 1 })
        .select(
          "_id documentId board standard subject part term unitNumber unitLabel unitTitle chapterName processing debateTopics createdAt subjectGroupKey",
        );

      return res.status(200).json({
        status: true,
        data: {
          id: upload._id,
          uploadTitle: upload.uploadTitle,
          board: upload.board,
          standard: upload.standard,
          subject: upload.subject,
          subjectGroupKey: upload.subjectGroupKey,
          part: upload.part,
          term: upload.term,
          originalFileName: upload.originalFileName,
          processingMode: upload.processingMode,
          uploadStatus: upload.status,
          queuePosition: upload.queuePosition,
          progressPercent: upload.progressPercent || 0,
          progressStage: upload.progressStage || "queued",
          progressMessage: upload.progressMessage || "",
          totalUnits: upload.totalUnits || 0,
          processedUnits: upload.processedUnits || 0,
          error: upload.error || null,
          processedAt: upload.processedAt,
          units: units.map((unit) => ({
            id: unit._id,
            documentId: unit.documentId,
            board: unit.board,
            standard: unit.standard,
            subject: unit.subject,
            subjectGroupKey: unit.subjectGroupKey || null,
            part: unit.part,
            term: unit.term,
            unitNumber: unit.unitNumber,
            unitLabel: unit.unitLabel,
            unitTitle: unit.unitTitle,
            chapterName: unit.chapterName,
            processingStatus: unit.processing.status,
            debateTopics: unit.debateTopics || null,
            createdAt: unit.createdAt,
          })),
        },
      });
    } catch (error) {
      console.log("Error fetching upload status", error);
      return res.status(500).json({
        status: false,
        message: "Internal Server Error",
        error: error.message,
      });
    }
  },

  async listUploadProcesses(req, res) {
    try {
      const status = String(req.query.status || "all").trim().toLowerCase();
      const filter = {};

      if (status && status !== "all") {
        filter.status = status === "processing" ? { $in: ["processing", "queued"] } : status;
      }

      const items = await SubjectUpload.find(filter)
        .populate("uploadedBy", "name email")
        .sort({ updatedAt: -1, createdAt: -1 });

      return res.status(200).json({
        status: true,
        data: {
          items: items.map((upload) => ({
            id: upload._id,
            name: upload.uploadTitle,
            board: upload.board,
            standard: upload.standard,
            subject: upload.subject,
            subjectGroupKey: upload.subjectGroupKey || null,
            part: upload.part || null,
            term: upload.term || null,
            processingMode: upload.processingMode,
            originalFileName: upload.originalFileName,
            status: upload.status,
            queuePosition: upload.queuePosition,
            latestMessage: upload.progressMessage || "",
            progressPercent: upload.progressPercent || 0,
            progressStage: upload.progressStage || "queued",
            processedUnits: upload.processedUnits || 0,
            totalUnits: upload.totalUnits || 0,
            error: upload.error || null,
            processedAt: upload.processedAt,
            createdAt: upload.createdAt,
            updatedAt: upload.updatedAt,
            uploadedBy: upload.uploadedBy
              ? {
                  id: upload.uploadedBy._id,
                  name: upload.uploadedBy.name,
                  email: upload.uploadedBy.email,
                }
              : null,
          })),
          pagination: {
            page: 1,
            limit: items.length || 1,
            totalItems: items.length,
            totalPages: 1,
          },
        },
      });
    } catch (error) {
      console.log("Error listing upload processes", error);
      return res.status(500).json({
        status: false,
        message: "Internal Server Error",
        error: error.message,
      });
    }
  },

  async getSubject(req, res) {
    try {
      const subjectUnit = await SubjectUnit.findById(req.params.id);

      if (!subjectUnit) {
        return res.status(404).json({
          status: false,
          message: "Subject unit not found",
        });
      }

      const groupUnits = await findGroupUnits(getGroupKeyFromUnit(subjectUnit));
      const sortedGroupUnits = groupUnits.sort((left, right) => {
        if (left.partSequence !== right.partSequence) {
          return (left.partSequence ?? Number.MAX_SAFE_INTEGER) - (right.partSequence ?? Number.MAX_SAFE_INTEGER);
        }
        if (left.termSequence !== right.termSequence) {
          return (left.termSequence ?? Number.MAX_SAFE_INTEGER) - (right.termSequence ?? Number.MAX_SAFE_INTEGER);
        }
        const leftOrder = left.unitNumber ?? Number.MAX_SAFE_INTEGER;
        const rightOrder = right.unitNumber ?? Number.MAX_SAFE_INTEGER;
        if (leftOrder !== rightOrder) {
          return leftOrder - rightOrder;
        }
        return new Date(left.createdAt) - new Date(right.createdAt);
      });

      const subjectTitle = buildSubjectTitle(subjectUnit);

      return res.status(200).json({
        status: true,
        data: {
          id: subjectUnit._id,
          uploadId: subjectUnit.uploadId,
          documentId: subjectUnit.documentId,
          board: subjectUnit.board,
          standard: subjectUnit.standard,
          subject: subjectUnit.subject,
          subjectGroupKey: subjectUnit.subjectGroupKey || null,
          part: subjectUnit.part,
          term: subjectUnit.term,
          partSequence: subjectUnit.partSequence,
          termSequence: subjectUnit.termSequence,
          unitNumber: subjectUnit.unitNumber,
          unitLabel: subjectUnit.unitLabel,
          unitTitle: subjectUnit.unitTitle,
          chapterName: subjectUnit.chapterName,
          structuredData: subjectUnit.structuredData,
          enrichedData: subjectUnit.enrichedData,
          debateTopics: subjectUnit.debateTopics,
          readerIndex: subjectUnit.readerIndex,
          processing: subjectUnit.processing,
          createdAt: subjectUnit.createdAt,
          updatedAt: subjectUnit.updatedAt,
          subjectGroup: {
            id: getGroupKeyFromUnit(subjectUnit),
            subjectTitle,
            unitCount: sortedGroupUnits.length,
            units: sortedGroupUnits.map((unit) => ({
              id: unit._id,
              unitTitle: unit.unitTitle,
              unitLabel: unit.unitLabel,
              chapterName: unit.chapterName,
              unitNumber: unit.unitNumber,
              part: unit.part,
              term: unit.term,
            })),
          },
        },
      });
    } catch (error) {
      console.log("Error fetching admin subject", error);
      return res.status(500).json({
        status: false,
        message: "Internal Server Error",
        error: error.message,
      });
    }
  },
async uploadQuestionBank(req, res) {
  try {
    logApiStep({
      api: "UPLOAD_QUESTION_BANK",
      status: "STARTED",
      requestId: req.requestId,
      message: "Question bank upload initiated",
    });
 
    // Check if file exists
    if (!req.file) {
      return res.status(400).json({
        status: false,
        message: "No file provided",
      });
    }
 
    const { 
      examName, 
      year, 
      classNumber, 
      board, 
      subject, 
      unitName, 
      unitNumber,
      subjectGroupKey  // NEW: Capture the subject group key
    } = req.body;
 
    // Validate required fields
    if (!examName || !year || !classNumber || !board || !subject) {
      return res.status(400).json({
        status: false,
        message: "Missing required fields: examName, year, classNumber, board, subject",
      });
    }
 
    // Validate subjectGroupKey
    if (!subjectGroupKey) {
      return res.status(400).json({
        status: false,
        message: "Subject group key is required",
      });
    }
 
    const filePath = req.file.path;
 
    // Step 1: Get or create subject metadata
    const metadata = await getOrCreateSubjectMetadata(
      board,
      classNumber,
      subject,
    new Date(),
    );
 
    logApiStep({
      api: "UPLOAD_QUESTION_BANK",
      status: "PROCESSING",
      requestId: req.requestId,
      message: "Calling Python API to extract questions",
    });
 
    // Step 2: Call Python API to extract questions
    const FormData = require("form-data");
    const fs = require("fs");
    const form = new FormData();
    
    form.append("file", fs.createReadStream(filePath));
    form.append("exam_name", examName);
    form.append("year", year);
    form.append("class_number", classNumber);
    form.append("board", board);
    form.append("subject", subject);
    
    if (unitName) form.append("unit_name", unitName);
    if (unitNumber) form.append("unit_number", unitNumber);
 
    const pythonResponse = await callPython({
      method: "post",
      path: "/tutor/question-bank/upload-pdf",
      data: form,
      headers: form.getHeaders(),
    });
 
    if (!pythonResponse.success) {
      throw new Error(pythonResponse.message || "Python API processing failed");
    }
 
    // Generate document ID
    const documentId = `qb_${board.toLowerCase()}_${subject.toLowerCase()}_${year}_${Date.now()}`;
 
    // Step 3: Save question bank to database with subjectGroupKey
    const questionBank = new QuestionBank({
      documentId,
      examName,
      year,
      board,
      classNumber,
      subject,
      subjectGroupKey,  // NEW: Store the subject group key
      unitName: unitName || null,
      unitNumber: unitNumber ? Number(unitNumber) : null,
      totalQuestions: pythonResponse.extracted_count || 0,
      difficultyDistribution: pythonResponse.difficulty_distribution || { 
        easy: 0, 
        medium: 0, 
        hard: 0 
      },
      questions: pythonResponse.questions || null,
      originalFileName: req.file.originalname,
      uploadedBy: "AdminUser",
      metadataId: metadata._id,
      processingStatus: "completed",
      processedAt: new Date(),
    });
  
    await questionBank.save();
 
    logApiStep({
      api: "UPLOAD_QUESTION_BANK",
      status: "SUCCESS",
      requestId: req.requestId,
      message: `Question bank saved with ${pythonResponse.extracted_count} questions`,
    });
 
    // Clean up uploaded file
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.log("Warning: Could not delete temp file", err.message);
    }
 
    return res.status(201).json({
      status: true,
      message: "Question bank uploaded successfully",
      data: {
        documentId: questionBank.documentId,
        examName: questionBank.examName,
        year: questionBank.year,
        board: questionBank.board,
        classNumber: questionBank.classNumber,
        subject: questionBank.subject,
        subjectGroupKey: questionBank.subjectGroupKey,  // NEW: Return in response
        totalQuestions: questionBank.totalQuestions,
        difficultyDistribution: questionBank.difficultyDistribution,
        metadataId: questionBank.metadataId,
        processedAt: questionBank.processedAt,
      },
    });
 
  } catch (error) {
    logError({
      api: "UPLOAD_QUESTION_BANK",
      requestId: req.requestId,
      message: "Question bank upload failed",
      error,
    });
 
    // Clean up file on error
    if (req.file && req.file.path) {
      try {
        require("fs").unlinkSync(req.file.path);
      } catch (err) {
        console.log("Could not cleanup file:", err.message);
      }
    }
 
    return res.status(error.statusCode || 500).json({
      status: false,
      message: error.message || "Question bank upload failed",
      error: {
        source: error.source || "node",
        details: error.details || null,
      },
    });
  }
}
};

module.exports = controller;
