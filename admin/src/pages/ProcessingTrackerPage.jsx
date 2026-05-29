import { useEffect, useState } from "react";
import { fetchUploadProcesses, fetchUploadStatus } from "../api/client";

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "completed", label: "Completed" },
  { value: "processing", label: "Processing" },
  { value: "failed", label: "Failed" },
];

function formatDateTime(value) {
  if (!value) {
    return "--";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getStatusTone(status) {
  if (status === "completed") {
    return "success";
  }
  if (status === "failed") {
    return "danger";
  }
  if (status === "queued") {
    return "info";
  }
  return "warning";
}

function getStatusLabel(status) {
  if (status === "completed") {
    return "Completed";
  }
  if (status === "failed") {
    return "Failed";
  }
  if (status === "queued") {
    return "Queued";
  }
  return "Processing";
}

export default function ProcessingTrackerPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUpload, setSelectedUpload] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadProcesses() {
      try {
        if (active) {
          setLoading(true);
        }

        const params = new URLSearchParams();
        if (activeTab !== "all") {
          params.set("status", activeTab);
        }
        params.set("limit", "50");

        const response = await fetchUploadProcesses(params.toString());
        if (active) {
          setItems(response.data.items || []);
        }
      } catch (_) {
        if (active) {
          setItems([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadProcesses();
    const timer = window.setInterval(loadProcesses, 5000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [activeTab]);

  useEffect(() => {
    if (
      !selectedUpload?.id ||
      selectedUpload.uploadStatus === "completed" ||
      selectedUpload.uploadStatus === "failed"
    ) {
      return undefined;
    }

    const timer = window.setInterval(async () => {
      try {
        const response = await fetchUploadStatus(selectedUpload.id);
        setSelectedUpload(response.data);
      } catch (_) {
        // Keep current details visible on transient refresh failures.
      }
    }, 4000);

    return () => window.clearInterval(timer);
  }, [selectedUpload?.id, selectedUpload?.uploadStatus]);

  async function handleViewDetails(id) {
    try {
      setDetailsLoading(true);
      const response = await fetchUploadStatus(id);
      setSelectedUpload(response.data);
    } catch (_) {
      setSelectedUpload(null);
    } finally {
      setDetailsLoading(false);
    }
  }

  return (
    <section className="page">
      <div className="hero-card split">
        <div>
          <p className="eyebrow">Tracker</p>
          <h2>Processing tracker</h2>
          <p className="muted">
            Monitor subject uploads, background processing, completions, and failures
            from one dedicated workspace.
          </p>
        </div>
        <div className="hero-metrics">
          <div className="metric-card">
            <span>Auto refresh</span>
            <strong>Every 5 sec</strong>
          </div>
        </div>
      </div>

      <div className="content-card">
        <div className="content-toolbar">
          <div>
            <h3>All processing activity</h3>
            <p className="muted small">
              Filter uploads by current state and inspect the latest backend message.
            </p>
          </div>
          <div className="tab-row">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                className={`tab${activeTab === tab.value ? " active" : ""}`}
                type="button"
                onClick={() => setActiveTab(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="table-wrap premium-table">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Latest message</th>
                <th>Date &amp; time</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="tracker-name-cell">
                      <strong>{item.name}</strong>
                      <span>{`${item.subject} - ${item.standard} - ${item.board}`}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`status-pill ${getStatusTone(item.status)}`}>
                      {getStatusLabel(item.status)}
                    </span>
                  </td>
                  <td>
                    <div className="tracker-message-cell">
                      <strong>{item.progressStage || "--"}</strong>
                      <span>{item.latestMessage || "--"}</span>
                    </div>
                  </td>
                  <td>{formatDateTime(item.updatedAt || item.createdAt)}</td>
                  <td>
                    <button
                      className="text-link"
                      type="button"
                      onClick={() => handleViewDetails(item.id)}
                    >
                      View details
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && !items.length ? (
                <tr>
                  <td colSpan="5" className="table-empty">
                    No processing records found for this filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {detailsLoading ? (
        <div className="content-card">
          <p className="muted">Loading process details...</p>
        </div>
      ) : null}

      {selectedUpload ? (
        <div className="modal-layer" role="dialog" aria-modal="true">
          <button
            className="modal-backdrop"
            type="button"
            aria-label="Close tracker details"
            onClick={() => setSelectedUpload(null)}
          />
          <div className="modal-card tracker-modal-card">
            <div className="modal-head">
              <div>
                <p className="eyebrow">Processing Details</p>
                <h3>{selectedUpload.uploadTitle}</h3>
                <p className="muted">
                  {`${selectedUpload.subject} - ${selectedUpload.standard} - ${selectedUpload.originalFileName}`}
                </p>
              </div>
              <button
                className="ghost-btn"
                type="button"
                onClick={() => setSelectedUpload(null)}
              >
                Close
              </button>
            </div>

            <div className="tracker-detail-grid">
              <div className="metric-card">
                <span>Status</span>
                <strong>
                  <span className={`status-pill ${getStatusTone(selectedUpload.uploadStatus)}`}>
                    {getStatusLabel(selectedUpload.uploadStatus)}
                  </span>
                </strong>
              </div>
              <div className="metric-card">
                <span>Progress</span>
                <strong>{selectedUpload.progressPercent || 0}%</strong>
              </div>
            </div>

            <div className="progress-block">
              <div className="progress-meta">
                <strong>{selectedUpload.progressStage || "queued"}</strong>
                <span>{selectedUpload.progressPercent || 0}%</span>
              </div>
              <div className="progress-bar">
                <div
                  className={`progress-fill ${getStatusTone(selectedUpload.uploadStatus)}`}
                  style={{ width: `${selectedUpload.progressPercent || 0}%` }}
                />
              </div>
              <p className="muted">
                {selectedUpload.progressMessage || "Waiting for status update..."}
              </p>
              <p className="muted small">
                Processed units: {selectedUpload.processedUnits || 0}
                {selectedUpload.totalUnits ? ` / ${selectedUpload.totalUnits}` : ""}
              </p>
            </div>

            {selectedUpload.error ? (
              <div className="error-details tracker-error-panel">
                <p>
                  <strong>Message:</strong> {selectedUpload.error.message}
                </p>
                <p>
                  <strong>Source:</strong> {selectedUpload.error.source || "unknown"}
                </p>
                <pre>{JSON.stringify(selectedUpload.error.details, null, 2)}</pre>
              </div>
            ) : null}

            {selectedUpload.units?.length ? (
              <div className="table-wrap premium-table">
                <table>
                  <thead>
                    <tr>
                      <th>Document ID</th>
                      <th>Unit</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedUpload.units.map((unit) => (
                      <tr key={unit.id}>
                        <td>{unit.documentId}</td>
                        <td>{unit.unitTitle}</td>
                        <td>
                          <span className="status-pill success">Done</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
