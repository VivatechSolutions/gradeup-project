import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  deleteSubjectGroup,
  deleteSubjectUnit,
  fetchSubjectGroup,
  fetchSubjects,
  updateSubjectGroup,
} from "../api/client";
const API_BASE_URL = "http://localhost:8000/api/v1";
// ============================================================================
// INLINE STYLES
// ============================================================================
const styles = {
  // Modal Layer
  modalLayer: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2000,
  },
  modalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    border: "none",
    cursor: "pointer",
  },
  modalCard: {
    position: "relative",
    backgroundColor: "white",
    borderRadius: "8px",
    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
    maxHeight: "90vh",
    overflowY: "auto",
    maxWidth: "600px",
    width: "90%",
  },
  modalHead: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "1.5rem",
    borderBottom: "1px solid #e0e0e0",
  },
  modalHeadDiv: {
    flex: 1,
  },
  modalHeadEyebrow: {
    margin: 0,
    fontSize: "0.75rem",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    color: "#999",
  },
  modalHeadH3: {
    margin: "0.5rem 0 0",
    fontSize: "1.25rem",
    color: "#333",
  },
  modalCloseBtn: {
    padding: "0.5rem 1rem",
    background: "none",
    border: "none",
    color: "#999",
    cursor: "pointer",
    fontSize: "0.875rem",
    transition: "color 0.2s ease",
  },

  // Modal Form
  modalForm: {
    padding: "1.5rem",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "1rem",
    marginBottom: "1.5rem",
  },
  formLabel: {
    display: "flex",
    flexDirection: "column",
    fontWeight: 500,
    color: "#333",
    fontSize: "0.875rem",
  },
  formInput: {
    marginTop: "0.5rem",
    padding: "0.625rem",
    border: "1px solid #e0e0e0",
    borderRadius: "4px",
    fontSize: "0.875rem",
    transition: "border-color 0.2s ease",
  },
  formInputFocus: {
    outline: "none",
    borderColor: "#1976d2",
    boxShadow: "0 0 0 3px #e3f2fd",
  },
  formInputDisabled: {
    backgroundColor: "#f5f5f5",
    color: "#999",
    cursor: "not-allowed",
  },

  // File Upload
  fileUploadLabel: {
    display: "block",
    margin: "1.5rem 0 1rem",
    fontWeight: 500,
    color: "#333",
  },
  fileUploadInput: {
    display: "none",
  },
  filePlaceholder: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem",
    marginTop: "0.5rem",
    border: "2px dashed #e0e0e0",
    borderRadius: "6px",
    backgroundColor: "#f9f9f9",
    cursor: "pointer",
    transition: "all 0.2s ease",
    minHeight: "100px",
    textAlign: "center",
  },
  fileSelected: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem",
    marginTop: "0.5rem",
    border: "2px dashed #4caf50",
    borderRadius: "6px",
    backgroundColor: "#f1f8f4",
    minHeight: "100px",
    textAlign: "center",
  },
  fileSelectedSpan: {
    color: "#4caf50",
    fontWeight: 500,
  },
  filePlaceholderSpan: {
    color: "#999",
    fontSize: "0.875rem",
  },

  // Buttons
  primaryBtn: {
    padding: "0.5rem 1rem",
    borderRadius: "4px",
    fontSize: "0.875rem",
    fontWeight: 500,
    cursor: "pointer",
    border: "none",
    backgroundColor: "#1976d2",
    color: "white",
    transition: "all 0.2s ease",
    whiteSpace: "nowrap",
  },
  primaryBtnDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
  ghostBtn: {
    padding: "0.5rem 1rem",
    borderRadius: "4px",
    fontSize: "0.875rem",
    fontWeight: 500,
    cursor: "pointer",
    backgroundColor: "transparent",
    color: "#333",
    border: "1px solid #e0e0e0",
    transition: "all 0.2s ease",
    whiteSpace: "nowrap",
  },
  ghostBtnDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
  dangerBtn: {
    padding: "0.5rem 1rem",
    borderRadius: "4px",
    fontSize: "0.875rem",
    fontWeight: 500,
    cursor: "pointer",
    backgroundColor: "#f44336",
    color: "white",
    border: "1px solid #f44336",
    transition: "all 0.2s ease",
    whiteSpace: "nowrap",
  },

  // Modal Actions
  modalActions: {
    display: "flex",
    justifyContent: "space-between",
    gap: "1rem",
    padding: "1.5rem",
    borderTop: "1px solid #e0e0e0",
  },
  tableActions: {
    display: "flex",
    gap: "0.5rem",
    flexWrap: "wrap",
    alignItems: "center",
  },

  // Error Banner
  errorBanner: {
    padding: "1rem",
    margin: "0 1.5rem 1rem",
    backgroundColor: "#ffebee",
    border: "1px solid #f44336",
    borderRadius: "4px",
    color: "#f44336",
    fontSize: "0.875rem",
  },

  // Dropdown Styles
  actionDropdownWrapper: {
    position: "relative",
    display: "inline-block",
  },
  dropdownToggle: {
    padding: "0.5rem 0.75rem",
    border: "1px solid #e0e0e0",
    borderRadius: "4px",
    backgroundColor: "#f5f5f5",
    color: "#333",
    fontSize: "0.8rem",
    fontWeight: 500,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    transition: "all 0.2s ease",
    whiteSpace: "nowrap",
  },
  dropdownIcon: {
    display: "inline-block",
    fontSize: "0.6rem",
    transition: "transform 0.2s ease",
  },
  dropdownMenu: {
    position: "absolute",
    top: "100%",
    right: 0,
    backgroundColor: "white",
    border: "1px solid #e0e0e0",
    borderRadius: "4px",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
    minWidth: "200px",
    zIndex: 1000,
    marginTop: "0.25rem",
    overflow: "hidden",
  },
  dropdownItem: {
    display: "block",
    width: "100%",
    padding: "0.75rem 1rem",
    textAlign: "left",
    border: "none",
    backgroundColor: "transparent",
    color: "#333",
    fontSize: "0.875rem",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },

  // Toast Banner
  toastBanner: {
    position: "fixed",
    top: "1rem",
    right: "1rem",
    padding: "1rem 1.5rem",
    borderRadius: "4px",
    fontSize: "0.875rem",
    fontWeight: 500,
    zIndex: 3000,
    maxWidth: "400px",
    backgroundColor: "#f1f8f4",
    border: "1px solid #4caf50",
    color: "#4caf50",
  },

  // Subject Manage Section
  subjectManageSection: {
    marginTop: "2rem",
  },
  contentToolbarCompact: {
    marginBottom: "1rem",
  },
  contentToolbarH4: {
    margin: 0,
    fontSize: "1rem",
    color: "#333",
  },
  contentToolbarMuted: {
    margin: "0.25rem 0 0",
    fontSize: "0.75rem",
    color: "#999",
  },
  manageUnitList: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  manageUnitItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1rem",
    border: "1px solid #e0e0e0",
    borderRadius: "4px",
    backgroundColor: "#f9f9f9",
  },
  manageUnitItemStrong: {
    display: "block",
    fontWeight: 600,
    color: "#333",
  },
  manageUnitItemMuted: {
    margin: "0.25rem 0 0",
    fontSize: "0.75rem",
    color: "#999",
  },

  // Status Pill
  statusPill: {
    display: "inline-block",
    padding: "0.25rem 0.75rem",
    borderRadius: "12px",
    fontSize: "0.75rem",
    fontWeight: 500,
    textTransform: "capitalize",
  },
  statusPillSuccess: {
    backgroundColor: "#e8f5e9",
    color: "#2e7d32",
  },
  statusPillWarning: {
    backgroundColor: "#fff3e0",
    color: "#f57c00",
  },
  statusPillDanger: {
    backgroundColor: "#ffebee",
    color: "#c62828",
  },

  // Muted text
  mutedSmall: {
    fontSize: "0.75rem",
    color: "#999",
    margin: "0.25rem 0 0",
  },

  // Subject Group Cell
  subjectGroupCell: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  },
  subjectGroupCellStrong: {
    fontWeight: 600,
    color: "#333",
  },
  subjectGroupCellSpan: {
    fontSize: "0.75rem",
    color: "#999",
  },
  subjectGroupLinks: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
    marginTop: "0.5rem",
  },
};

