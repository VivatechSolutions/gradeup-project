import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  deleteSubjectGroup,
  deleteSubjectUnit,
  fetchSubjectGroup,
  fetchSubjects,
  updateSubjectGroup,
} from "../api/client";

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
  });
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

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
    <div className="modal-layer" role="dialog" aria-modal="true">
      <button className="modal-backdrop" type="button" onClick={onClose} />
      <div className="modal-card subject-manage-modal">
        <div className="modal-head">
          <div>
            <p className="eyebrow">Manage Subject</p>
            <h3>{group?.subjectTitle || "Loading subject..."}</h3>
          </div>
          <button className="ghost-btn" type="button" onClick={onClose}>
            Close
          </button>
        </div>

        {error ? <div className="error-banner">{error}</div> : null}

        {group ? (
          <form className="modal-form" onSubmit={handleSave}>
            <div className="form-grid">
              <label>
                Board
                <input
                  value={form.board}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      board: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                Standard
                <input
                  value={form.standard}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      standard: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                Subject
                <input
                  value={form.subject}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      subject: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                Part
                <input
                  value={form.part}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      part: event.target.value,
                    }))
                  }
                />
              </label>
            </div>

            <div className="subject-manage-section">
              <div className="content-toolbar compact">
                <div>
                  <h4>Units</h4>
                  <p className="muted small">
                    {group.units.length} unit{group.units.length === 1 ? "" : "s"} in
                    this subject
                  </p>
                </div>
              </div>

              <div className="manage-unit-list">
                {group.units.map((unit) => (
                  <div className="manage-unit-item" key={unit.id}>
                    <div>
                      <strong>{unit.unitTitle}</strong>
                      <p className="muted small">{unit.unitLabel}</p>
                    </div>
                    <div className="table-actions">
                      <Link className="ghost-btn" to={`/subjects/${unit.id}`}>
                        Open
                      </Link>
                      <button
                        className="danger-btn"
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

            <div className="modal-actions between">
              <button
                className="danger-btn"
                type="button"
                onClick={handleDeleteSubject}
              >
                Delete Subject
              </button>
              <div className="table-actions">
                <button className="ghost-btn" type="button" onClick={onClose}>
                  Cancel
                </button>
                <button className="primary-btn" type="submit" disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="screen-center small-screen">Loading subject details...</div>
        )}
      </div>
    </div>
  );
}

export default function SubjectsPage() {
  const [groups, setGroups] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedGroupKey, setSelectedGroupKey] = useState("");
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

  return (
    <section className="page">
      {feedback ? <div className="toast-banner success-banner">{feedback}</div> : null}

      <div className="hero-card split">
        <div>
          <p className="eyebrow">Library</p>
          <h2>Manage subjects and units</h2>
          <p className="muted">
            Review processed subjects, open the reader, or update subject metadata
            and units from one place.
          </p>
        </div>
        <div className="hero-actions">
          <Link className="primary-btn" to="/subjects/upload">
            New upload
          </Link>
        </div>
      </div>

      <div className="content-card">
        <div className="content-toolbar">
          <div>
            <h3>Subject records</h3>
            <p className="muted small">
              Single-unit subjects open directly, while multi-unit subjects show unit
              links under the same parent subject.
            </p>
          </div>
          <input
            className="search-input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by subject, unit, or document id"
          />
        </div>

        <div className="table-wrap premium-table">
          <table>
            <thead>
              <tr>
                <th>Subject</th>
                <th>Board</th>
                <th>Standard</th>
                <th>Units</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <tr key={group.id}>
                  <td>
                    <div className="subject-group-cell">
                      <strong>{group.subjectTitle}</strong>
                      <span>
                        {group.unitCount === 1
                          ? group.units[0]?.unitTitle
                          : `${group.unitCount} units`}
                      </span>
                      {group.unitCount > 1 ? (
                        <div className="subject-group-links">
                          {group.units.map((unit) => (
                            <Link key={unit.id} to={`/subjects/${unit.id}`}>
                              {unit.unitTitle}
                            </Link>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </td>
                  <td>{group.board}</td>
                  <td>{group.standard}</td>
                  <td>{group.unitCount}</td>
                  <td>
                    <span className={`status-pill ${group.status === "failed" ? "danger" : group.status === "processing" ? "warning" : "success"}`}>
                      {group.status}
                    </span>
                  </td>
                  <td>
                    <div className="table-actions">
                      <Link
                        className="ghost-btn"
                        to={`/subjects/${group.units[0]?.id}`}
                      >
                        Open
                      </Link>
                      <button
                        className="primary-btn"
                        type="button"
                        onClick={() => setSelectedGroupKey(group.id)}
                      >
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && !groups.length ? (
                <tr>
                  <td colSpan="6" className="table-empty">
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
    </section>
  );
}
