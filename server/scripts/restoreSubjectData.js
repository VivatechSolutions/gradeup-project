require("dotenv").config();

const axios = require("axios");
const mongoose = require("mongoose");
const readline = require("readline/promises");
const { stdin: input, stdout: output } = require("process");

const AdminUser = require("../model/AdminUser");
const SubjectUpload = require("../model/SubjectUpload");
const SubjectUnit = require("../model/SubjectUnit");
const { appendImageUrlsLast } = require("../services/adminSubjectService");
const {
  cleanText,
  normalizePart,
  normalizeTerm,
  subjectIdentityKey,
} = require("../utils/subjectIdentity");
const { normalizeUnitMetadata } = require("../utils/unitMetadata");

function getArg(name) {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length).trim() : null;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function normalizeBaseUrl(url) {
  return String(url || "").replace(/\/+$/, "");
}

function parseYes(value) {
  return /^y(es)?$/i.test(String(value || "").trim());
}

function normalizeMode(value) {
  const mode = String(value || "").trim().toLowerCase();
  if (["create", "create-new", "new"].includes(mode)) return "create";
  if (["update", "update-existing", "existing"].includes(mode)) return "update";
  return null;
}

async function askMissing(value, question, rl) {
  if (value) return value;
  return (await rl.question(question)).trim();
}

function getPartSequence(part) {
  if (!part) return null;
  const match = String(part).toUpperCase().match(/PART\s*([A-D])/i);
  return match ? match[1].charCodeAt(0) - 65 : null;
}

function getTermSequence(term) {
  if (!term) return null;
  const match = String(term).match(/TERM\s*([1-4])/i);
  return match ? Number(match[1]) - 1 : null;
}