function SubjectManageModal({
  groupKey,
  onClose,
  onSaved,
}) {
  const [group, setGroup] = useState(null);
  const [form, setForm] = useState({
    board: "",
    standard: "",
    subject: "",
    part: "",
    term: "",
  });
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [hoveredCloseBtn, setHoveredCloseBtn] = useState(false);

  useEffect(() => {
    let active = true;

    fetchSubjectGroup(groupKey)
      .then((response) => {
        if (!active) {
          return;
        }
        setGroup(response.data);
        setForm({
          board: response.data.board || "",
          standard: response.data.standard || "",
          subject: response.data.subject || "",
          part: response.data.part || "",
          term: response.data.term || "",
        });
      })
      .catch((modalError) => {
        if (active) {
          setError(modalError.message || "Unable to load subject details");
        }
      });

    return () => {
      active = false;
    };
  }, [groupKey]);

  async function handleSave(event) {
    event.preventDefault();
    setError("");
    setIsSaving(true);

    try {
      await updateSubjectGroup(groupKey, form);
      onSaved("Subject details updated.");
      onClose();
    } catch (saveError) {
      setError(saveError.message || "Unable to update subject");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteSubject() {
    const confirmed = window.confirm(
      "Delete this subject and all units under it?",
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteSubjectGroup(groupKey);
      onSaved("Subject deleted.");
      onClose();
    } catch (deleteError) {
      setError(deleteError.message || "Unable to delete subject");
    }
  }

  async function handleDeleteUnit(unitId) {
    const confirmed = window.confirm("Delete this unit?");

    if (!confirmed) {
      return;
    }

    try {
      await deleteSubjectUnit(unitId);
      const response = await fetchSubjectGroup(groupKey).catch(() => null);
      if (response?.data) {
        setGroup(response.data);
      } else {
        onSaved("Unit deleted.");
        onClose();
        return;
      }
      onSaved("Unit deleted.");
    } catch (deleteError) {
      setError(deleteError.message || "Unable to delete unit");
    }
  }

  return (
    <div style={styles.modalLayer} role="dialog" aria-modal="true">
      <button style={styles.modalBackdrop} type="button" onClick={onClose} />
      <div style={styles.modalCard}>
        <div style={styles.modalHead}>
          <div style={styles.modalHeadDiv}>
            <p style={styles.modalHeadEyebrow}>Manage Subject</p>
            <h3 style={styles.modalHeadH3}>{group?.subjectTitle || "Loading subject..."}</h3>
          </div>
          <button
            style={{
              ...styles.modalCloseBtn,
              color: hoveredCloseBtn ? "#333" : "#999",
            }}
            type="button"
            onClick={onClose}
            onMouseEnter={() => setHoveredCloseBtn(true)}
            onMouseLeave={() => setHoveredCloseBtn(false)}
          >
            Close
          </button>
        </div>

        {error ? <div style={styles.errorBanner}>{error}</div> : null}

        {group ? (
          <form style={styles.modalForm} onSubmit={handleSave}>
            <div style={styles.formGrid}>
              <label style={styles.formLabel}>
                Board
                <input
                  style={styles.formInput}
                  value={form.board}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      board: event.target.value,
                    }))
                  }
                />
              </label>

              <label style={styles.formLabel}>
                Standard
                <input
                  style={styles.formInput}
                  value={form.standard}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      standard: event.target.value,
                    }))
                  }
                />
              </label>

              <label style={styles.formLabel}>
                Subject
                <input
                  style={styles.formInput}
                  value={form.subject}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      subject: event.target.value,
                    }))
                  }
                />
              </label>

