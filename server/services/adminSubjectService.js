const fs = require("fs");
const os = require("os");
const path = require("path");
const { promisify } = require("util");
const mongoose = require("mongoose");
const { formidable } = require("formidable");
const axios = require("axios");
const SubjectUpload = require("../model/SubjectUpload");
const SubjectUnit = require("../model/SubjectUnit");
// const { logApiStep, logError } = require("../utils/logger");
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
const unlinkAsync = promisify(fs.unlink);
const PYTHON_REQUEST_TIMEOUT_MS = Number(
  process.env.PYTHON_REQUEST_TIMEOUT_MS || 15 * 60 * 1000,
);
const BACKGROUND_UPLOAD_PREFIX = "gradeup-subject-upload";
const API_NAME = "UPLOAD_SUBJECT";

let isQueueRunning = false;

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function extractImageUrlsFromString(text) {
  if (typeof text !== "string" || !text.trim()) {
    return [];
  }

  const urls = [
    ...text.matchAll(/!\[.*?\]\((https?:\/\/[^)\s]+)\)/gi),
    ...text.matchAll(/https?:\/\/[^\s)"']+\.(?:png|jpe?g|gif|webp|svg)/gi),
  ].map((match) => match[1] || match[0]);

  return urls.filter(Boolean);
}

function normalizeImageUrlList(value) {
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === "string" && item.trim());
  }

  if (isPlainObject(value)) {
    return Object.values(value).filter(
      (item) => typeof item === "string" && item.trim(),
    );
  }

  if (typeof value === "string" && value.trim()) {
    return [value];
  }

  return [];
}

function collectImageUrls(value, bucket = []) {
  if (typeof value === "string") {
    bucket.push(...extractImageUrlsFromString(value));
    return bucket;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectImageUrls(item, bucket));
    return bucket;
  }

  if (!isPlainObject(value)) {
    return bucket;
  }

  if (typeof value.url === "string") {
    bucket.push(...extractImageUrlsFromString(value.url));
  }

  Object.entries(value).forEach(([key, childValue]) => {
    if (key === "image_urls") {
      return;
    }
    collectImageUrls(childValue, bucket);
  });

  return bucket;
}

function dedupeImageUrls(urls = []) {
  return [
    ...new Set(urls.filter((url) => typeof url === "string" && url.trim())),
  ];
}

function appendImageUrlsLast(value) {
  if (Array.isArray(value)) {
    return value.map((item) => appendImageUrlsLast(item));
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const normalizedObject = {};

  Object.entries(value).forEach(([key, childValue]) => {
    if (key === "image_urls") {
      return;
    }
    normalizedObject[key] = appendImageUrlsLast(childValue);
  });

  const existingImageUrls = normalizeImageUrlList(value.image_urls);
  const discoveredImageUrls = collectImageUrls(normalizedObject, []);
  const mergedImageUrls = dedupeImageUrls([
    ...existingImageUrls,
    ...discoveredImageUrls,
  ]);

  if (mergedImageUrls.length) {
    normalizedObject.image_urls = mergedImageUrls;
  }

  return normalizedObject;
}

function countImageUrlEntries(value) {
  if (Array.isArray(value)) {
    return value.reduce((total, item) => total + countImageUrlEntries(item), 0);
  }

  if (!isPlainObject(value)) {
    return 0;
  }

  const ownCount = Array.isArray(value.image_urls)
    ? value.image_urls.length
    : 0;

  return (
    ownCount +
    Object.entries(value).reduce((total, [key, childValue]) => {
      if (key === "image_urls") {
        return total;
      }
      return total + countImageUrlEntries(childValue);
    }, 0)
  );
}

function parseMultipartForm(req) {
  const form = formidable({
    multiples: false,
    keepExtensions: true,
    uploadDir: os.tmpdir(),
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) {
        reject(err);
        return;
      }
      resolve({ fields, files });
    });
  });
}

function pickField(fields, key, fallback = null) {
  const value = fields[key];
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }
  return value ?? fallback;
}

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  if (typeof value === "boolean") {
    return value;
  }

  return String(value).toLowerCase() === "true";
}

function normalizeProcessingMode(value) {
  return value === "multiple_units" ? "multiple_units" : "single_unit";
}

