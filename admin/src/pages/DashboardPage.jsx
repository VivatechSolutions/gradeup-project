import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchSubjects } from "../api/client";

export default function DashboardPage() {
  const [summary, setSummary] = useState({ total: 0, latest: [] });

  useEffect(() => {
    let active = true;

    fetchSubjects("page=1&limit=5")
      .then((response) => {
        if (!active) {
          return;
        }

        setSummary({
          total: response.data.pagination.totalItems,
          latest: response.data.items,
        });
      })
      .catch(() => null);

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="page">
      <div className="hero-card split">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h2>Admin content operations</h2>
          <p className="muted">
            Keep uploads, content processing, and review workflows moving from one clean workspace.
          </p>
        </div>
        <div className="hero-actions">
          <Link className="primary-btn" to="/subjects/upload">
            Upload subject
          </Link>
        </div>
      </div>

      <div className="stats-grid">
        <article className="stat-card highlight">
          <p className="muted">Stored units</p>
          <h3>{summary.total}</h3>
          <span className="stat-footnote">Ready for search and review</span>
        </article>
        <article className="stat-card">
          <p className="muted">Processing pipeline</p>
          <h3>Admin to Node to Python to MongoDB</h3>
          <span className="stat-footnote">Operational visibility across ingestion</span>
        </article>
      </div>

      <div className="content-card">
        <div className="content-toolbar">
          <div>
            <h3>Recent uploads</h3>
            <p className="muted small">Latest processed content units.</p>
          </div>
          <Link to="/subjects">View all</Link>
        </div>
        <div className="table-wrap premium-table">
          <table>
            <thead>
              <tr>
                <th>Unit</th>
                <th>Board</th>
                <th>Standard</th>
                <th>Subject</th>
              </tr>
            </thead>
            <tbody>
              {summary.latest.map((item) => (
                <tr key={item.id}>
                  <td>
                    <Link to={`/subjects/${item.id}`}>{item.unitTitle}</Link>
                  </td>
                  <td>{item.board}</td>
                  <td>{item.standard}</td>
                  <td>{item.subject}</td>
                </tr>
              ))}
              {!summary.latest.length ? (
                <tr>
                  <td colSpan="4" className="table-empty">
                    No uploads yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