function createTransactionId() {
  return `restore_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

async function fetchJsonOrNull(url) {
  try {
    const response = await axios.get(url, {
      timeout: Number(process.env.PYTHON_REQUEST_TIMEOUT_MS || 300000),
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      headers: { Accept: "application/json" },
    });
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

async function fetchPythonPayload(aiUrl, pythonDocumentId) {
  console.log("\nFetching data from Python service...");
  const [structuredRaw, enrichedRaw, debateTopicsRaw] = await Promise.all([
    fetchJsonOrNull(`${aiUrl}/structured/${encodeURIComponent(pythonDocumentId)}`),
    fetchJsonOrNull(`${aiUrl}/enrich/${encodeURIComponent(pythonDocumentId)}`),
    fetchJsonOrNull(`${aiUrl}/debate-topics/${encodeURIComponent(pythonDocumentId)}`),
  ]);

  if (!structuredRaw) {
    throw new Error(`No structured data found for ${pythonDocumentId}`);
  }

  return {
    structuredData: appendImageUrlsLast(structuredRaw),
    enrichedData: appendImageUrlsLast(enrichedRaw),
    debateTopics:
      debateTopicsRaw && typeof debateTopicsRaw === "object"
        ? debateTopicsRaw
        : null,
  };
}

function getReaderIndex(structuredData) {
  const unit = structuredData?.units?.[0] || structuredData || {};
  const sections = Array.isArray(unit.sections)
    ? unit.sections
        .map((section) => section?.title || section?.section_title)
        .filter(Boolean)
    : [];

  return {
    sections,
    hasGlossary: Boolean(unit?.glossary?.sub_items?.length),
    hasSummary: Boolean(unit?.summary?.content?.length),
  };
}

function countSections(structuredData) {
  const unit = structuredData?.units?.[0] || structuredData || {};
  return Array.isArray(unit.sections) ? unit.sections.length : 0;
}

function buildProcessing(pythonDocumentId) {
  return {
    status: "completed",
    message: `Restored from Python document_id ${pythonDocumentId}`,
    pythonResponse: {
      document_id: pythonDocumentId,
      restoredByScript: "restoreSubjectData",
      restoredAt: new Date().toISOString(),
      endpoints: {
        structured: `/structured/${pythonDocumentId}`,
        enriched: `/enrich/${pythonDocumentId}`,
        debateTopics: `/debate-topics/${pythonDocumentId}`,
      },
    },
    processedAt: new Date(),
  };
}

function buildDataUpdate({
  unit,
  pythonDocumentId,
  structuredData,
  enrichedData,
  debateTopics,
}) {
  const structuredUnit = structuredData?.units?.[0] || structuredData || {};
  const enrichedUnit = enrichedData?.units?.[0] || {};
  const metadata = normalizeUnitMetadata({
    unitNumber: unit.unitNumber,
    unitTitle: unit.unitTitle,
    unitLabel: unit.unitLabel,
    chapterName: unit.chapterName,
    fallbackTitle: unit.unitTitle || unit.chapterName,
    structuredUnit,
    enrichedUnit,
    debateTopicsData: debateTopics,
  });

  return {
    sourceDocumentId: pythonDocumentId,
    structuredData,
    enrichedData,
    debateTopics,
    readerIndex: getReaderIndex(structuredData),
    unitNumber: metadata.unitNumber,
    unitTitle: metadata.unitTitle,
    unitLabel: metadata.unitLabel,
    chapterName: metadata.chapterName,
    processing: buildProcessing(pythonDocumentId),
  };
}

async function resolveAdminUser({ adminId, adminEmail, rl }) {
  let resolvedEmail = adminEmail;
  if (!adminId && !resolvedEmail) {
    resolvedEmail = (
      await rl.question("Admin email for uploadedBy (blank = first active admin): ")
    ).trim();
  }

  let admin = null;
  if (adminId) {
    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      throw new Error(`Invalid AdminUser ObjectId: ${adminId}`);
    }
    admin = await AdminUser.findById(adminId).select("_id name email");
  } else if (resolvedEmail) {
    admin = await AdminUser.findOne({ email: resolvedEmail.toLowerCase() })
      .select("_id name email");
  } else {
    admin = await AdminUser.findOne({ isActive: true })
      .sort({ createdAt: 1, _id: 1 })
      .select("_id name email");
  }

  if (!admin) {
    throw new Error("Admin user not found. Pass --admin-id or --admin-email.");
  }

  console.log(`Using uploadedBy admin: ${admin.email} (${admin._id})`);
  return admin;
}

function printSummary(title, summary) {
  console.log(`\n${title}:`);
  console.log(JSON.stringify(summary, null, 2));
}

async function runUpdateMode({ rl, apply, pythonDocumentId, payload }) {
  const unitId = await askMissing(
    getArg("unit-id") || getArg("mongo-id"),
    "MongoDB SubjectUnit ObjectId: ",
    rl,
  );
  const syncDocumentId =
    hasFlag("sync-document-id") ||
    parseYes(
      hasFlag("no-sync-document-id")
        ? "no"
        : await rl.question(
            "Also set SubjectUnit.documentId to this Python document_id? (y/N): ",
          ),
    );

  if (!mongoose.Types.ObjectId.isValid(unitId)) {
    throw new Error(`Invalid MongoDB ObjectId: ${unitId}`);
  }

  const unit = await SubjectUnit.findById(unitId);
  if (!unit) {
    throw new Error(`SubjectUnit not found: ${unitId}`);
  }

  if (syncDocumentId) {
    const duplicate = await SubjectUnit.findOne({
      _id: { $ne: unit._id },
      documentId: pythonDocumentId,
    }).select("_id documentId subject unitTitle");

    if (duplicate) {
      throw new Error(
        `Cannot sync documentId. Another SubjectUnit already uses ${pythonDocumentId}: ${duplicate._id}`,
      );
    }
  }

  const update = buildDataUpdate({
    unit,
    pythonDocumentId,
    ...payload,
  });

  if (syncDocumentId) {
    update.documentId = pythonDocumentId;
  }

  printSummary("SubjectUnit update preview", {
    id: unit._id,
    currentDocumentId: unit.documentId,
    nextDocumentId: update.documentId || unit.documentId,
    sourceDocumentId: pythonDocumentId,
    board: unit.board,
    standard: unit.standard,
    subject: unit.subject,
    term: unit.term,
    part: unit.part,
    unitNumber: update.unitNumber,
    unitTitle: update.unitTitle,
    chapterName: update.chapterName,
    structuredSections: countSections(payload.structuredData),
    hasEnrichedData: Boolean(payload.enrichedData),
    hasDebateTopics: Boolean(payload.debateTopics),
  });

  if (!apply) {
    console.log("\nDry run only. Re-run with --apply to update MongoDB.");
    return;
  }

  const updated = await SubjectUnit.findByIdAndUpdate(
    unit._id,
    { $set: update },
    { new: true },
  ).select("_id documentId sourceDocumentId unitTitle processing.status updatedAt");

  console.log("\nMongoDB updated successfully:");
  console.log(JSON.stringify(updated, null, 2));
}

async function runCreateMode({ rl, apply, pythonDocumentId, payload }) {
  const board = cleanText(await askMissing(getArg("board"), "Board: ", rl));
  const standard = cleanText(
    await askMissing(getArg("standard") || getArg("class"), "Class/standard: ", rl),
  );
  const subject = cleanText(await askMissing(getArg("subject"), "Subject: ", rl));
  const chapterName = cleanText(
    await askMissing(
      getArg("chapter-name") || getArg("chapter") || getArg("unit-title"),
      "Chapter name: ",
      rl,
    ),
  );
  const unitNumber = await askMissing(getArg("unit-number"), "Unit number: ", rl);
  const part = normalizePart(getArg("part") || await rl.question("Part (blank if none): "));
  const term = normalizeTerm(getArg("term") || await rl.question("Term (blank if none): "));
  const originalFileName =
    getArg("original-file-name") ||
    getArg("file-name") ||
    `${subject || "subject"}-${unitNumber || "unit"}.pdf`;

  if (!board || !standard || !subject || !chapterName) {
    throw new Error("board, standard, subject, and chapterName are required");
  }

  const duplicate = await SubjectUnit.findOne({ documentId: pythonDocumentId })
    .select("_id documentId subject unitTitle");
  if (duplicate) {
    throw new Error(
      `Cannot create new unit. documentId already exists on SubjectUnit ${duplicate._id}`,
    );
  }

  const admin = await resolveAdminUser({
    adminId: getArg("admin-id"),
    adminEmail: getArg("admin-email"),
    rl,
  });

  const subjectGroupKey = subjectIdentityKey({ board, standard, subject, part, term });
  const metadata = normalizeUnitMetadata({
    unitNumber,
    chapterName,
    unitTitle: chapterName,
    fallbackTitle: chapterName,
    structuredUnit: payload.structuredData?.units?.[0] || payload.structuredData || {},
    enrichedUnit: payload.enrichedData?.units?.[0] || {},
    debateTopicsData: payload.debateTopics,
  });
  const transactionId = createTransactionId();

  const uploadPayload = {
    board,
    standard,
    subject,
    subjectGroupKey,
    uploadTitle: chapterName,
    unitOrChapterName: chapterName,
    part,
    term,
    originalFileName,
    uploadType: "pdf",
    processingMode: "single_unit",
    multiFileUpload: {
      isMultiFile: false,
      totalFiles: 1,
      queuedFilePaths: [],
      fileMetadata: [{
        chapterName,
        unitTitle: metadata.unitTitle,
        unitNumber: metadata.unitNumber,
        part,
        term,
      }],
      processedFiles: 1,
      failedFiles: [],
    },
    uploadedBy: admin._id,
    status: "completed",
    queuePosition: null,
    queuedFilePath: null,
    skipEnrichment: false,
    skipQdrant: false,
    skipLlmRefinement: false,
    progressPercent: 100,
    progressStage: "completed",
    progressMessage: "Upload completed: 1 unit(s) created",
    processedUnits: 1,
    totalUnits: 1,
    pythonResponse: {
      document_id: pythonDocumentId,
      restoredByScript: "restoreSubjectData",
    },
    transactionId,
    lastProcessAttempt: new Date(),
    processedAt: new Date(),
  };

  const unitPayload = {
    uploadId: null,
    documentId: pythonDocumentId,
    sourceDocumentId: pythonDocumentId,
    board,
    standard,
    subject,
    subjectGroupKey,
    part,
    term,
    partSequence: getPartSequence(part),
    termSequence: getTermSequence(term),
    unitNumber: metadata.unitNumber,
    unitTitle: metadata.unitTitle,
    unitLabel: metadata.unitLabel,
    chapterName: metadata.chapterName,
    originalFileName,
    uploadedBy: admin._id,
    processing: buildProcessing(pythonDocumentId),
    structuredData: payload.structuredData,
    enrichedData: payload.enrichedData,
    debateTopics: payload.debateTopics,
    readerIndex: getReaderIndex(payload.structuredData),
  };

  printSummary("New SubjectUnit create preview", {
    documentId: unitPayload.documentId,
    sourceDocumentId: unitPayload.sourceDocumentId,
    board,
    standard,
    subject,
    subjectGroupKey,
    term,
    part,
    unitNumber: unitPayload.unitNumber,
    unitTitle: unitPayload.unitTitle,
    chapterName: unitPayload.chapterName,
    originalFileName,
    uploadedBy: admin.email,
    structuredSections: countSections(payload.structuredData),
    hasEnrichedData: Boolean(payload.enrichedData),
    hasDebateTopics: Boolean(payload.debateTopics),
  });

  if (!apply) {
    console.log("\nDry run only. Re-run with --apply to create MongoDB records.");
    return;
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const [upload] = await SubjectUpload.create([uploadPayload], { session });
      unitPayload.uploadId = upload._id;
      const [createdUnit] = await SubjectUnit.create([unitPayload], { session });

      printSummary("MongoDB records created successfully", {
        uploadId: upload._id,
        unitId: createdUnit._id,
        documentId: createdUnit.documentId,
        subjectGroupKey: createdUnit.subjectGroupKey,
        unitTitle: createdUnit.unitTitle,
        processingStatus: createdUnit.processing?.status,
      });
    });
  } finally {
    await session.endSession();
  }
}

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  const aiUrl = normalizeBaseUrl(process.env.AI_URL);

  if (!mongoUri) {
    throw new Error("MONGODB_URI is required in .env");
  }
  if (!aiUrl) {
    throw new Error("AI_URL is required in .env");
  }

  const rl = readline.createInterface({ input, output });
  try {
    const promptedMode = getArg("mode") ||
      await rl.question("Mode - update existing or create new? (update/create): ");
    const mode = normalizeMode(promptedMode);
    const pythonDocumentId = await askMissing(
      getArg("document-id") || getArg("python-document-id"),
      "Python document_id: ",
      rl,
    );
    const apply =
      hasFlag("apply") ||
      parseYes(await rl.question("Apply changes to MongoDB? (y/N): "));

    if (!mode) {
      throw new Error("Mode must be update or create");
    }
    if (!pythonDocumentId) {
      throw new Error("Python document_id is required");
    }

    await mongoose.connect(mongoUri);

    const payload = await fetchPythonPayload(aiUrl, pythonDocumentId);

    if (mode === "update") {
      await runUpdateMode({ rl, apply, pythonDocumentId, payload });
      return;
    }

    await runCreateMode({ rl, apply, pythonDocumentId, payload });
  } finally {
    rl.close();
    await mongoose.disconnect().catch(() => null);
  }
}

main().catch((error) => {
  const detail = error.response?.data || error.message;
  console.error("\nrestoreSubjectData failed:");
  console.error(detail);
  process.exit(1);
});
