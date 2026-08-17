import React, { useEffect, useMemo, useRef, useState } from "react";
import { Send, Plus, Search, UserPlus, Mail, Paperclip, Trash2, LogOut, Download } from "lucide-react";
import { io, Socket } from "socket.io-client";
import Navigation from "../components/navigation";
import { API_BASE_URL, buildApiUrl } from "../lib/apiBase";
import { useAuth } from "../hooks/use-auth";

type GroupMember = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  userRole: string;
  tag?: string | null;
};

type Group = {
  id: string;
  name: string;
  description?: string;
  category?: string;
  icon?: string;
  memberCount: number;
  adminId?: string;
  members: GroupMember[];
};

type Message = {
  id: string;
  groupId: string;
  senderId: string;
  user: string;
  role: string;
  text: string;
  type: string;
  isFile?: boolean;
  fileName?: string;
  attachment?: { downloadUrl: string; fileName: string };
  timestamp: string;
  createdAt?: string;
};

type SearchResult = {
  id: string;
  name: string;
  email: string;
  tag?: string | null;
  canDirectAdd: boolean;
};

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isForm = options.body instanceof FormData;
  const res = await fetch(buildApiUrl(path), {
    credentials: "include",
    ...options,
    headers: {
      ...(isForm ? {} : { "Content-Type": "application/json" }),
      ...(options.headers || {}),
    },
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok) throw new Error(payload?.message || "Request failed");
  return payload?.data ?? payload;
}

const pageStyle = `
.gc-page{min-height:100vh;background:#f8fafc;color:#0f172a;font-family:'Plus Jakarta Sans',system-ui,sans-serif}
.gc-shell{height:calc(100vh - 64px);display:grid;grid-template-columns:300px minmax(0,1fr) 280px;gap:14px;padding:18px}
.gc-panel{background:#fff;border:1px solid rgba(15,23,42,.08);border-radius:16px;box-shadow:0 2px 12px rgba(15,23,42,.05);overflow:hidden;min-height:0}
.gc-head{height:58px;display:flex;align-items:center;gap:10px;padding:0 16px;border-bottom:1px solid rgba(15,23,42,.08)}
.gc-title{font-size:14px;font-weight:800}.gc-muted{font-size:12px;color:#64748b}
.gc-list{padding:10px;display:flex;flex-direction:column;gap:8px;overflow:auto;height:calc(100% - 58px)}
.gc-group{border:1px solid transparent;border-radius:12px;padding:10px 12px;background:#f8fafc;text-align:left;cursor:pointer}
.gc-group.active{background:rgba(99,102,241,.1);border-color:rgba(99,102,241,.25)}
.gc-chat{display:flex;flex-direction:column;min-width:0}.gc-messages{flex:1;overflow:auto;padding:16px;display:flex;flex-direction:column;gap:12px}
.gc-msg{display:flex;flex-direction:column;max-width:72%;gap:4px}.gc-msg.mine{align-self:flex-end;align-items:flex-end}.gc-bubble{padding:10px 13px;border-radius:14px;background:#f1f5f9;font-size:13px;line-height:1.55}.gc-msg.mine .gc-bubble{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff}
.gc-meta{font-size:11px;color:#64748b}.gc-input{display:flex;gap:8px;padding:12px;border-top:1px solid rgba(15,23,42,.08)}
.gc-input input,.gc-form input,.gc-form textarea{width:100%;border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;font:inherit;font-size:13px;outline:none;background:#fff}.gc-form textarea{resize:none;min-height:72px}
.gc-input input:focus,.gc-form input:focus,.gc-form textarea:focus{border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,.12)}
.gc-icon-btn,.gc-btn{border:none;border-radius:10px;background:#6366f1;color:#fff;cursor:pointer;font-weight:800;display:inline-flex;align-items:center;justify-content:center;gap:7px}
.gc-icon-btn{width:40px;height:40px;flex-shrink:0}.gc-btn{padding:10px 12px;font-size:12px}.gc-btn.secondary{background:#f1f5f9;color:#334155}.gc-btn.danger{background:#ef4444}.gc-btn:disabled{opacity:.5;cursor:not-allowed}
.gc-form{padding:12px;display:flex;flex-direction:column;gap:9px;border-bottom:1px solid rgba(15,23,42,.08)}
.gc-member{display:flex;align-items:center;gap:9px;padding:9px 0;border-bottom:1px solid #f1f5f9}.gc-avatar{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;position:relative;flex-shrink:0}.gc-dot{position:absolute;right:-1px;bottom:-1px;width:10px;height:10px;border-radius:50%;border:2px solid #fff;background:#f59e0b}.gc-dot.online{background:#22c55e}
.gc-search-row{display:flex;gap:8px}.gc-result{padding:9px;border:1px solid #e2e8f0;border-radius:10px;margin-top:8px}.gc-file{display:flex;gap:8px;align-items:center}.gc-empty{height:100%;display:flex;align-items:center;justify-content:center;color:#94a3b8;text-align:center;padding:24px}
@media(max-width:1000px){.gc-shell{grid-template-columns:1fr;height:auto}.gc-panel{min-height:300px}.gc-list{height:auto}.gc-shell{padding:12px}}
`;