function parseTerm(termString) {
  if (!termString) return null;
  const normalized = String(termString).trim().toLowerCase();
  if (/^term\s*[1-4]$/i.test(normalized)) {
    return normalized.replace(/\s+/g, " ");
  }
  return normalized.length > 0 ? normalized : null;
}

function parsePart(partString) {
  if (!partString) return null;
  const normalized = String(partString).trim().toUpperCase();
  if (/^part\s*[a-d]$/i.test(normalized)) {
    return normalized.replace(/\s+/g, " ");
  }
  return normalized.length > 0 ? normalized : null;
}

function getPartSequence(part) {
  if (!part) return null;
  const match = part.toUpperCase().match(/PART\s*([A-D])/i);
  if (match) {
    return match[1].charCodeAt(0) - 65;
  }
  return null;
}

function getTermSequence(term) {
  if (!term) return null;
  const match = term.match(/TERM\s*([1-4])/i);
  if (match) {
    return parseInt(match[1], 10) - 1;
  }
  return null;
}

function buildSubjectGroupKeyWithPartTerm(unit) {
  return [
    unit.board,
    unit.standard,
    unit.subject,
    unit.part || "general",
    unit.term || "general",
    unit.uploadId || "standalone",
  ].join("::");
}

function buildUnitLabel(unitNumber, fallbackTitle) {
  if (typeof unitNumber === "number" && !Number.isNaN(unitNumber)) {
    return `Unit ${unitNumber}`;
  }

  return fallbackTitle || "Unit";
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

function buildGroupKeyFromUnit(unit) {
  return [
    unit.board,
    unit.standard,
    unit.subject,
    unit.part || "general",
    unit.term || "general",
    unit.uploadId || "standalone",
  ].join("::");
}

function createSubjectGroupKey() {
  return new mongoose.Types.ObjectId().toString();
}

function createTransactionId() {
  return `txn_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

function buildUploadScopedDocumentId(documentId, uploadId) {
  return `${documentId}::${uploadId}`;
}

async function resolveSubjectUnitDocumentId({
  pythonDocumentId,
  uploadId,
  subjectGroupKey,
  unitNumber,
}) {
  const existingUnit = await SubjectUnit.findOne({
    documentId: pythonDocumentId,
  }).select("_id uploadId subjectGroupKey unitNumber");

  if (!existingUnit) {
    return pythonDocumentId;
  }

  if (String(existingUnit.uploadId) === String(uploadId)) {
    return pythonDocumentId;
  }

  const sameGroup =
    existingUnit.subjectGroupKey &&
    subjectGroupKey &&
    String(existingUnit.subjectGroupKey) === String(subjectGroupKey);
  const sameUnitNumber =
    existingUnit.unitNumber !== null &&
    existingUnit.unitNumber !== undefined &&
    unitNumber !== null &&
    unitNumber !== undefined &&
    Number(existingUnit.unitNumber) === Number(unitNumber);

  if (sameGroup && sameUnitNumber) {
    return pythonDocumentId;
  }

  return buildUploadScopedDocumentId(pythonDocumentId, uploadId);
}

async function updateUploadProgress(uploadId, updates = {}) {
  await SubjectUpload.findByIdAndUpdate(uploadId, {
    $set: updates,
  }).catch(() => null);
}

async function persistTempFile(file) {
  const extension = path.extname(
    file.originalFilename || file.filepath || ".pdf",
  );
  const targetPath = path.join(
    os.tmpdir(),
    `${BACKGROUND_UPLOAD_PREFIX}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}${extension || ".pdf"}`,
  );

  await fs.promises.copyFile(file.filepath, targetPath);
  return targetPath;
}

async function fetchJsonOrNull(url) {
  try {
    const { data } = await axios.get(url);
    return data;
  } catch (error) {
    if (error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

async function sendPdfToPython({ endpoint, filePath, fileName, payload }) {
  const buffer = await fs.promises.readFile(filePath);
  const formData = new FormData();
  const blob = new Blob([buffer], { type: "application/pdf" });

  formData.append("file", blob, fileName);
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      formData.append(key, String(value));
    }
  });

  try {
    const response = await axios.post(endpoint, formData, {
      timeout: 0,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      headers: {
        Accept: "application/json",
      },
    });

    return response.data;
  } catch (error) {
    if (error.code === "ECONNABORTED") {
      const timeoutError = new Error(
        `Python service timed out after ${Math.round(PYTHON_REQUEST_TIMEOUT_MS / 1000)} seconds while processing the PDF`,
      );
      timeoutError.statusCode = 504;
      timeoutError.source = "python";
      timeoutError.details = {
        endpoint,
        code: error.code,
      };
      throw timeoutError;
    }

    if (error.response) {
      const pythonError = new Error(
        error.response.data?.detail || "Python service request failed",
      );
      pythonError.statusCode = error.response.status;
      pythonError.source = "python";
      pythonError.details = error.response.data;
      throw pythonError;
    }

    const networkError = new Error(
      error.message || "Unable to reach Python service",
    );
    networkError.statusCode = 502;
    networkError.source = "python";
    networkError.details = {
      endpoint,
      code: error.code || null,
    };
    throw networkError;
  }
}

async function createOrUpdateSubjectUnit({
  uploadId,
  uploadedBy,
  originalFileName,
  board,
  standard,
  subject,
  subjectGroupKey,
  requestedTitle,
  pythonResponse,
  structuredData,
  enrichedData,
  debateTopicsData,
  requestId,
}) {
  const normalizedStructuredData = appendImageUrlsLast(structuredData);
  const normalizedEnrichedData = appendImageUrlsLast(enrichedData);
  const normalizedDebateTopicsData = isPlainObject(debateTopicsData)
    ? debateTopicsData
    : null;
  const structuredUnit =
    normalizedStructuredData?.units?.[0] || normalizedStructuredData || {};
  const enrichedUnit = normalizedEnrichedData?.units?.[0] || {};
  const resolvedUnitNumber =
    structuredUnit?.unit_number ?? enrichedUnit?.unit_number ?? null;
  const resolvedUnitTitle =
    structuredUnit?.title || enrichedUnit?.title || requestedTitle;
  const resolvedPart = structuredUnit?.part || pythonResponse?.part || null;
  const pythonDocumentId = pythonResponse.document_id;
  const documentId = await resolveSubjectUnitDocumentId({
    pythonDocumentId,
    uploadId,
    subjectGroupKey,
    unitNumber: resolvedUnitNumber,
  });

  const update = {
    uploadId,
    documentId,
    sourceDocumentId: pythonDocumentId,
    uploadedBy,
    originalFileName,
    board,
    standard,
    subject,
    subjectGroupKey,
    part: resolvedPart,
    unitNumber: resolvedUnitNumber,
    unitTitle: resolvedUnitTitle,
    unitLabel: buildUnitLabel(resolvedUnitNumber, requestedTitle),
    chapterName: requestedTitle,
    processing: {
      status: "completed",
      message: pythonResponse?.message || "Processed successfully",
      pythonResponse,
      processedAt: new Date(),
    },
    structuredData: normalizedStructuredData,
    enrichedData: normalizedEnrichedData,
    debateTopics: normalizedDebateTopicsData,
    readerIndex: getReaderIndex(normalizedStructuredData),
  };

  logApiStep({
    api: API_NAME,
    status: "STARTED",
    requestId,
    message: "DB Store Process Started",
  });

  logApiStep({
    api: API_NAME,
    status: "STARTED",
    requestId,
    message: `Normalized image_urls before DB store (structured=${countImageUrlEntries(normalizedStructuredData)}, enriched=${countImageUrlEntries(normalizedEnrichedData)})`,
  });

  return SubjectUnit.findOneAndUpdate(
    { documentId },
    { $set: update },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
}

async function processSingleUnitUpload(upload) {
  const requestId = upload._id.toString();

  try {
    // Handle both single and multiple file uploads
    const filePaths = upload.multiFileUpload?.isMultiFile
      ? upload.multiFileUpload.queuedFilePaths
      : [upload.queuedFilePath];

    const fileMetadata = upload.multiFileUpload?.fileMetadata || [];
    const createdUnitIds = [];
    const createdUnits = [];
    const failedFiles = [];

    // Process each file
    for (let fileIndex = 0; fileIndex < filePaths.length; fileIndex++) {
      const filePath = filePaths[fileIndex];
      const metadata = fileMetadata[fileIndex] || {};

      try {
        if (!fs.existsSync(filePath)) {
          throw new Error(`File not found: ${filePath}`);
        }

        // Update progress for this file
        const fileProgress =
          Math.round((fileIndex / filePaths.length) * 80) + 10;
        await updateUploadProgress(upload._id, {
          progressPercent: fileProgress,
          progressMessage: `Processing file ${fileIndex + 1}/${filePaths.length}: ${path.basename(filePath)}`,
          processedFiles: fileIndex,
          lastProcessAttempt: new Date(),
        });

        logApiStep({
          api: API_NAME,
          status: "PROCESSING",
          requestId,
          message: `Processing file ${fileIndex + 1}/${filePaths.length}: ${path.basename(filePath)}`,
        });

        // Call Python API for this file — send as multipart form with actual PDF
        const pythonBaseUrl = process.env.AI_URL;
        const pythonResponse = await sendPdfToPython({
          endpoint: `${pythonBaseUrl}/upload-subject`,
          filePath,
          fileName: path.basename(filePath),
          payload: {
            board: upload.board,
            standard: upload.standard,
            subject: upload.subject,
            processing_mode: "single_unit",
            skip_enrichment: upload.skipEnrichment,
            skip_qdrant: upload.skipQdrant,
            skip_llm_refinement: upload.skipLlmRefinement,
            unit_title: metadata.unitTitle || upload.unitOrChapterName,
            unit_number: metadata.unitNumber || null,
            part: metadata.part || upload.part || null,
            term: metadata.term || upload.term || null,
          },
        });

        if (!pythonResponse.success) {
          throw new Error(pythonResponse.message || "Python processing failed");
        }

        console.log(
          `[DEBUG] Full pythonResponse:`,
          JSON.stringify(pythonResponse, null, 2),
        );

        // document_id is at top level of pythonResponse
        const pythonDocId = pythonResponse.document_id;
        if (!pythonDocId) {
          throw new Error(
            "Python processing succeeded but returned no document_id",
          );
        }

        // const pythonBaseUrl = process.env.AI_URL;

        // Fetch structured, enriched, debate topics via GET endpoints
        const structuredData = pythonResponse.has_structured
          ? await fetchJsonOrNull(`${pythonBaseUrl}/structured/${pythonDocId}`)
          : null;

        const enrichedData = pythonResponse.has_enriched
          ? await fetchJsonOrNull(`${pythonBaseUrl}/enrich/${pythonDocId}`)
          : null;

        const debateTopicsData = pythonResponse.debate_topics_success
          ? await fetchJsonOrNull(
              `${pythonBaseUrl}/debate-topics/${pythonDocId}`,
            )
          : null;

        const documentId = await resolveSubjectUnitDocumentId({
          pythonDocumentId: pythonDocId,
          uploadId: upload._id,
          subjectGroupKey: upload.subjectGroupKey,
          unitNumber: null,
        });

        const parsedPart =
          metadata.part || upload.part
            ? parsePart(metadata.part || upload.part)
            : null;
        const parsedTerm =
          metadata.term || upload.term
            ? parseTerm(metadata.term || upload.term)
            : null;

        const normalizedStructured = appendImageUrlsLast(structuredData);

        const subjectUnit = new SubjectUnit({
          uploadId: upload._id,
          documentId,
          sourceDocumentId: pythonDocId,
          board: upload.board,
          standard: upload.standard,
          subject: upload.subject,
          subjectGroupKey: upload.subjectGroupKey,
          part: parsedPart,
          term: parsedTerm,
          partSequence: getPartSequence(parsedPart),
          termSequence: getTermSequence(parsedTerm),
          unitNumber: null,
          unitTitle: metadata.unitTitle || upload.unitOrChapterName || "Unit",
          unitLabel: buildUnitLabel(
            null,
            metadata.unitTitle || upload.unitOrChapterName,
          ),
          chapterName: metadata.unitTitle || upload.unitOrChapterName || null,
          originalFileName: path.basename(filePath),
          uploadedBy: upload.uploadedBy,
          processing: {
            status: "completed",
            message: pythonResponse.message || null,
            pythonResponse: pythonResponse,
            processedAt: new Date(),
          },
          structuredData: normalizedStructured,
          enrichedData: appendImageUrlsLast(enrichedData),
          debateTopics: debateTopicsData || null,
          readerIndex: getReaderIndex(normalizedStructured),
        });

        await subjectUnit.save();
        createdUnitIds.push(subjectUnit._id);
        createdUnits.push(subjectUnit);

        logApiStep({
          api: API_NAME,
          status: "SUCCESS",
          requestId,
          message: `File ${fileIndex + 1} processed successfully`,
        });
      } catch (fileError) {
        logError({
          api: API_NAME,
          requestId,
          message: `Error processing file ${fileIndex + 1}: ${path.basename(filePath)}`,
          error: fileError,
        });

        failedFiles.push({
          filename: path.basename(filePath),
          error: fileError.message,
        });
      }
    }

    // If multi-file upload and any files failed, rollback all units from this upload
    if (upload.multiFileUpload?.isMultiFile && failedFiles.length > 0) {
      logApiStep({
        api: API_NAME,
        status: "WARNING",
        requestId,
        message: `Multi-file upload has failures. Rolling back ${createdUnits.length} created units.`,
      });

      // Rollback: Delete all created units for this transaction
      await SubjectUnit.deleteMany({ _id: { $in: createdUnitIds } });

      throw new Error(
        `Multi-file upload failed. ${failedFiles.length} file(s) could not be processed: ${failedFiles
          .map((f) => f.filename)
          .join(", ")}`,
      );
    }

    // Partial success handling for single file uploads
    if (failedFiles.length > 0 && createdUnitIds.length === 0) {
      throw new Error(
        `All files failed to process: ${failedFiles.map((f) => f.filename).join(", ")}`,
      );
    }

    return {
      units: createdUnits,
      unitsCreated: createdUnits.length,
      failedFiles,
    };
  } catch (error) {
    logError({
      api: API_NAME,
      requestId,
      message: "Error in single unit upload processing",
      error,
    });
    throw error;
  }
}

async function processWholeSubjectUpload(upload) {
  const pythonBaseUrl = process.env.AI_URL;
  const requestId = upload._id.toString();

  logApiStep({
    api: API_NAME,
    status: "STARTED",
    requestId,
    message: "File Processing Started",
  });

  await updateUploadProgress(upload._id, {
    status: "processing",
    queuePosition: null,
    progressPercent: 10,
    progressStage: "uploading_to_python",
    progressMessage: "Uploading full subject PDF to Python service",
  });

  logApiStep({
    api: API_NAME,
    status: "STARTED",
    requestId,
    message: "Sending request to Python service",
  });

  const pythonResponse = await sendPdfToPython({
    endpoint: `${pythonBaseUrl}/upload-subject`,
    filePath: upload.queuedFilePath,
    fileName: upload.originalFileName,
    payload: {
      board: upload.board,
      subject: upload.subject,
      part: upload.part,
      class_name: upload.standard,
      auto_upload: true,
      skip_enrichment: upload.skipEnrichment,
      skip_qdrant: upload.skipQdrant,
      skip_llm_refinement: upload.skipLlmRefinement,
    },
  });

  logApiStep({
    api: API_NAME,
    status: "SUCCESS",
    requestId,
    message: "Received response from Python service",
  });

  const successfulUnits = (pythonResponse.processing_results || []).filter(
    (item) => item?.success && item?.document_id,
  );

  await updateUploadProgress(upload._id, {
    status: "processing",
    progressPercent: successfulUnits.length ? 55 : 75,
    progressStage: "processing_units",
    progressMessage: `Processing ${successfulUnits.length} detected unit${successfulUnits.length === 1 ? "" : "s"}`,
    totalUnits: successfulUnits.length,
    processedUnits: 0,
  });

  const units = [];
  for (let index = 0; index < successfulUnits.length; index += 1) {
    const item = successfulUnits[index];
    const structuredData = await fetchJsonOrNull(
      `${pythonBaseUrl}/structured/${item.document_id}`,
    );
    const enrichedData = item.has_enriched
      ? await fetchJsonOrNull(`${pythonBaseUrl}/enrich/${item.document_id}`)
      : null;
    const debateTopicsData = await fetchJsonOrNull(
      `${pythonBaseUrl}/debate-topics/${item.document_id}`,
    );

    const unit = await createOrUpdateSubjectUnit({
      uploadId: upload._id,
      uploadedBy: upload.uploadedBy,
      originalFileName: upload.originalFileName,
      board: upload.board,
      standard: upload.standard,
      subject: upload.subject,
      subjectGroupKey: upload.subjectGroupKey,
      requestedTitle: upload.unitOrChapterName,
      pythonResponse: item,
      structuredData,
      enrichedData,
      debateTopicsData,
      requestId,
    });

    units.push(unit);
    logApiStep({
      api: API_NAME,
      status: "SUCCESS",
      requestId,
      message: "DB Store Completed",
    });

    const processedUnits = index + 1;
    const progressPercent = successfulUnits.length
      ? Math.min(
          92,
          55 + Math.round((processedUnits / successfulUnits.length) * 35),
        )
      : 92;

    await updateUploadProgress(upload._id, {
      status: "processing",
      progressPercent,
      progressStage: "processing_units",
      progressMessage: `Processed unit ${processedUnits} of ${successfulUnits.length}`,
      totalUnits: successfulUnits.length,
      processedUnits,
    });
  }

  return { pythonResponse, units };
}

async function finalizeUploadSuccess(upload, result) {
  upload.status = "completed";
  upload.queuePosition = null;
  upload.progressPercent = 100;
  upload.progressStage = "completed";
  upload.progressMessage = `Upload completed: ${result.unitsCreated} unit(s) created`;
  upload.processedUnits = result.units.length;
  upload.totalUnits = result.units.length;
  upload.pythonResponse = result.pythonResponse;
  upload.multiFileUpload.processedFiles =
    upload.multiFileUpload?.totalFiles || 1;
  upload.processedAt = new Date();
  upload.queuedFilePath = null;
  await upload.save();
}

async function finalizeUploadFailure(upload, error) {
  upload.status = "failed";
  upload.queuePosition = null;
  upload.progressStage = "failed";
  upload.progressMessage = error.message;
  upload.error = {
    message: error.message,
    source: error.source || "node",
    details: error.details || null,
  };
  upload.queuedFilePath = null;
  await upload.save();
}

async function refreshQueuedPositions() {
  const queuedItems = await SubjectUpload.find({ status: "queued" })
    .sort({ createdAt: 1, _id: 1 })
    .lean();

  return Promise.all(
    queuedItems.map((item, index) =>
      SubjectUpload.findByIdAndUpdate(item._id, {
        $set: {
          queuePosition: index,
          progressMessage:
            index === 0 ? "Processing now" : `Queued at position ${index + 1}`,
          lastProcessAttempt:
            index === 0 ? new Date() : item.lastProcessAttempt,
        },
      }),
    ),
  );
}

async function processUploadRecord(upload) {
  const requestId = upload._id.toString();
  const queuedFilePath = upload.queuedFilePath;
  const multiFilePaths = upload.multiFileUpload?.queuedFilePaths || [];

  try {
    // Validate files exist
    if (upload.multiFileUpload?.isMultiFile) {
      const missingFiles = multiFilePaths.filter((fp) => !fs.existsSync(fp));
      if (missingFiles.length > 0) {
        const missingFileError = new Error(
          `${missingFiles.length} queued upload file(s) no longer available`,
        );
        missingFileError.statusCode = 410;
        throw missingFileError;
      }
    } else {
      if (!queuedFilePath || !fs.existsSync(queuedFilePath)) {
        const missingFileError = new Error(
          "Queued upload file is no longer available",
        );
        missingFileError.statusCode = 410;
        throw missingFileError;
      }
    }

    upload.status = "processing";
    upload.queuePosition = null;
    upload.progressStage = "processing";
    upload.progressMessage = "Processing started";
    upload.progressPercent = Math.max(upload.progressPercent || 0, 10);
    upload.lastProcessAttempt = new Date();
    await upload.save();

    const result = await processSingleUnitUpload(upload);

    await finalizeUploadSuccess(upload, result);

    logApiStep({
      api: API_NAME,
      status: "SUCCESS",
      requestId,
      message: "Completed Successfully",
    });
  } catch (error) {
    await finalizeUploadFailure(upload, error);
    logError({
      api: API_NAME,
      requestId,
      message: "Error",
      error,
    });
  } finally {
    // Cleanup single file
    if (queuedFilePath && fs.existsSync(queuedFilePath)) {
      await unlinkAsync(queuedFilePath).catch(() => null);
    }

    // Cleanup multi-files
    if (upload.multiFileUpload?.isMultiFile) {
      await Promise.all(
        multiFilePaths.map((fp) => unlinkAsync(fp).catch(() => null)),
      );
    }

    await refreshQueuedPositions();
  }
}

async function runSubjectUploadQueue() {
  if (isQueueRunning) {
    return;
  }

  isQueueRunning = true;
  try {
    while (true) {
      const nextUpload = await SubjectUpload.findOne({ status: "queued" }).sort(
        {
          createdAt: 1,
          _id: 1,
        },
      );

      if (!nextUpload) {
        break;
      }

      await processUploadRecord(nextUpload);
    }
  } finally {
    isQueueRunning = false;
  }
}

function ensureSubjectUploadQueueRunning() {
  setTimeout(() => {
    runSubjectUploadQueue().catch((error) => {
      logError({
        api: API_NAME,
        requestId: "queue-runner",
        message: "Queue runner failed",
        error,
      });
    });
  }, 0);
}

async function findSubjectGroupSnapshot(subjectGroupKey) {
  let units = await SubjectUnit.find({ subjectGroupKey }).sort({
    unitNumber: 1,
    createdAt: 1,
  });

  if (!units.length && String(subjectGroupKey).includes("::")) {
    const [board, standard, subject, rawPart, uploadId] =
      String(subjectGroupKey).split("::");
    const fallbackFilter = {
      board,
      standard,
      subject,
      part: rawPart === "general" ? null : rawPart,
    };

    if (uploadId && uploadId !== "standalone") {
      fallbackFilter.uploadId = uploadId;
    }

    units = await SubjectUnit.find(fallbackFilter).sort({
      unitNumber: 1,
      createdAt: 1,
    });
  }

  if (units.length) {
    const firstUnit = units[0];
    return {
      subjectGroupKey: firstUnit.subjectGroupKey || subjectGroupKey,
      board: firstUnit.board,
      standard: firstUnit.standard,
      subject: firstUnit.subject,
      part: firstUnit.part || null,
      unitCount: units.length,
      units,
    };
  }

  const upload = await SubjectUpload.findOne({ subjectGroupKey }).sort({
    createdAt: -1,
  });

  if (!upload) {
    return null;
  }

  return {
    subjectGroupKey,
    board: upload.board,
    standard: upload.standard,
    subject: upload.subject,
    part: upload.part || null,
    unitCount: 0,
    units: [],
  };
}

async function handleAdminSubjectUpload(req) {
  const { fields, files } = await parseMultipartForm(req);
  const assignmentMode =
    pickField(fields, "subjectAssignmentMode", "new_subject") ===
    "existing_subject"
      ? "existing_subject"
      : "new_subject";
  const existingSubjectKey = pickField(fields, "existingSubjectKey");
  let board = pickField(fields, "board");
  let standard = pickField(fields, "standard");
  let subject = pickField(fields, "subject");
  let part = pickField(fields, "part");
  let term = pickField(fields, "term");
  const unitOrChapterName = pickField(fields, "unitOrChapterName");
  const processingMode = normalizeProcessingMode(
    pickField(fields, "processingMode"),
  );
  const skipEnrichment = parseBoolean(
    pickField(fields, "skip_enrichment"),
    false,
  );
  const skipQdrant = parseBoolean(pickField(fields, "skip_qdrant"), false);
  const skipLlmRefinement = parseBoolean(
    pickField(fields, "skip_llm_refinement"),
    false,
  );
  const fileArray = files.file;
  const isMultiFile = Array.isArray(fileArray) && fileArray.length > 1;
  const requiresUnitTitle = processingMode === "single_unit" && !isMultiFile;
  let subjectGroupKey = null;
  const transactionId = createTransactionId();

  if (assignmentMode === "existing_subject") {
    if (!existingSubjectKey) {
      const error = new Error(
        "existingSubjectKey is required when adding to an existing subject",
      );
      error.statusCode = 400;
      throw error;
    }

    const existingGroup = await findSubjectGroupSnapshot(existingSubjectKey);
    if (!existingGroup) {
      const error = new Error("Selected subject was not found");
      error.statusCode = 404;
      throw error;
    }

    subjectGroupKey = existingGroup.subjectGroupKey;
    board = existingGroup.board;
    standard = existingGroup.standard;
    subject = existingGroup.subject;
    part = existingGroup.part;
    term = existingGroup.term || term;
  } else {
    subjectGroupKey = createSubjectGroupKey();
  }

  if (!board || !standard || !subject) {
    const error = new Error("board, standard, and subject are required");
    error.statusCode = 400;
    throw error;
  }

  if (requiresUnitTitle && !unitOrChapterName) {
    const error = new Error(
      "unitOrChapterName is required for single unit processing",
    );
    error.statusCode = 400;
    throw error;
  }

  if (!fileArray) {
    const error = new Error("file is required");
    error.statusCode = 400;
    throw error;
  }

  // Validate files
  const filesToProcess = Array.isArray(fileArray) ? fileArray : [fileArray];
  for (const file of filesToProcess) {
    const fileName = file.originalFilename || path.basename(file.filepath);
    if (!fileName.toLowerCase().endsWith(".pdf")) {
      const error = new Error(
        "Only PDF uploads are supported. All files must be PDFs.",
      );
      error.statusCode = 400;
      throw error;
    }
  }

  // Persist files and collect metadata
  const queuedFilePaths = [];
  const fileMetadata = [];

  for (let i = 0; i < filesToProcess.length; i++) {
    const file = filesToProcess[i];
    const persistedPath = await persistTempFile(file);
    queuedFilePaths.push(persistedPath);

    // Extract metadata from field if provided
    const fileMetadataField = pickField(fields, `fileMetadata[${i}]`);
    const metadata = fileMetadataField
      ? JSON.parse(fileMetadataField)
      : {
          unitTitle: isMultiFile ? `Unit ${i + 1}` : unitOrChapterName,
          unitNumber: isMultiFile ? i + 1 : null,
          part: part || null,
          term: term || null,
        };

    fileMetadata.push(metadata);
  }

  // Cleanup original file paths
  for (const file of filesToProcess) {
    if (file?.filepath && fs.existsSync(file.filepath)) {
      await unlinkAsync(file.filepath).catch(() => null);
    }
  }

  const parsedPart = part ? parsePart(part) : null;
  const parsedTerm = term ? parseTerm(term) : null;

  const upload = await SubjectUpload.create({
    board,
    standard,
    subject,
    subjectGroupKey,
    uploadTitle: unitOrChapterName || subject,
    unitOrChapterName: unitOrChapterName || null,
    part: parsedPart,
    term: parsedTerm,
    originalFileName: filesToProcess
      .map((f) => f.originalFilename || path.basename(f.filepath))
      .join(", "),
    uploadType: "pdf",
    processingMode,
    multiFileUpload: {
      isMultiFile,
      totalFiles: filesToProcess.length,
      queuedFilePaths,
      fileMetadata,
      processedFiles: 0,
      failedFiles: [],
    },
    uploadedBy: req.admin._id,
    status: "queued",
    queuePosition: 0,
    queuedFilePath: isMultiFile ? null : queuedFilePaths[0],
    skipEnrichment,
    skipQdrant,
    skipLlmRefinement,
    progressPercent: 5,
    progressStage: "queued",
    progressMessage: isMultiFile
      ? `Queued: ${filesToProcess.length} files for processing`
      : "Queued for processing",
    totalUnits: filesToProcess.length,
    transactionId,
  });

  await refreshQueuedPositions();
  ensureSubjectUploadQueueRunning();

  const refreshedUpload = await SubjectUpload.findById(upload._id);

  logApiStep({
    api: API_NAME,
    status: "STARTED",
    requestId: req.requestId,
    message: `Queued for FIFO processing: ${isMultiFile ? `${filesToProcess.length} files` : "1 file"}`,
  });

  return {
    upload: refreshedUpload || upload,
    units: [],
    queued: true,
    isMultiFile,
    totalFiles: filesToProcess.length,
    transactionId,
  };
}

function initializeSubjectUploadQueue() {
  SubjectUpload.updateMany(
    { status: "processing" },
    {
      $set: {
        status: "queued",
        progressStage: "queued",
        progressMessage: "Server restarted. Job re-queued.",
      },
    },
  )
    .then(() => refreshQueuedPositions())
    .then(() => ensureSubjectUploadQueueRunning())
    .catch((error) => {
      logError({
        api: API_NAME,
        requestId: "queue-init",
        message: "Queue initialization failed",
        error,
      });
    });
}

module.exports = {
  appendImageUrlsLast,
  handleAdminSubjectUpload,
  initializeSubjectUploadQueue,
};
