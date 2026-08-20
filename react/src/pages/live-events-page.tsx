import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Lock, Radio, Users } from "lucide-react";
import Navigation from "../components/navigation";
import FunnyLoader from "../components/ui/FunnyLoader";
import { listLiveEvents } from "../lib/gradeupApi";

type EventType = "debate" | "seminar";
type StatusTab = "live" | "ongoing" | "ended";

type LiveEvent = {
  id: string;
  sessionId: string;
  sessionType: EventType;
  title?: string;
  topic?: string;
  createdBy?: string;
  subject?: string;
  unit?: string;
  status?: string;
  statusLabel?: string;
  visibility?: "public" | "school" | "class" | "private";
  visibilityLabel?: string;
  participantCount?: number;
  canAccess?: boolean;
  accessLabel?: string;
  canJoin?: boolean;
  joinUrl?: string;
};

const styles = `
.live-events-page{min-height:100vh;background:#f6f8fb;color:#0f172a;font-family:"Plus Jakarta Sans",system-ui,sans-serif}
.live-events-shell{max-width:1180px;margin:0 auto;padding:92px 24px 36px}
.live-events-head{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;margin-bottom:18px}
.live-events-title{font-size:30px;font-weight:900;letter-spacing:0;line-height:1.1}
.live-events-sub{font-size:13px;color:#64748b;margin-top:6px;line-height:1.6}
.live-events-tabs{display:flex;gap:8px;padding:5px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;box-shadow:0 8px 24px rgba(15,23,42,.05)}
.live-events-tab{height:36px;padding:0 14px;border:0;border-radius:6px;background:transparent;color:#475569;font-size:13px;font-weight:800;cursor:pointer}
.live-events-tab.active{background:#0f172a;color:#fff}
.live-events-filters{display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap}
.live-events-filter{height:34px;padding:0 13px;border:1px solid #dbe4ef;border-radius:7px;background:#fff;color:#475569;font-size:12px;font-weight:900;cursor:pointer}
.live-events-filter.active{background:#2563eb;border-color:#2563eb;color:#fff}
.live-events-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}
.event-card{background:#fff;border:1px solid #e2e8f0;border-radius:8px;box-shadow:0 10px 28px rgba(15,23,42,.06);overflow:hidden}
.event-card-top{padding:15px 16px 12px;border-bottom:1px solid #edf2f7}
.event-row{display:flex;align-items:center;justify-content:space-between;gap:10px}
.event-type{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 8px;border-radius:6px;background:#eef6ff;color:#1d4ed8;font-size:11px;font-weight:900;text-transform:uppercase}
.event-type.seminar{background:#ecfdf5;color:#047857}
.event-status{font-size:11px;font-weight:900;color:#334155}
.event-status.live{color:#dc2626}
.event-topic{font-size:16px;font-weight:900;line-height:1.35;margin-top:12px;color:#0f172a}
.event-meta{font-size:12px;color:#64748b;line-height:1.6;margin-top:8px}
.event-card-body{padding:13px 16px 15px;display:grid;gap:10px}
.event-facts{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.event-fact{display:flex;align-items:center;gap:7px;min-height:34px;padding:8px;border-radius:7px;background:#f8fafc;color:#475569;font-size:12px;font-weight:700}
.event-action{height:38px;border:0;border-radius:7px;background:#2563eb;color:#fff;font-weight:900;font-size:13px;cursor:pointer}
.event-action.seminar{background:#059669}
.event-action.disabled{background:#e2e8f0;color:#64748b;cursor:not-allowed}
.event-empty{padding:42px 18px;text-align:center;border:1px dashed #cbd5e1;border-radius:8px;background:#fff;color:#64748b}
@media(max-width:720px){.live-events-shell{padding:84px 14px 24px}.live-events-head{align-items:stretch;flex-direction:column}.live-events-tabs{width:100%}.live-events-tab{flex:1}.live-events-title{font-size:24px}}
`;

function statusClass(event: LiveEvent) {
  const status = String(event.status || "").toLowerCase();
  return status === "active" || status === "waiting_for_ai" ? " live" : "";
}