<label style={styles.formLabel}>
              Part
              <input
                type="text"
                style={styles.formInput}
                placeholder="e.g., Part A, Part B"
                value={form.part}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    part: event.target.value,
                  }))
                }
                disabled={isSaving}
              />
            </label>

            <label style={styles.formLabel}>
              Term
              <input
                type="text"
                style={styles.formInput}
                placeholder="e.g., Term 1, Term 2"
                value={form.term}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    term: event.target.value,
                  }))
                }
                disabled={isSaving}
              />
            </label>
            </div>

            <div style={styles.subjectManageSection}>
              <div style={styles.contentToolbarCompact}>
                <div>
                  <h4 style={styles.contentToolbarH4}>Units</h4>
                  <p style={styles.contentToolbarMuted}>
                    {group.units.length} unit{group.units.length === 1 ? "" : "s"} in
                    this subject
                  </p>
                </div>
              </div>

              <div style={styles.manageUnitList}>
                {group.units.map((unit) => (
                  <div style={styles.manageUnitItem} key={unit.id}>
                    <div>
                      <strong style={styles.manageUnitItemStrong}>{unit.unitTitle}</strong>
                      <p style={styles.manageUnitItemMuted}>{unit.unitLabel}</p>
                    </div>
                    <div style={styles.tableActions}>
                      <Link
                        style={{
                          ...styles.ghostBtn,
                          textDecoration: "none",
                          display: "inline-block",
                        }}
                        to={`/subjects/${unit.id}`}
                      >
                        Open
                      </Link>
                      <button
                        style={styles.dangerBtn}
                        type="button"
                        onClick={() => handleDeleteUnit(unit.id)}
                      >
                        Delete Unit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={styles.modalActions}>
              <button
                style={styles.dangerBtn}
                type="button"
                onClick={handleDeleteSubject}
              >
                Delete Subject
              </button>
              <div style={styles.tableActions}>
                <button style={styles.ghostBtn} type="button" onClick={onClose}>
                  Cancel
                </button>
                <button
                  style={{
                    ...styles.primaryBtn,
                    ...(isSaving ? styles.primaryBtnDisabled : {}),
                  }}
                  type="submit"
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div style={{ padding: "2rem", textAlign: "center", fontSize: "0.875rem" }}>
            Loading subject details...
          </div>
        )}
      </div>
    </div>
  );
}

