import { useState, useEffect } from "react";
import { Link } from "wouter";
import { MeetingHistoryEntry, mockMeetingHistory } from "../lib/mock-teacher-meeting-data";

const TeacherMeetingPage = () => {
  const [history, setHistory] = useState<MeetingHistoryEntry[]>([]);

  useEffect(() => {
    // In a real app, this would be an API call
    setHistory(mockMeetingHistory);
  }, []);

  return (
    <div className="teacher-meeting-history">
      <style>{`
        .teacher-meeting-history {
          padding: 2rem;
          font-family: 'Plus Jakarta Sans', sans-serif;
          background-color: #f8fafc;
          min-height: 100vh;
        }
        .history-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }
        .history-header h1 {
          font-size: 2rem;
          font-weight: 900;
          color: #0f172a;
        }
        .new-meeting-btn {
          padding: 10px 20px;
          border-radius: 13px;
          border: none;
          cursor: pointer;
          background: linear-gradient(135deg, #0ea5e9, #6366f1);
          color: #fff;
          font-size: 1rem;
          font-weight: 700;
          transition: all .2s;
          box-shadow: 0 4px 18px rgba(14, 165, 233, 0.28);
          text-decoration: none;
        }
        .new-meeting-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 7px 24px rgba(14, 165, 233, 0.38);
        }
        .history-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1.5rem;
        }
        .history-card {
          background: #fff;
          border-radius: 18px;
          padding: 1.5rem;
          box-shadow: 0 4px 20px rgba(0,0,0,.08);
          transition: all .2s;
          border-top: 4px solid #0ea5e9;
          display: flex;
          flex-direction: column;
        }
        .history-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 30px rgba(0,0,0,.1);
        }
        .card-header {
          margin-bottom: 1rem;
        }
        .card-subject {
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
          color: #0ea5e9;
          margin-bottom: 0.25rem;
        }
        .card-topic {
          font-size: 1.2rem;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.3;
        }
        .card-meta-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-top: auto;
          padding-top: 1rem;
          border-top: 1px solid #f1f5f9;
        }
        .meta-item {
          font-size: 0.9rem;
        }
        .meta-label {
          font-size: 0.8rem;
          color: #94a3b8;
          margin-bottom: 0.25rem;
        }
        .meta-value {
          font-weight: 700;
          color: #475569;
        }
        .view-report-btn {
          width: 100%;
          padding: 10px 20px;
          border-radius: 11px;
          border: 1.5px solid #0ea5e9;
          background: transparent;
          color: #0ea5e9;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all .2s;
          margin-top: 1.5rem;
        }
        .view-report-btn:hover {
          background: #0ea5e9;
          color: #fff;
        }
      `}</style>
      <div className="history-header">
        <h1>Meeting History</h1>
        <Link href="/teacher/meetings/new">
          <a className="new-meeting-btn">+ New Meeting</a>
        </Link>
      </div>
      <div className="history-grid">
        {history.map(meeting => (
          <div key={meeting.id} className="history-card">
            <div className="card-header">
              <div className="card-subject">{meeting.subject}</div>
              <h2 className="card-topic">{meeting.topic}</h2>
            </div>
            <div className="card-meta-grid">
              <div className="meta-item">
                <div className="meta-label">Date</div>
                <div className="meta-value">{new Date(meeting.date).toLocaleDateString()}</div>
              </div>
              <div className="meta-item">
                <div className="meta-label">Duration</div>
                <div className="meta-value">{meeting.duration}</div>
              </div>
              <div className="meta-item">
                <div className="meta-label">Participants</div>
                <div className="meta-value">{meeting.participants}</div>
              </div>
            </div>
            <button className="view-report-btn">View Report & Recordings</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TeacherMeetingPage;