function actionLabel(event: LiveEvent) {
  if (!event.canAccess) return event.accessLabel || "Restricted";
  const status = String(event.status || "waiting").toLowerCase();
  const ended = status === "completed" || status === "ended" || status === "ending" || status === "end_error";
  if (status === "cancelled" || status === "canceled") return "Cancelled";
  const started = status === "active" || status === "waiting_for_ai";
  if (ended) return "Ended";
  if (event.sessionType === "debate" && started) return "In Progress";
  return event.sessionType === "seminar" ? "Join Seminar" : "Join Debate";
}

export default function LiveEventsPage() {
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<EventType>("debate");
  const [statusTab, setStatusTab] = useState<StatusTab>("live");
  const { data = [], isLoading } = useQuery<LiveEvent[]>({
    queryKey: ["/api/v1/live-events", tab, statusTab],
    queryFn: () => listLiveEvents(tab, statusTab),
    refetchInterval: 5000,
  });

  const events = useMemo(
    () => data.filter((event) => event.sessionType === tab),
    [data, tab],
  );

  return (
    <div className="live-events-page">
      <style>{styles}</style>
      <Navigation />
      <main className="live-events-shell">
        <div className="live-events-head">
          <div>
            <div className="live-events-title">Live Events</div>
            <div className="live-events-sub">
              Join visible debate and seminar rooms from your class, school, or public sessions.
            </div>
          </div>
          <div className="live-events-tabs">
            <button
              className={`live-events-tab${tab === "debate" ? " active" : ""}`}
              onClick={() => setTab("debate")}
            >
              Debate
            </button>
            <button
              className={`live-events-tab${tab === "seminar" ? " active" : ""}`}
              onClick={() => setTab("seminar")}
            >
              Seminar
            </button>
          </div>
        </div>

        <div className="live-events-filters">
          {[
            ["live", "Live"],
            ["ongoing", "Ongoing"],
            ["ended", "Ended / Cancelled"],
          ].map(([value, label]) => (
            <button
              key={value}
              className={`live-events-filter${statusTab === value ? " active" : ""}`}
              onClick={() => setStatusTab(value as StatusTab)}
            >
              {label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <FunnyLoader text="Loading live events..." />
        ) : events.length ? (
          <div className="live-events-grid">
            {events.map((event) => {
              const joinable = Boolean(event.canJoin);
              const typeLabel = event.sessionType === "seminar" ? "Seminar" : "Debate";
              return (
                <article className="event-card" key={event.id || event.sessionId}>
                  <div className="event-card-top">
                    <div className="event-row">
                      <span className={`event-type ${event.sessionType}`}>
                        <Radio size={13} /> {typeLabel}
                      </span>
                      <span className={`event-status${statusClass(event)}`}>
                        {event.statusLabel || "Waiting"}
                      </span>
                    </div>
                    <div className="event-topic">{event.topic || event.title || `${typeLabel} session`}</div>
                    <div className="event-meta">
                      Created by {event.createdBy || "GradeUp learner"}
                      {event.subject ? ` | ${event.subject}` : ""}
                      {event.unit ? ` | ${event.unit}` : ""}
                    </div>
                  </div>
                  <div className="event-card-body">
                    <div className="event-facts">
                      <div className="event-fact">
                        <Users size={14} /> {event.participantCount || 0} participants
                      </div>
                      <div className="event-fact">
                        <Lock size={14} /> {event.visibilityLabel || "Access to all"}
                      </div>
                    </div>
                    <button
                      className={`event-action ${event.sessionType}${joinable ? "" : " disabled"}`}
                      disabled={!joinable}
                      onClick={() => {
                        if (!event.joinUrl) return;
                        if (/^https?:\/\//i.test(event.joinUrl)) {
                          window.location.href = event.joinUrl;
                        } else {
                          setLocation(event.joinUrl);
                        }
                      }}
                    >
                      {joinable ? actionLabel(event) : actionLabel(event)}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="event-empty">
            <CalendarClock size={28} style={{ margin: "0 auto 10px" }} />
            No visible {tab} events found in this status.
          </div>
        )}
      </main>
    </div>
  );
}