function initials(name = "") {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "U";
}

export default function GroupChatPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [notice, setNotice] = useState("");
  const [createForm, setCreateForm] = useState({ name: "", description: "" });
  const [inviteEmail, setInviteEmail] = useState("");
  const [memberQuery, setMemberQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const selected = useMemo(() => groups.find((group) => group.id === selectedId) || null, [groups, selectedId]);

  async function refreshGroups() {
    const next = await api<Group[]>("/api/v1/group-chat/groups");
    setGroups(next);
    setSelectedId((current) => current || next[0]?.id || null);
  }

  async function refreshMessages(groupId = selectedId) {
    if (!groupId) return;
    const next = await api<Message[]>(`/api/v1/group-chat/groups/${groupId}/messages`);
    setMessages(next);
  }

  useEffect(() => {
    refreshGroups().catch((error) => setNotice(error.message));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    refreshMessages(selectedId).catch((error) => setNotice(error.message));
    if (!socketRef.current) {
      socketRef.current = io(API_BASE_URL || undefined, {
        withCredentials: true,
        transports: ["websocket", "polling"],
      });
      socketRef.current.on("group:message", (msg: Message) => {
        setMessages((prev) => prev.some((item) => item.id === msg.id) ? prev : [...prev, msg]);
      });
      socketRef.current.on("group:members", (group: Group) => {
        setGroups((prev) => prev.map((item) => (item.id === group.id ? group : item)));
      });
      socketRef.current.on("group:updated", (group: Group) => {
        setGroups((prev) => prev.map((item) => (item.id === group.id ? group : item)));
      });
      socketRef.current.on("group:deleted", ({ groupId }: { groupId: string }) => {
        setGroups((prev) => prev.filter((item) => item.id !== groupId));
        setSelectedId((current) => current === groupId ? null : current);
      });
      socketRef.current.on("connect_error", () => {
        setNotice("Realtime unavailable. Using refresh fallback.");
      });
    }
    socketRef.current.emit("group:join", { groupId: selectedId });
    const timer = window.setInterval(() => {
      refreshGroups().catch(() => null);
      refreshMessages(selectedId).catch(() => null);
    }, 5000);
    return () => {
      socketRef.current?.emit("group:leave-room", { groupId: selectedId });
      window.clearInterval(timer);
    };
  }, [selectedId]);

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function createGroup() {
    if (!createForm.name.trim()) return;
    const group = await api<Group>("/api/v1/group-chat/groups", {
      method: "POST",
      body: JSON.stringify(createForm),
    });
    setGroups((prev) => [group, ...prev]);
    setSelectedId(group.id);
    setCreateForm({ name: "", description: "" });
  }

  async function sendMessage() {
    if (!selectedId || !text.trim()) return;
    const msg = await api<Message>(`/api/v1/group-chat/groups/${selectedId}/messages`, {
      method: "POST",
      body: JSON.stringify({ text }),
    });
    setMessages((prev) => prev.some((item) => item.id === msg.id) ? prev : [...prev, msg]);
    setText("");
  }

  async function uploadAttachment(file: File) {
    if (!selectedId) return;
    const form = new FormData();
    form.append("file", file);
    const msg = await api<Message>(`/api/v1/group-chat/groups/${selectedId}/attachments`, {
      method: "POST",
      body: form,
    });
    setMessages((prev) => prev.some((item) => item.id === msg.id) ? prev : [...prev, msg]);
  }

  async function searchMembers() {
    if (!selectedId || memberQuery.trim().length < 3) return;
    const next = await api<SearchResult[]>(`/api/v1/group-chat/groups/${selectedId}/search-members?q=${encodeURIComponent(memberQuery.trim())}`);
    setResults(next);
  }

  async function addMember(userId: string) {
    if (!selectedId) return;
    const group = await api<Group>(`/api/v1/group-chat/groups/${selectedId}/members`, {
      method: "POST",
      body: JSON.stringify({ userId }),
    });
    setGroups((prev) => prev.map((item) => (item.id === group.id ? group : item)));
    setResults((prev) => prev.filter((item) => item.id !== userId));
  }

  async function inviteMember(email = inviteEmail) {
    if (!selectedId || !email.trim()) return;
    const invite = await api<{ emailSkipped?: boolean; joinUrl?: string }>(`/api/v1/group-chat/groups/${selectedId}/invites`, {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    setInviteEmail("");
    setNotice(invite.emailSkipped && invite.joinUrl ? `SMTP not configured. Invite link: ${invite.joinUrl}` : "Invite sent.");
  }

  async function leaveGroup() {
    if (!selectedId) return;
    await api(`/api/v1/group-chat/groups/${selectedId}/leave`, { method: "POST" });
    setMessages([]);
    setSelectedId(null);
    await refreshGroups();
  }

  async function deleteGroup() {
    if (!selectedId) return;
    await api(`/api/v1/group-chat/groups/${selectedId}`, { method: "DELETE" });
    setMessages([]);
    setSelectedId(null);
    await refreshGroups();
  }

  return (
    <div className="gc-page">
      <style>{pageStyle}</style>
      <Navigation />
      <div className="gc-shell">
        <aside className="gc-panel">
          <div className="gc-head">
            <Plus size={16} />
            <div>
              <div className="gc-title">Group Chat</div>
              <div className="gc-muted">{groups.length} groups</div>
            </div>
          </div>
          <div className="gc-form">
            <input placeholder="Group name" value={createForm.name} onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))} />
            <textarea placeholder="Description" value={createForm.description} onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))} />
            <button className="gc-btn" onClick={createGroup}>Create group</button>
          </div>
          <div className="gc-list">
            {groups.map((group) => (
              <button key={group.id} className={`gc-group ${group.id === selectedId ? "active" : ""}`} onClick={() => setSelectedId(group.id)}>
                <div className="gc-title">{group.name}</div>
                <div className="gc-muted">{group.memberCount} members</div>
              </button>
            ))}
            {groups.length === 0 && <div className="gc-empty">Create your first group to start chatting.</div>}
          </div>
        </aside>

        <main className="gc-panel gc-chat">
          {selected ? (
            <>
              <div className="gc-head">
                <div className="gc-avatar">{initials(selected.name)}</div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="gc-title">{selected.name}</div>
                  <div className="gc-muted">{selected.description || "Study group"}</div>
                </div>
                <button className="gc-btn secondary" onClick={leaveGroup}><LogOut size={14} />Leave</button>
                <button className="gc-btn danger" onClick={deleteGroup}><Trash2 size={14} />Delete</button>
              </div>
              <div className="gc-messages">
                {messages.map((msg) => (
                  <div key={msg.id} className={`gc-msg ${msg.senderId === user?.id ? "mine" : ""}`}>
                    <div className="gc-meta">{msg.user} · {new Date(msg.timestamp || msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                    <div className="gc-bubble">
                      {msg.isFile && msg.attachment ? (
                        <a className="gc-file" href={buildApiUrl(msg.attachment.downloadUrl)} target="_blank" rel="noreferrer">
                          <Download size={14} /> {msg.fileName || msg.attachment.fileName}
                        </a>
                      ) : msg.text}
                    </div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>
              <div className="gc-input">
                <input type="file" ref={fileRef} style={{ display: "none" }} onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadAttachment(file).catch((error) => setNotice(error.message));
                  e.currentTarget.value = "";
                }} />
                <button className="gc-icon-btn" onClick={() => fileRef.current?.click()}><Paperclip size={16} /></button>
                <input placeholder="Type a message..." value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage().catch((error) => setNotice(error.message))} />
                <button className="gc-icon-btn" onClick={() => sendMessage().catch((error) => setNotice(error.message))}><Send size={16} /></button>
              </div>
            </>
          ) : (
            <div className="gc-empty">Select or create a group.</div>
          )}
        </main>

        <aside className="gc-panel">
          <div className="gc-head">
            <UserPlus size={16} />
            <div>
              <div className="gc-title">Members</div>
              <div className="gc-muted">{selected?.members.length || 0} total</div>
            </div>
          </div>
          {selected && (
            <>
              <div className="gc-form">
                <div className="gc-search-row">
                  <input placeholder="Search name/email" value={memberQuery} onChange={(e) => setMemberQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && searchMembers().catch((error) => setNotice(error.message))} />
                  <button className="gc-icon-btn" onClick={() => searchMembers().catch((error) => setNotice(error.message))}><Search size={15} /></button>
                </div>
                {results.map((result) => (
                  <div className="gc-result" key={result.id}>
                    <div className="gc-title">{result.name}</div>
                    <div className="gc-muted">{result.email}{result.tag ? ` · ${result.tag}` : ""}</div>
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <button className="gc-btn" disabled={!result.canDirectAdd} onClick={() => addMember(result.id).catch((error) => setNotice(error.message))}>Add</button>
                      <button className="gc-btn secondary" onClick={() => inviteMember(result.email).catch((error) => setNotice(error.message))}>Invite</button>
                    </div>
                  </div>
                ))}
                <div className="gc-search-row">
                  <input placeholder="Invite by email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
                  <button className="gc-icon-btn" onClick={() => inviteMember().catch((error) => setNotice(error.message))}><Mail size={15} /></button>
                </div>
                {notice && <div className="gc-muted">{notice}</div>}
              </div>
              <div className="gc-list">
                {selected.members.map((member) => (
                  <div className="gc-member" key={`${member.userRole}:${member.id}`}>
                    <div className="gc-avatar">{initials(member.name)}<span className={`gc-dot ${member.status === "Online" ? "online" : ""}`} /></div>
                    <div style={{ minWidth: 0 }}>
                      <div className="gc-title">{member.name}</div>
                      <div className="gc-muted">{member.role} · {member.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
