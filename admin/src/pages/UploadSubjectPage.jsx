import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchSubjects, uploadSubject } from "../api/client";

const BOARDS = ["State Board", "CBSE"];
const DEFAULT_TERMS = ["Term 1", "Term 2", "Term 3"];
const ACTIVE_UPLOAD_STORAGE_KEY = "gradeup_admin_active_upload_id";

function buildSubjectOptionLabel(group) {
  const pieces = [group.subject, group.term, group.part].filter(Boolean);
  const unitText = `${group.unitCount} unit${group.unitCount === 1 ? "" : "s"}`;
  return `${pieces.join(" — ")} — ${unitText}${group.isNewTermOption ? " — new term" : ""}`;
}

function uniqueSorted(values) {
  return Array.from(new Set(values.filter(Boolean))).sort((left, right) =>
    String(left).localeCompare(String(right), undefined, {
      numeric: true,
      sensitivity: "base",
    }),
  );
}

function subjectPartKey(option) {
  return [option.subject || "", option.part || ""]
    .map((value) => String(value).trim().toLowerCase())
    .join("::");
}

export default function UploadSubjectPage() {
  const [uploadMode, setUploadMode] = useState("single");
  const [form, setForm] = useState({
    processingMode: "single_unit",
    subjectAssignmentMode: "new_subject",
    existingSubjectKey: "",
    board: "State Board",
    standard: "",
    subject: "",
    unitOrChapterName: "",
    unitNumber: "",
    chapterName: "",
    part: "",
    term: "",
    files: [],
  });
  const [fileMetadata, setFileMetadata] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [successToast, setSuccessToast] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subjectOptions, setSubjectOptions] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);

  useEffect(() => {
    let active = true;

    fetchSubjects()
      .then((response) => {
        if (active) {
          setSubjectOptions(response.data.groupedItems || []);
        }
      })
      .catch(() => {
        if (active) {
          setSubjectOptions([]);
        }
      })
      .finally(() => {
        if (active) {
          setLoadingSubjects(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!successToast) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setSuccessToast("");
    }, 3500);

    return () => window.clearTimeout(timeoutId);
  }, [successToast]);

  const existingBoardOptions = useMemo(
    () => uniqueSorted([...BOARDS, ...subjectOptions.map((option) => option.board)]),
    [subjectOptions],
  );

  const existingClassOptions = useMemo(
    () =>
      uniqueSorted(
        subjectOptions
          .filter((option) => !form.board || option.board === form.board)
          .map((option) => option.standard),
      ),
    [form.board, subjectOptions],
  );

  const existingTermOptions = useMemo(
    () =>
      uniqueSorted(
        [
          ...DEFAULT_TERMS,
          ...subjectOptions
            .filter((option) => !form.board || option.board === form.board)
            .filter((option) => !form.standard || option.standard === form.standard)
            .map((option) => option.term || "No term"),
        ],
      ),
    [form.board, form.standard, subjectOptions],
  );

  const filteredExistingSubjects = useMemo(
    () =>
      subjectOptions
        .filter((option) => option.board === form.board)
        .filter((option) => option.standard === form.standard)
        .filter((option) => (option.term || "No term") === form.term),
    [form.board, form.standard, form.term, subjectOptions],
  );

  const newTermSubjectOptions = useMemo(() => {
    if (!form.board || !form.standard || !form.term) {
      return [];
    }

    const exactSubjectParts = new Set(filteredExistingSubjects.map(subjectPartKey));
    const uniqueBaseSubjects = new Map();

    subjectOptions
      .filter((option) => option.board === form.board)
      .filter((option) => option.standard === form.standard)
      .forEach((option) => {
        const key = subjectPartKey(option);
        if (exactSubjectParts.has(key) || uniqueBaseSubjects.has(key)) {
          return;
        }

        uniqueBaseSubjects.set(key, {
          ...option,
          id: `new-term::${form.board}::${form.standard}::${form.term}::${option.subject}::${option.part || "__none__"}`,
          subjectGroupKey: null,
          term: form.term,
          unitCount: 0,
          isNewTermOption: true,
        });
      });

    return Array.from(uniqueBaseSubjects.values()).sort((left, right) =>
      buildSubjectOptionLabel(left).localeCompare(buildSubjectOptionLabel(right), undefined, {
        numeric: true,
        sensitivity: "base",
      }),
    );
  }, [filteredExistingSubjects, form.board, form.standard, form.term, subjectOptions]);

  const subjectDropdownOptions = useMemo(
    () => [...filteredExistingSubjects, ...newTermSubjectOptions],
    [filteredExistingSubjects, newTermSubjectOptions],
  );

  const selectedExistingSubject = useMemo(
    () =>
      subjectDropdownOptions.find((option) => option.id === form.existingSubjectKey) || null,
    [form.existingSubjectKey, subjectDropdownOptions],
  );

  const isUnitWise = form.processingMode === "single_unit";
  const isExistingSubject = form.subjectAssignmentMode === "existing_subject";

  function updateField(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleExistingBoardChange(nextBoard) {
    setForm((current) => ({
      ...current,
      board: nextBoard,
      standard: "",
      term: "",
      subject: "",
      part: "",
      existingSubjectKey: "",
    }));
  }

  function handleExistingClassChange(nextClass) {
    setForm((current) => ({
      ...current,
      standard: nextClass,
      term: "",
      subject: "",
      part: "",
      existingSubjectKey: "",
    }));
  }

  function handleExistingTermChange(nextTerm) {
    setForm((current) => ({
      ...current,
      term: nextTerm,
      subject: "",
      part: "",
      existingSubjectKey: "",
    }));
  }

  function handleExistingSubjectChange(nextKey) {
    const selectedGroup =
      subjectDropdownOptions.find((option) => option.id === nextKey) || null;

    setForm((current) => ({
      ...current,
      existingSubjectKey: nextKey,
      board: selectedGroup?.board || current.board,
      standard: selectedGroup?.standard || current.standard,
      subject: selectedGroup?.subject || current.subject,
      part: selectedGroup?.part || "",
      term: selectedGroup?.term || "No term",
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setResult(null);
    setIsSubmitting(true);

    try {
      // Validate form
      if (isExistingSubject && !selectedExistingSubject) {
        setError("Select a valid existing subject");
        setIsSubmitting(false);
        return;
      }
      if (!form.board?.trim()) {
        setError("Board is required");
        setIsSubmitting(false);
        return;
      }
      if (!form.standard?.trim()) {
        setError("Standard is required");
        setIsSubmitting(false);
        return;
      }
      if (!form.subject?.trim()) {
        setError("Subject is required");
        setIsSubmitting(false);
        return;
      }

      if (uploadMode === "single") {
        if (!String(form.unitNumber || "").trim()) {
          setError("Unit number is required for single unit upload");
          setIsSubmitting(false);
          return;
        }
        if (!form.chapterName?.trim()) {
          setError("Chapter name is required for single unit upload");
          setIsSubmitting(false);
          return;
        }
        if (!form.files || form.files.length !== 1) {
          setError("Please select exactly one file for single unit upload");
          setIsSubmitting(false);
          return;
        }
      } else {
        if (!form.files || form.files.length < 2) {
          setError("Please select at least 2 files for multiple units upload");
          setIsSubmitting(false);
          return;
        }
        // Validate metadata for each file
        for (let i = 0; i < form.files.length; i++) {
          if (!String(fileMetadata[i]?.unitNumber || "").trim()) {
            setError(`Unit number is required for file ${i + 1}`);
            setIsSubmitting(false);
            return;
          }
          if (!fileMetadata[i]?.chapterName || !fileMetadata[i]?.chapterName.trim()) {
            setError(`Chapter name is required for file ${i + 1}`);
            setIsSubmitting(false);
            return;
          }
        }
      }

      const formData = new FormData();
      
      // Add base form fields
      formData.append("board", form.board);
      formData.append("standard", form.standard);
      formData.append("subject", form.subject);
      formData.append("subjectAssignmentMode", form.subjectAssignmentMode);
      
      if (form.subjectAssignmentMode === "existing_subject") {
        formData.append("existingSubjectKey", form.existingSubjectKey);
      }

      formData.append("processingMode", form.processingMode);
      
      if (form.part) {
        formData.append("part", form.part);
      }
      if (form.term) {
        formData.append("term", form.term);
      }

      if (uploadMode === "single") {
        formData.append("file", form.files[0]);
        formData.append("unitNumber", form.unitNumber);
        formData.append("chapterName", form.chapterName);
        formData.append("unitOrChapterName", form.chapterName);
      } else {
        // Multiple files upload
        form.files.forEach((file) => {
          formData.append("file", file);
        });
        fileMetadata.forEach((metadata, index) => {
          formData.append(`fileMetadata[${index}]`, JSON.stringify(metadata));
        });
      }

      const response = await uploadSubject(formData);
      setResult(response.data);
      
      const successMessage = uploadMode === "single"
        ? "Upload added to the processing queue."
        : `${form.files.length} files added to the processing queue. Units will be created in strict FIFO order.`;
      
      setSuccessToast(successMessage);

      if (response.data?.uploadId || response.data?.upload?._id) {
        const uploadId = response.data?.uploadId || response.data?.upload?._id;
        localStorage.setItem(ACTIVE_UPLOAD_STORAGE_KEY, uploadId);
      }
    } catch (submitError) {
      setError(submitError.message || "Upload failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  const submitLabel = isSubmitting
    ? "Processing"
    : result?.upload?.status === "queued" || result?.uploadStatus === "queued"
      ? "Queued"
      : result?.upload?.status === "processing" || result?.uploadStatus === "processing"
        ? "Processing"
        : "Upload to queue";

  return (
    <section className="page">
      {successToast ? (
        <div className="toast-banner success-banner">{successToast}</div>
      ) : null}

      <div className="hero-card split">
        <div>
          <p className="eyebrow">Upload</p>
          <h2>Queue a new subject processing job</h2>
          <p className="muted">
            Choose the upload mode first (single or multiple units), then decide whether this upload
            belongs to a new subject or should be attached to an existing one.
          </p>
        </div>
        <div className="hero-metrics">
          <div className="metric-card">
            <span>Upload Mode</span>
            <strong>{uploadMode === "single" ? "Single Unit" : "Multiple Units"}</strong>
          </div>
          <div className="metric-card">
            <span>Assignment</span>
            <strong>{isExistingSubject ? "Existing" : "New"}</strong>
          </div>
        </div>
      </div>

      <div className="content-card upload-card">
        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="full-span upload-mode-selector">
            <label style={{ display: "block", marginBottom: "1rem" }}>
              <strong>Upload Mode *</strong>
            </label>
            <div style={{ display: "flex", gap: "2rem", marginBottom: "1.5rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                <input
                  type="radio"
                  name="uploadMode"
                  value="single"
                  checked={uploadMode === "single"}
                  onChange={(e) => {
                    setUploadMode(e.target.value);
                    setForm((current) => ({
                      ...current,
                      files: [],
                      unitOrChapterName: current.unitOrChapterName,
                      unitNumber: current.unitNumber,
                      chapterName: current.chapterName,
                    }));
                    setFileMetadata([]);
                  }}
                  disabled={isSubmitting}
                />
                <span>Single Unit (1 PDF)</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                <input
                  type="radio"
                  name="uploadMode"
                  value="multiple"
                  checked={uploadMode === "multiple"}
                  onChange={(e) => {
                    setUploadMode(e.target.value);
                    setForm((current) => ({
                      ...current,
                      files: [],
                      unitOrChapterName: "",
                      unitNumber: "",
                      chapterName: "",
                    }));
                    setFileMetadata([]);
                  }}
                  disabled={isSubmitting}
                />
                <span>Multiple Units (2+ PDFs)</span>
              </label>
            </div>
          </div>

          <label>
            Subject destination
            <select
              value={form.subjectAssignmentMode}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  subjectAssignmentMode: event.target.value,
                  existingSubjectKey:
                    event.target.value === "existing_subject"
                      ? current.existingSubjectKey
                      : "",
                }))
              }
            >
              <option value="new_subject">Create new subject</option>
              <option value="existing_subject">Add to existing subject</option>
            </select>
          </label>

          {isExistingSubject ? (
            <>
              <label>
                Board
                <select
                  value={form.board}
                  onChange={(event) => handleExistingBoardChange(event.target.value)}
                  required
                >
                  <option value="">
                    {loadingSubjects ? "Loading boards..." : "Select board"}
                  </option>
                  {existingBoardOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Class
                <select
                  value={form.standard}
                  onChange={(event) => handleExistingClassChange(event.target.value)}
                  required
                  disabled={!form.board}
                >
                  <option value="">Select class</option>
                  {existingClassOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Term
                <select
                  value={form.term}
                  onChange={(event) => handleExistingTermChange(event.target.value)}
                  required
                  disabled={!form.standard}
                >
                  <option value="">Select term</option>
                  {existingTermOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Subject
                <select
                  value={form.existingSubjectKey}
                  onChange={(event) => handleExistingSubjectChange(event.target.value)}
                  required
                  disabled={!form.term}
                >
                  <option value="">
                    {loadingSubjects ? "Loading subjects..." : "Select subject"}
                  </option>
                  {subjectDropdownOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {buildSubjectOptionLabel(option)}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Part
                <input
                  value={form.part}
                  onChange={(event) => updateField("part", event.target.value)}
                  placeholder="History, Geography, Civics"
                  disabled={!form.existingSubjectKey}
                />
                <span className="muted small">
                  Keep the selected part or enter a new part for this subject.
                </span>
              </label>
            </>
          ) : null}

          {!isExistingSubject ? (
            <>
              <label>
                Board
                <select
                  value={form.board}
                  onChange={(event) => updateField("board", event.target.value)}
                >
                  {BOARDS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Standard
                <input
                  type="text"
                  value={form.standard}
                  onChange={(event) => updateField("standard", event.target.value)}
                  placeholder="Class 10"
                  required
                />
              </label>

              <label>
                Subject
                <input
                  type="text"
                  value={form.subject}
                  onChange={(event) => updateField("subject", event.target.value)}
                  placeholder="Science"
                  required
                />
              </label>
            </>
          ) : null}

          {isUnitWise ? (
            <>
              {uploadMode === "single" && (
                <>
                  <label>
                    Unit Number
                    <input
                      type="number"
                      min="1"
                      value={form.unitNumber}
                      onChange={(event) => updateField("unitNumber", event.target.value)}
                      placeholder="1"
                      required={uploadMode === "single"}
                    />
                  </label>
                  <label>
                    Chapter Name
                    <input
                      value={form.chapterName}
                      onChange={(event) => {
                        updateField("chapterName", event.target.value);
                        updateField("unitOrChapterName", event.target.value);
                      }}
                      placeholder="Heat And Temperature"
                      required={uploadMode === "single"}
                    />
                  </label>
                </>
              )}

              {!isExistingSubject ? (
                <>
                  <label>
                    Part
                    <input
                      value={form.part}
                      onChange={(event) => updateField("part", event.target.value)}
                      placeholder="Part A, Part B, History, Geography"
                    />
                  </label>

                  <label>
                    Term
                    <input
                      value={form.term}
                      onChange={(event) => updateField("term", event.target.value)}
                      placeholder="Term 1, Term 2"
                    />
                  </label>
                </>
              ) : null}
            </>
          ) : null}

        {selectedExistingSubject ? (
            <div className="full-span inline-summary-card">
              <strong>{buildSubjectOptionLabel(selectedExistingSubject)}</strong>
              <span className="muted small">
                {selectedExistingSubject.board} • Class {selectedExistingSubject.standard}
                {selectedExistingSubject.part && ` • ${selectedExistingSubject.part}`}
                {selectedExistingSubject.term && ` • ${selectedExistingSubject.term}`}
              </span>
            </div>
          ) : null}

          <label className="full-span">
            PDF file{uploadMode === "multiple" ? "s" : ""} *
            <input
              type="file"
              accept="application/pdf"
              onChange={(event) => {
                const selectedFiles = Array.from(event.target.files || []);
                if (uploadMode === "single" && selectedFiles.length > 1) {
                  setError("Only one file can be selected for single unit upload");
                  return;
                }
                if (uploadMode === "multiple" && selectedFiles.length < 2) {
                  setError("At least 2 files required for multiple units upload");
                  return;
                }
                setForm((current) => ({
                  ...current,
                  files: selectedFiles,
                }));
                setError("");

                // Initialize metadata for multiple files
                if (uploadMode === "multiple") {
                  const newMetadata = selectedFiles.map((file, index) => ({
                    unitNumber: index + 1,
                    chapterName: "",
                    unitTitle: `Unit ${index + 1}`,
                    part: form.part || null,
                    term: form.term || null,
                  }));
                  setFileMetadata(newMetadata);
                }
              }}
              multiple={uploadMode === "multiple"}
              required
              disabled={isSubmitting}
            />
          </label>

          {uploadMode === "multiple" && form.files.length > 0 && (
            <div className="full-span file-metadata-section" style={{ marginTop: "1rem", padding: "1rem", backgroundColor: "#f9f9f9", borderRadius: "4px", border: "1px solid #e0e0e0" }}>
              <strong style={{ display: "block", marginBottom: "1rem" }}>
                File Metadata - Enter unit information for each file
              </strong>
              {[...form.files].reverse().map((file, index) => (
                <div key={index} style={{ marginBottom: "1rem", padding: "1rem", backgroundColor: "white", borderRadius: "4px", border: "1px solid #e0e0e0" }}>
                  <p style={{ margin: "0 0 0.75rem", fontSize: "0.875rem", color: "#666", fontWeight: 500 }}>
                    File {index + 1}: {file.name}
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <input
                      type="number"
                      placeholder="Unit Number"
                      value={fileMetadata[index]?.unitNumber || ""}
                      onChange={(e) => {
                        const newMetadata = [...fileMetadata];
                        newMetadata[index] = {
                          ...newMetadata[index],
                          unitNumber: parseInt(e.target.value) || null,
                        };
                        setFileMetadata(newMetadata);
                      }}
                      disabled={isSubmitting}
                      style={{ padding: "0.5rem", border: "1px solid #ccc", borderRadius: "4px", fontSize: "0.875rem" }}
                    />
                    <input
                      type="text"
                      placeholder="Chapter Name"
                      value={fileMetadata[index]?.chapterName || ""}
                      onChange={(e) => {
                        const newMetadata = [...fileMetadata];
                        newMetadata[index] = {
                          ...newMetadata[index],
                          chapterName: e.target.value,
                          unitTitle: e.target.value,
                        };
                        setFileMetadata(newMetadata);
                      }}
                      disabled={isSubmitting}
                      style={{ padding: "0.5rem", border: "1px solid #ccc", borderRadius: "4px", fontSize: "0.875rem" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {error ? <div className="error-banner full-span">{error}</div> : null}

          <div className="full-span form-actions">
            <button
              className="primary-btn"
              type="submit"
              disabled={
                isSubmitting ||
                (isExistingSubject && !selectedExistingSubject) ||
                result?.upload?.status === "queued" ||
                result?.uploadStatus === "queued"
              }
            >
              {submitLabel}
            </button>
            <Link className="ghost-btn" to="/processing-tracker">
              Open tracker
            </Link>
          </div>
        </form>
      </div>

      {result ? (
        <div className="content-card">
          <div className="content-toolbar">
            <div>
              <h3>Job queued</h3>
              <p className="muted small">
                {uploadMode === "multiple"
                  ? `${form.files.length} files queued. Each unit will be processed in strict FIFO order. The tracker page will keep refreshing until all units are completed.`
                  : "The tracker page will keep refreshing until this upload is completed."}
              </p>
            </div>
            <Link className="primary-btn" to="/processing-tracker">
              View processing tracker
            </Link>
          </div>
          <div className="inline-details-grid">
            <div className="metric-card">
              <span>Status</span>
              <strong>{result.upload?.status || result.uploadStatus}</strong>
            </div>
            <div className="metric-card">
              <span>Queue position</span>
              <strong>{result.upload?.queuePosition || result.queuePosition || "-"}</strong>
            </div>
            {uploadMode === "multiple" && (
              <div className="metric-card">
                <span>Total files</span>
                <strong>{result.totalFiles || form.files.length}</strong>
              </div>
            )}
          </div>
          <p className="muted">Upload ID: {result.upload?._id || result.uploadId}</p>
          {result.transactionId && (
            <p className="muted">Transaction ID: {result.transactionId}</p>
          )}
          <p className="muted">
            {result.upload?.progressMessage || result.progressMessage || "Waiting for the processing worker to start."}
          </p>
        </div>
      ) : null}
    </section>
  );
}