function UploadQuestionBankModal({
  groupKey,
  groupData,
  onClose,
  onSaved,
}) {

  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [hoveredCloseBtn, setHoveredCloseBtn] = useState(false);

  const [uploadMode, setUploadMode] = useState("single");
  const [form, setForm] = useState({
    board: groupData?.board || "",
    standard: groupData?.standard || "",
    subject: groupData?.subject || "",
    part: groupData?.part || "",
    term: groupData?.term || "",
    unitOrChapterName: "",
    processingMode: "single_unit",
    skipEnrichment: false,
    skipQdrant: false,
    skipLlmRefinement: false,
    examName: "",
    year: "",
    unitName: groupData?.units[0]?.unitTitle || "",
    unitNumber: groupData?.units[0]?.unitNumber || "",
  });
  const [files, setFiles] = useState([]);
  const [fileMetadata, setFileMetadata] = useState([]);
async function handleUpload(event) {
    event.preventDefault();
    setError("");

    // Validate form
    if (!form.board.trim()) {
      setError("Board is required");
      return;
    }
    if (!form.standard.trim()) {
      setError("Standard is required");
      return;
    }
    if (!form.subject.trim()) {
      setError("Subject is required");
      return;
    }

    if (uploadMode === "single") {
      if (!form.unitOrChapterName.trim()) {
        setError("Unit/Chapter name is required for single unit upload");
        return;
      }
      if (files.length !== 1) {
        setError("Please select exactly one file for single unit upload");
        return;
      }
    } else {
      if (files.length < 2) {
        setError("Please select at least 2 files for multiple units upload");
        return;
      }
      // Validate metadata for each file
      for (let i = 0; i < files.length; i++) {
        if (!fileMetadata[i]?.unitTitle || !fileMetadata[i]?.unitTitle.trim()) {
          setError(`Unit title is required for file ${i + 1}`);
          return;
        }
      }
    }

    setIsUploading(true);

    try {
      const formData = new FormData();

      if (uploadMode === "single") {
        formData.append("file", files[0]);
        formData.append("processingMode", "single_unit");
        formData.append("unitOrChapterName", form.unitOrChapterName);
      } else {
        // Multiple files upload
        files.forEach((file, index) => {
          formData.append("file", file);
        });
        formData.append("processingMode", "multiple_units");
        fileMetadata.forEach((metadata, index) => {
          formData.append(`fileMetadata[${index}]`, JSON.stringify(metadata));
        });
      }

      formData.append("board", form.board);
      formData.append("standard", form.standard);
      formData.append("subject", form.subject);
      if (form.part) formData.append("part", form.part);
      if (form.term) formData.append("term", form.term);
      formData.append("subjectAssignmentMode", groupKey ? "existing_subject" : "new_subject");
      if (groupKey) formData.append("existingSubjectKey", groupKey);
      formData.append("skip_enrichment", form.skipEnrichment);
      formData.append("skip_qdrant", form.skipQdrant);
      formData.append("skip_llm_refinement", form.skipLlmRefinement);

      const response = await fetch(`${API_BASE_URL}/admin/subjects/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Upload failed");
      }

      const data = await response.json();

      if (!data.status) {
        throw new Error(data.message || "Upload failed");
      }

      onSaved(
        uploadMode === "single"
          ? "Subject uploaded and queued for processing. Check progress on the dashboard."
          : `${files.length} files uploaded and queued for processing. Units will be created in strict FIFO order. Check progress on the dashboard.`
      );
      onClose();
    } catch (uploadError) {
      setError(uploadError.message || "Unable to upload subject");
    } finally {
      setIsUploading(false);
    }
  }

  function handleFileSelection(event) {
    const selectedFiles = Array.from(event.target.files || []);
    if (uploadMode === "single" && selectedFiles.length > 1) {
      setError("Only one file can be selected for single unit upload");
      return;
    }
    if (uploadMode === "multiple" && selectedFiles.length < 2) {
      setError("At least 2 files required for multiple units upload");
      return;
    }
    setFiles(selectedFiles);
    setError("");

    // Initialize metadata for new files
    if (uploadMode === "multiple") {
      const newMetadata = selectedFiles.map((file, index) => ({
        unitTitle: `Unit ${index + 1}`,
        unitNumber: index + 1,
        part: form.part || null,
        term: form.term || null,
      }));
      setFileMetadata(newMetadata);
    }
  }

  function updateFileMetadata(index, field, value) {
    const newMetadata = [...fileMetadata];
    newMetadata[index] = {
      ...newMetadata[index],
      [field]: value,
    };
    setFileMetadata(newMetadata);
  }

  return (
    <div style={styles.modalLayer} role="dialog" aria-modal="true">
      <button style={styles.modalBackdrop} type="button" onClick={onClose} />
      <div style={styles.modalCard}>
        <div style={styles.modalHead}>
          <div style={styles.modalHeadDiv}>
            <p style={styles.modalHeadEyebrow}>Upload Question Bank</p>
            <h3 style={styles.modalHeadH3}>{groupData?.subjectTitle || "Subject"}</h3>
          </div>
          <button
            style={{
              ...styles.modalCloseBtn,
              color: hoveredCloseBtn ? "#333" : "#999",
            }}
            type="button"
            onClick={onClose}
            onMouseEnter={() => setHoveredCloseBtn(true)}
            onMouseLeave={() => setHoveredCloseBtn(false)}
          >
            Close
          </button>
        </div>

        {error ? <div style={styles.errorBanner}>{error}</div> : null}

        <form style={styles.modalForm} onSubmit={handleUpload}>
          <div style={styles.formGrid}>
            <label style={styles.formLabel}>
              Exam Name *
              <input
                type="text"
                style={styles.formInput}
                placeholder="e.g., NEET, JEE, Board Exam"
                value={form.examName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    examName: event.target.value,
                  }))
                }
                disabled={isUploading}
              />
            </label>

            <label style={styles.formLabel}>
              Year *
              <input
                type="text"
                style={styles.formInput}
                placeholder="e.g., 2024, 2023"
                value={form.year}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    year: event.target.value,
                  }))
                }
                disabled={isUploading}
              />
            </label>

            <label style={styles.formLabel}>
              Unit Name
              <input
                type="text"
                style={styles.formInput}
                placeholder="Optional"
                value={form.unitName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    unitName: event.target.value,
                  }))
                }
                disabled={isUploading}
              />
            </label>

            <label style={styles.formLabel}>
              Unit Number
              <input
                type="text"
                style={styles.formInput}
                placeholder="Optional"
                value={form.unitNumber}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    unitNumber: event.target.value,
                  }))
                }
                disabled={isUploading}
              />
            </label>
          </div>
  <div style={{ marginBottom: "1.5rem", padding: "1rem", backgroundColor: "#f5f5f5", borderRadius: "4px" }}>
            <p style={{ margin: "0 0 0.75rem", fontSize: "0.875rem", fontWeight: 500, color: "#333" }}>
              Upload Mode *
            </p>
            <div style={{ display: "flex", gap: "1rem" }}>
              <label style={{ display: "flex", alignItems: "center", cursor: "pointer", gap: "0.5rem" }}>
                <input
                  type="radio"
                  name="uploadMode"
                  value="single"
                  checked={uploadMode === "single"}
                  onChange={(e) => {
                    setUploadMode(e.target.value);
                    setFiles([]);
                    setFileMetadata([]);
                    setError("");
                  }}
                  disabled={isUploading}
                />
                <span style={{ fontSize: "0.875rem" }}>Single Unit (1 PDF)</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", cursor: "pointer", gap: "0.5rem" }}>
                <input
                  type="radio"
                  name="uploadMode"
                  value="multiple"
                  checked={uploadMode === "multiple"}
                  onChange={(e) => {
                    setUploadMode(e.target.value);
                    setFiles([]);
                    setFileMetadata([]);
                    setError("");
                  }}
                  disabled={isUploading}
                />
                <span style={{ fontSize: "0.875rem" }}>Multiple Units (2+ PDFs)</span>
              </label>
            </div>
          </div>

          {uploadMode === "single" && (
            <label style={styles.formLabel}>
              Unit/Chapter Name *
              <input
                type="text"
                style={styles.formInput}
                placeholder="e.g., Introduction to Biology"
                value={form.unitOrChapterName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    unitOrChapterName: event.target.value,
                  }))
                }
                disabled={isUploading}
              />
            </label>
          )}
          <label style={styles.fileUploadLabel}>
            PDF File{uploadMode === "multiple" ? "s" : ""} *
            <input
              type="file"
              style={styles.fileUploadInput}
              accept=".pdf"
              onChange={handleFileSelection}
              disabled={isUploading}
              multiple={uploadMode === "multiple"}
              required
            />
            {files.length > 0 ? (
              <div style={styles.fileSelected}>
                {files.map((f, idx) => (
                  <div key={idx} style={{ marginBottom: "0.5rem" }}>
                    <span style={styles.fileSelectedSpan}>✓ {f.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={styles.filePlaceholder}>
                <span style={styles.filePlaceholderSpan}>
                  {uploadMode === "single"
                    ? "Choose PDF file or drag and drop"
                    : "Choose 2 or more PDF files or drag and drop"}
                </span>
              </div>
            )}
          </label>

          {uploadMode === "multiple" && files.length > 0 && (
            <div style={{ marginTop: "1.5rem", padding: "1rem", backgroundColor: "#f9f9f9", borderRadius: "4px", border: "1px solid #e0e0e0" }}>
              <p style={{ margin: "0 0 1rem", fontSize: "0.875rem", fontWeight: 500, color: "#333" }}>
                File Metadata - Enter unit information for each file
              </p>
              {files.map((file, index) => (
                <div key={index} style={{ marginBottom: "1rem", padding: "1rem", backgroundColor: "white", borderRadius: "4px", border: "1px solid #e0e0e0" }}>
                  <p style={{ margin: "0 0 0.75rem", fontSize: "0.75rem", color: "#999", fontWeight: 500 }}>
                    File {index + 1}: {file.name}
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <input
                      type="text"
                      style={styles.formInput}
                      placeholder="Unit Title"
                      value={fileMetadata[index]?.unitTitle || ""}
                      onChange={(e) => updateFileMetadata(index, "unitTitle", e.target.value)}
                      disabled={isUploading}
                    />
                    <input
                      type="number"
                      style={styles.formInput}
                      placeholder="Unit Number"
                      value={fileMetadata[index]?.unitNumber || ""}
                      onChange={(e) => updateFileMetadata(index, "unitNumber", e.target.value)}
                      disabled={isUploading}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={styles.modalActions}>
            <button
              style={{
                ...styles.ghostBtn,
                ...(isUploading ? styles.ghostBtnDisabled : {}),
              }}
              type="button"
              onClick={onClose}
              disabled={isUploading}
            >
              Cancel
            </button>
            <button
              style={{
                ...styles.primaryBtn,
                ...(isUploading ? styles.primaryBtnDisabled : {}),
              }}
              type="submit"
              disabled={isUploading}
            >
              {isUploading ? "Uploading..." : "Upload Question Bank"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ActionDropdown({
  groupKey,
  groupData,
  onEdit,
  onUploadQBank,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredToggle, setHoveredToggle] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);

  return (
    <div style={styles.actionDropdownWrapper}>
      <button
        style={{
          ...styles.dropdownToggle,
          backgroundColor: hoveredToggle ? "#efefef" : "#f5f5f5",
          borderColor: hoveredToggle ? "#d0d0d0" : "#e0e0e0",
        }}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        onMouseEnter={() => setHoveredToggle(true)}
        onMouseLeave={() => setHoveredToggle(false)}
      >
        Actions
        <span
          style={{
            ...styles.dropdownIcon,
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          ▼
        </span>
      </button>

      {isOpen && (
        <div style={styles.dropdownMenu}>
          <button
            style={{
              ...styles.dropdownItem,
              backgroundColor: hoveredItem === "edit" ? "#f9f9f9" : "transparent",
              color: hoveredItem === "edit" ? "#1976d2" : "#333",
            }}
            type="button"
            onClick={() => {
              onEdit();
              setIsOpen(false);
            }}
            onMouseEnter={() => setHoveredItem("edit")}
            onMouseLeave={() => setHoveredItem(null)}
          >
            Edit Subject
          </button>
          <button
            style={{
              ...styles.dropdownItem,
              backgroundColor: hoveredItem === "upload" ? "#f9f9f9" : "transparent",
              color: hoveredItem === "upload" ? "#1976d2" : "#333",
            }}
            type="button"
            onClick={() => {
              onUploadQBank();
              setIsOpen(false);
            }}
            onMouseEnter={() => setHoveredItem("upload")}
            onMouseLeave={() => setHoveredItem(null)}
          >
            Upload Question Bank
          </button>
        </div>
      )}
    </div>
  );
}

export default function SubjectsPage() {
  const [groups, setGroups] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedGroupKey, setSelectedGroupKey] = useState("");
  const [uploadGroupKey, setUploadGroupKey] = useState("");
  const [uploadGroupData, setUploadGroupData] = useState(null);
  const [feedback, setFeedback] = useState("");

  function loadSubjects() {
    setLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) {
      params.set("search", search.trim());
    }

    fetchSubjects(params.toString())
      .then((response) => {
        setGroups(response.data.groupedItems || []);
      })
      .catch(() => {
        setGroups([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }

  useEffect(() => {
    loadSubjects();
  }, [search]);

  function handleUploadQBank(group) {
    setUploadGroupData(group);
    setUploadGroupKey(group.id);
  }

  return (
    <section style={{ padding: "2rem" }}>
      {feedback ? (
        <div style={styles.toastBanner}>{feedback}</div>
      ) : null}

      <div style={{ padding: "2rem", marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "#999", margin: 0 }}>
            Library
          </p>
          <h2 style={{ margin: "0.5rem 0" }}>Manage subjects and units</h2>
          <p style={{ color: "#999", margin: "0.5rem 0" }}>
            Review processed subjects, open the reader, or update subject metadata
            and units from one place.
          </p>
        </div>
        <Link
          style={{
            ...styles.primaryBtn,
            textDecoration: "none",
            display: "inline-block",
          }}
          to="/subjects/upload"
        >
          New upload
        </Link>
      </div>

      <div style={{ backgroundColor: "white", borderRadius: "8px", padding: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem", borderBottom: "1px solid #e0e0e0", paddingBottom: "1.5rem" }}>
          <div>
            <h3 style={{ margin: "0 0 0.5rem" }}>Subject records</h3>
            <p style={styles.contentToolbarMuted}>
              Single-unit subjects open directly, while multi-unit subjects show unit
              links under the same parent subject.
            </p>
          </div>
          <input
            style={{
              padding: "0.625rem",
              border: "1px solid #e0e0e0",
              borderRadius: "4px",
              width: "300px",
              fontSize: "0.875rem",
            }}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by subject, unit, or document id"
          />
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e0e0e0" }}>
                <th style={{ padding: "1rem", textAlign: "left", fontWeight: 600, color: "#333" }}>
                  Subject
                </th>
                <th style={{ padding: "1rem", textAlign: "left", fontWeight: 600, color: "#333" }}>
                  Board
                </th>
                <th style={{ padding: "1rem", textAlign: "left", fontWeight: 600, color: "#333" }}>
                  Standard
                </th>
                <th style={{ padding: "1rem", textAlign: "left", fontWeight: 600, color: "#333" }}>
                  Units
                </th>
                <th style={{ padding: "1rem", textAlign: "left", fontWeight: 600, color: "#333" }}>
                  Status
                </th>
                <th style={{ padding: "1rem", textAlign: "left", fontWeight: 600, color: "#333" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <tr key={group.id} style={{ borderBottom: "1px solid #e0e0e0", transition: "background-color 0.2s ease" }}>
                  <td style={{ padding: "1rem" }}>
                    <div style={styles.subjectGroupCell}>
                      <strong style={styles.subjectGroupCellStrong}>
                        {group.subjectTitle}
                      </strong>
                      <span style={styles.subjectGroupCellSpan}>
                        {group.unitCount === 1
                          ? group.units[0]?.unitTitle
                          : `${group.unitCount} units`}
                      </span>
                      {group.unitCount > 1 ? (
                        <div style={styles.subjectGroupLinks}>
                          {group.units.map((unit) => (
                            <Link
                              key={unit.id}
                              to={`/subjects/${unit.id}`}
                              style={{
                                fontSize: "0.8rem",
                                color: "#1976d2",
                                textDecoration: "none",
                              }}
                            >
                              {unit.unitTitle}
                            </Link>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </td>
                  <td style={{ padding: "1rem" }}>{group.board}</td>
                  <td style={{ padding: "1rem" }}>{group.standard}</td>
                  <td style={{ padding: "1rem" }}>{group.unitCount}</td>
                  <td style={{ padding: "1rem" }}>
                    <span
                      style={{
                        ...styles.statusPill,
                        ...(group.status === "failed"
                          ? styles.statusPillDanger
                          : group.status === "processing"
                          ? styles.statusPillWarning
                          : styles.statusPillSuccess),
                      }}
                    >
                      {group.status}
                    </span>
                  </td>
                  <td style={{ padding: "1rem" }}>
                    <div style={styles.tableActions}>
                      <Link
                        style={{
                          ...styles.ghostBtn,
                          textDecoration: "none",
                          display: "inline-block",
                        }}
                        to={`/subjects/${group.units[0]?.id}`}
                      >
                        Open
                      </Link>
                      <ActionDropdown
                        groupKey={group.id}
                        groupData={group}
                        onEdit={() => setSelectedGroupKey(group.id)}
                        onUploadQBank={() => handleUploadQBank(group)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && !groups.length ? (
                <tr>
                  <td colSpan="6" style={{ padding: "2rem", textAlign: "center", color: "#999" }}>
                    No subjects found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {selectedGroupKey ? (
        <SubjectManageModal
          groupKey={selectedGroupKey}
          onClose={() => setSelectedGroupKey("")}
          onSaved={(message) => {
            setFeedback(message);
            loadSubjects();
          }}
        />
      ) : null}

      {uploadGroupKey ? (
        <UploadQuestionBankModal
          groupKey={uploadGroupKey}
          groupData={uploadGroupData}
          onClose={() => {
            setUploadGroupKey("");
            setUploadGroupData(null);
          }}
          onSaved={(message) => {
            setFeedback(message);
            loadSubjects();
          }}
        />
      ) : null}
    </section>
  );
}
