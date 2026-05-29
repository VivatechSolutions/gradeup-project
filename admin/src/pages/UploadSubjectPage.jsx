import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchSubjects, uploadSubject } from "../api/client";

const BOARDS = ["State Board", "CBSE"];
const ACTIVE_UPLOAD_STORAGE_KEY = "gradeup_admin_active_upload_id";

function buildSubjectOptionLabel(group) {
  return `${group.subjectTitle} (${group.unitCount} unit${group.unitCount === 1 ? "" : "s"})`;
}

export default function UploadSubjectPage() {
  const [form, setForm] = useState({
    processingMode: "single_unit",
    subjectAssignmentMode: "new_subject",
    existingSubjectKey: "",
    board: "State Board",
    standard: "",
    subject: "",
    unitOrChapterName: "",
    part: "",
    file: null,
  });
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

  const selectedExistingSubject = useMemo(
    () =>
      subjectOptions.find((option) => option.id === form.existingSubjectKey) || null,
    [form.existingSubjectKey, subjectOptions],
  );

  const isUnitWise = form.processingMode === "single_unit";
  const isExistingSubject = form.subjectAssignmentMode === "existing_subject";

  function updateField(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleExistingSubjectChange(nextKey) {
    const selectedGroup =
      subjectOptions.find((option) => option.id === nextKey) || null;

    setForm((current) => ({
      ...current,
      existingSubjectKey: nextKey,
      board: selectedGroup?.board || current.board,
      standard: selectedGroup?.standard || current.standard,
      subject: selectedGroup?.subject || current.subject,
      part: selectedGroup?.part || "",
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setResult(null);
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (value) {
          formData.append(key, value);
        }
      });

      const response = await uploadSubject(formData);
      setResult(response.data);
      setSuccessToast("Upload added to the processing queue.");

      if (response.data?.uploadId) {
        localStorage.setItem(ACTIVE_UPLOAD_STORAGE_KEY, response.data.uploadId);
      }
    } catch (submitError) {
      setError(submitError.message || "Upload failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  const submitLabel = isSubmitting
    ? "Processing"
    : result?.uploadStatus === "queued"
      ? "Queued"
      : result?.uploadStatus === "processing"
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
            Choose the processing mode first, then decide whether this upload
            belongs to a new subject or should be attached to an existing one.
          </p>
        </div>
        <div className="hero-metrics">
          <div className="metric-card">
            <span>Mode</span>
            <strong>{isUnitWise ? "Unit wise" : "Subject wise"}</strong>
          </div>
          <div className="metric-card">
            <span>Assignment</span>
            <strong>{isExistingSubject ? "Existing" : "New"}</strong>
          </div>
        </div>
      </div>

      <div className="content-card upload-card">
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            Processing mode
            <select
              value={form.processingMode}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  processingMode: event.target.value,
                  unitOrChapterName:
                    event.target.value === "single_unit"
                      ? current.unitOrChapterName
                      : "",
                }))
              }
            >
              <option value="single_unit">Unit wise</option>
              <option value="whole_subject">Subject wise</option>
            </select>
          </label>

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
            <label className="full-span">
              Existing subject
              <select
                value={form.existingSubjectKey}
                onChange={(event) => handleExistingSubjectChange(event.target.value)}
                required
              >
                <option value="">
                  {loadingSubjects ? "Loading subjects..." : "Select a subject"}
                </option>
                {subjectOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {buildSubjectOptionLabel(option)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label>
            Board
            <select
              value={form.board}
              onChange={(event) => updateField("board", event.target.value)}
              disabled={isExistingSubject}
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
              disabled={isExistingSubject}
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
              disabled={isExistingSubject}
            />
          </label>

          {isUnitWise ? (
            <>
              <label>
                Unit / Chapter name
                <input
                  value={form.unitOrChapterName}
                  onChange={(event) =>
                    updateField("unitOrChapterName", event.target.value)
                  }
                  placeholder="Unit 7 / Chapter name"
                  required
                />
              </label>

              <label>
                Part
                <input
                  value={form.part}
                  onChange={(event) => updateField("part", event.target.value)}
                  placeholder="History / Geography / Part A"
                  disabled={isExistingSubject && Boolean(selectedExistingSubject?.part)}
                />
              </label>
            </>
          ) : (
            <div className="full-span info-banner">
              Subject-wise processing uses the whole PDF and detects units during
              processing. The job will stay in the queue until earlier uploads finish.
            </div>
          )}

          {selectedExistingSubject ? (
            <div className="full-span inline-summary-card">
              <strong>{selectedExistingSubject.subjectTitle}</strong>
              <span className="muted small">
                {selectedExistingSubject.board} • Class {selectedExistingSubject.standard}
              </span>
            </div>
          ) : null}

          <label className="full-span">
            PDF file
            <input
              type="file"
              accept="application/pdf"
              onChange={(event) =>
                updateField("file", event.target.files?.[0] || null)
              }
              required
            />
          </label>

          {error ? <div className="error-banner full-span">{error}</div> : null}

          <div className="full-span form-actions">
            <button
              className="primary-btn"
              type="submit"
              disabled={isSubmitting || result?.uploadStatus === "queued"}
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
                The tracker page will keep refreshing until this upload is completed.
              </p>
            </div>
            <Link className="primary-btn" to="/processing-tracker">
              View processing tracker
            </Link>
          </div>
          <div className="inline-details-grid">
            <div className="metric-card">
              <span>Status</span>
              <strong>{result.uploadStatus}</strong>
            </div>
            <div className="metric-card">
              <span>Queue position</span>
              <strong>{result.queuePosition || "-"}</strong>
            </div>
          </div>
          <p className="muted">Upload ID: {result.uploadId}</p>
          <p className="muted">
            {result.progressMessage || "Waiting for the processing worker to start."}
          </p>
        </div>
      ) : null}
    </section>
  );
}
