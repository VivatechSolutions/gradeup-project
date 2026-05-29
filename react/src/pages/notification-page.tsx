import React, { useEffect, useState } from 'react';
import { useNotificationStore } from '../lib/notification-store';
import Navigation from '../components/navigation';
import { useAuth } from '../hooks/use-auth';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, BookOpen, Trophy, Star, Flame, Users,
  CheckCheck, Trash2, Filter, BellOff, ChevronRight,
  Award, Zap, Target, Clock,
} from 'lucide-react';

// ── Design tokens — exact match to progress page ──────────────────────────────
export const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}

/* ── THEME VARIABLES ── */
:root {
  --np-bg:        #f8fafc;
  --np-surface:   #ffffff;
  --np-surface2:  #f8fafc;
  --np-text:      #0f172a;
  --np-text2:     #374151;
  --np-muted:     #64748b;
  --np-subtle:    #94a3b8;
  --np-border:    rgba(0,0,0,.06);
  --np-border2:   rgba(0,0,0,.08);
  --np-shadow:    0 2px 12px rgba(0,0,0,.05);
}

[data-theme="dark"] {
  --np-bg:        #0b1120;
  --np-surface:   #1e293b;
  --np-surface2:  #0f172a;
  --np-text:      #f1f5f9;
  --np-text2:     #cbd5e1;
  --np-muted:     #94a3b8;
  --np-subtle:    #64748b;
  --np-border:    rgba(255,255,255,.07);
  --np-border2:   rgba(255,255,255,.10);
  --np-shadow:    0 2px 12px rgba(0,0,0,.35);
}

.np-root{
  font-family:'Plus Jakarta Sans',system-ui,sans-serif;
  background:var(--np-bg);
  min-height:100vh;
  color:var(--np-text);
  transition:background .3s,color .3s;
}

/* ── Hero ── */
.np-hero{margin:24px 28px 0;border-radius:24px;padding:32px 40px;
  background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#ec4899 100%);
  position:relative;overflow:hidden;color:#fff;
  box-shadow:0 8px 32px rgba(99,102,241,.28);
  animation:heroIn .55s cubic-bezier(.34,1.56,.64,1) both;}
@keyframes heroIn{from{opacity:0;transform:translateY(-16px) scale(.97)}to{opacity:1;transform:none}}
.np-hero::before{content:'';position:absolute;top:-80px;right:-80px;width:280px;height:280px;border-radius:50%;background:rgba(255,255,255,.1);pointer-events:none;}
.np-hero::after{content:'';position:absolute;bottom:-60px;left:25%;width:200px;height:200px;border-radius:50%;background:rgba(255,255,255,.07);pointer-events:none;}
.np-hero-inner{position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap;}
.np-hero-pill{display:inline-flex;align-items:center;gap:6px;padding:5px 14px;border-radius:20px;margin-bottom:10px;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.3);font-size:12px;font-weight:700;color:#fff;}
.np-hero-title{font-size:clamp(22px,3vw,32px);font-weight:800;color:#fff;margin-bottom:6px;letter-spacing:-.3px;}
.np-hero-sub{font-size:13.5px;color:rgba(255,255,255,.72);line-height:1.6;}
.np-hero-stats{display:flex;gap:10px;flex-shrink:0;}
.np-hstat{text-align:center;padding:12px 18px;border-radius:16px;min-width:68px;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.22);backdrop-filter:blur(8px);}
.np-hstat-n{font-size:22px;font-weight:800;color:#fff;line-height:1;}
.np-hstat-l{font-size:10.5px;color:rgba(255,255,255,.6);margin-top:2px;}

/* ── Body ── */
.np-body{padding:20px 28px 60px;}

/* ── Stat cards ── */
.np-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;padding:20px 28px 0;}
.np-scard{
  background:var(--np-surface);border-radius:20px;padding:20px;
  border:1px solid var(--np-border);box-shadow:var(--np-shadow);
  animation:scardIn .5s cubic-bezier(.34,1.56,.64,1) both;position:relative;overflow:hidden;
  transition:all .28s cubic-bezier(.4,0,.2,1);
}
.np-scard:hover{transform:translateY(-4px) scale(1.01);box-shadow:0 12px 32px rgba(0,0,0,.1);}
[data-theme="dark"] .np-scard:hover{box-shadow:0 12px 32px rgba(0,0,0,.4);}
@keyframes scardIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.np-scard.blue  {border-top:3px solid #6366f1;}
.np-scard.green {border-top:3px solid #10b981;}
.np-scard.amber {border-top:3px solid #f59e0b;}
.np-scard.purple{border-top:3px solid #8b5cf6;}
.np-scard-icon{width:40px;height:40px;border-radius:12px;margin-bottom:12px;display:flex;align-items:center;justify-content:center;}
.np-scard.blue   .np-scard-icon{background:rgba(99,102,241,.1);}
.np-scard.green  .np-scard-icon{background:rgba(16,185,129,.1);}
.np-scard.amber  .np-scard-icon{background:rgba(245,158,11,.1);}
.np-scard.purple .np-scard-icon{background:rgba(139,92,246,.1);}
.np-scard-n{font-size:30px;font-weight:800;color:var(--np-text);letter-spacing:-1px;line-height:1;}
.np-scard-l{font-size:12.5px;color:var(--np-muted);margin-top:4px;font-weight:500;}
.np-scard-sub{font-size:11.5px;color:var(--np-subtle);margin-top:6px;display:flex;align-items:center;gap:4px;font-weight:500;}

/* ── Filter tab bar ── */
.np-tabs{
  display:flex;gap:4px;background:var(--np-surface);border-radius:16px;padding:5px;
  border:1px solid var(--np-border);box-shadow:0 2px 8px rgba(0,0,0,.04);
  margin-bottom:20px;overflow-x:auto;scrollbar-width:none;
  transition:background .3s,border-color .3s;
}
.np-tabs::-webkit-scrollbar{display:none;}
.np-tab{flex:1;min-width:fit-content;display:flex;align-items:center;justify-content:center;gap:7px;padding:10px 18px;border-radius:12px;border:none;background:transparent;font-family:inherit;font-size:13px;font-weight:600;color:var(--np-muted);cursor:pointer;transition:all .2s cubic-bezier(.4,0,.2,1);white-space:nowrap;}
.np-tab:hover{background:rgba(99,102,241,.06);color:#6366f1;}
[data-theme="dark"] .np-tab:hover{background:rgba(99,102,241,.15);color:#a5b4fc;}
.np-tab.on{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;box-shadow:0 4px 12px rgba(99,102,241,.32);}
.np-tab-badge{background:rgba(99,102,241,.15);color:#6366f1;font-size:10px;font-weight:800;padding:1px 7px;border-radius:20px;min-width:18px;text-align:center;}
[data-theme="dark"] .np-tab-badge{background:rgba(99,102,241,.25);color:#a5b4fc;}
.np-tab.on .np-tab-badge{background:rgba(255,255,255,.25);color:#fff;}

/* ── Panel ── */
.np-panel{
  background:var(--np-surface);border-radius:20px;border:1px solid var(--np-border);
  box-shadow:var(--np-shadow);overflow:hidden;
  transition:background .3s,border-color .3s;
}
.np-panel-head{
  padding:18px 22px 14px;border-bottom:1px solid var(--np-border);
  display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;
}
.np-panel-title{font-size:15px;font-weight:800;color:var(--np-text);display:flex;align-items:center;gap:8px;}
.np-panel-sub{font-size:12.5px;color:var(--np-muted);margin-top:3px;font-weight:500;}
.np-panel-actions{display:flex;gap:8px;align-items:center;flex-shrink:0;}

/* ── Action buttons ── */
.np-btn{
  display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:10px;
  border:1.5px solid var(--np-border2);background:var(--np-surface);font-family:inherit;
  font-size:12px;font-weight:600;color:var(--np-muted);cursor:pointer;transition:all .18s;white-space:nowrap;
}
.np-btn:hover{border-color:#6366f1;color:#6366f1;background:rgba(99,102,241,.05);}
.np-btn.danger:hover{border-color:#ef4444;color:#ef4444;background:rgba(239,68,68,.05);}

/* ── Notification rows ── */
.np-list{display:flex;flex-direction:column;}
.np-item{
  display:flex;align-items:flex-start;gap:14px;padding:16px 22px;
  border-bottom:1px solid var(--np-border);transition:background .15s;position:relative;cursor:pointer;
}
.np-item:last-child{border-bottom:none;}
.np-item:hover{background:rgba(99,102,241,.03);}
[data-theme="dark"] .np-item:hover{background:rgba(99,102,241,.06);}
.np-item.unread{background:rgba(99,102,241,.04);}
[data-theme="dark"] .np-item.unread{background:rgba(99,102,241,.08);}

.np-unread-dot{position:absolute;top:50%;left:8px;transform:translateY(-50%);width:6px;height:6px;border-radius:50%;background:#6366f1;flex-shrink:0;}

.np-icon-wrap{width:42px;height:42px;border-radius:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:20px;}
.np-icon-wrap.blue  {background:rgba(99,102,241,.1);}
.np-icon-wrap.green {background:rgba(16,185,129,.1);}
.np-icon-wrap.amber {background:rgba(245,158,11,.1);}
.np-icon-wrap.purple{background:rgba(139,92,246,.1);}
.np-icon-wrap.rose  {background:rgba(239,68,68,.08);}

.np-item-body{flex:1;min-width:0;}
.np-item-title{font-size:13.5px;font-weight:700;color:var(--np-text);margin-bottom:3px;line-height:1.4;}
.np-item-msg{font-size:12.5px;color:var(--np-muted);line-height:1.5;margin-bottom:6px;}
.np-item-meta{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
.np-item-time{font-size:11.5px;color:var(--np-subtle);font-weight:500;display:flex;align-items:center;gap:4px;}
.np-item-tag{font-size:10.5px;font-weight:700;padding:2px 9px;border-radius:6px;text-transform:capitalize;}
.np-item-tag.assignment{background:rgba(99,102,241,.1);color:#6366f1;}
.np-item-tag.achievement{background:rgba(245,158,11,.1);color:#d97706;}
.np-item-tag.streak     {background:rgba(239,68,68,.08);color:#ef4444;}
.np-item-tag.grade      {background:rgba(16,185,129,.1);color:#059669;}
.np-item-tag.social     {background:rgba(139,92,246,.1);color:#7c3aed;}
.np-item-tag.system     {background:rgba(100,116,139,.1);color:var(--np-muted);}

.np-item-right{display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex-shrink:0;}
.np-mark-btn{background:none;border:none;cursor:pointer;padding:4px;border-radius:8px;color:var(--np-subtle);transition:all .15s;display:flex;align-items:center;justify-content:center;}
.np-mark-btn:hover{background:rgba(99,102,241,.08);color:#6366f1;}
.np-unread-indicator{width:8px;height:8px;border-radius:50%;background:#6366f1;flex-shrink:0;}

/* ── Empty state ── */
.np-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:64px 24px;text-align:center;}
.np-empty-icon{width:72px;height:72px;border-radius:20px;background:rgba(99,102,241,.08);display:flex;align-items:center;justify-content:center;margin-bottom:18px;font-size:32px;}
.np-empty-title{font-size:16px;font-weight:800;color:var(--np-text);margin-bottom:6px;}
.np-empty-sub{font-size:13px;color:var(--np-muted);line-height:1.6;max-width:260px;}

/* ── Responsive ── */
@media(max-width:1100px){.np-stats{grid-template-columns:repeat(2,1fr);}}
@media(max-width:900px){
  .np-hero{margin:14px 16px 0;padding:26px 24px;}
  .np-hero-stats{display:none;}
  .np-stats{padding:16px 16px 0;gap:12px;}
  .np-body{padding:16px 16px 56px;}
}
@media(max-width:768px){
  .np-hero{margin:12px 12px 0;padding:20px 18px;border-radius:18px;}
  .np-hero-title{font-size:20px;}
  .np-stats{grid-template-columns:repeat(2,1fr);padding:14px 12px 0;}
  .np-scard{padding:16px;}
  .np-body{padding:14px 12px 56px;}
  .np-panel-head{flex-direction:column;align-items:flex-start;gap:10px;}
  .np-panel-actions{width:100%;justify-content:flex-start;}
  .np-item{padding:14px 16px;}
}
@media(max-width:600px){
  .np-hero{margin:10px 10px 0;padding:18px 16px;border-radius:16px;}
  .np-hero-title{font-size:18px;}
  .np-hero-sub{font-size:12.5px;}
  .np-stats{padding:12px 10px 0;gap:10px;}
  .np-body{padding:12px 10px 56px;}
  .np-scard-n{font-size:26px;}
  .np-tab-label{display:none;}
  .np-tab{padding:10px 14px;}
  .np-item-tag{display:none;}
  .np-btn span{display:none;}
  .np-btn{padding:7px 10px;}
}
@media(max-width:480px){
  .np-hero{margin:10px 10px 0;padding:16px 14px;border-radius:16px;}
  .np-hero-title{font-size:17px;}
  .np-stats{grid-template-columns:repeat(2,1fr);padding:10px 10px 0;gap:9px;}
  .np-scard{padding:14px;border-radius:16px;}
  .np-scard-n{font-size:24px;}
  .np-scard-icon{width:36px;height:36px;border-radius:10px;}
  .np-body{padding:12px 10px 56px;}
  .np-item{gap:10px;padding:13px 14px;}
  .np-icon-wrap{width:36px;height:36px;border-radius:10px;font-size:17px;}
  .np-item-title{font-size:13px;}
  .np-item-msg{font-size:12px;}
}
@media(max-width:360px){
  .np-hero-title{font-size:15px;}
  .np-scard-n{font-size:22px;}
  .np-scard{padding:12px;}
}
`;

// ── Notification types ────────────────────────────────────────────────────────
type NotifCategory = 'assignment' | 'achievement' | 'streak' | 'grade' | 'social' | 'system';

interface RichNotification {
  id: string;
  title: string;
  message: string;
  category: NotifCategory;
  icon: string;
  iconColor: string;
  time: string;
  read: boolean;
}

// ── Sample data ───────────────────────────────────────────────────────────────
const SAMPLE: RichNotification[] = [
  { id:'1', title:'New Assignment Posted', message:'Your teacher posted "Chapter 5 – Algebra Quiz". Due Friday at 11:59 PM.', category:'assignment', icon:'📝', iconColor:'blue',   time:'2m ago',  read:false },
  { id:'2', title:'Achievement Unlocked!', message:'You earned the "Week Warrior" badge for maintaining a 7-day study streak.', category:'achievement', icon:'🏆', iconColor:'amber',  time:'1h ago',  read:false },
  { id:'3', title:'Streak at Risk!',       message:'Study for at least 10 minutes today to keep your 14-day streak alive.', category:'streak',  icon:'🔥', iconColor:'rose',   time:'3h ago',  read:false },
  { id:'4', title:'Grade Updated',         message:'Your Science quiz has been graded — you scored 94/100. Great work!', category:'grade',  icon:'⭐', iconColor:'green',  time:'5h ago',  read:true  },
  { id:'5', title:'alex_star is now #1',   message:'Your classmate just overtook your leaderboard position. Can you reclaim it?', category:'social', icon:'👥', iconColor:'purple', time:'Yesterday', read:true  },
  { id:'6', title:'Welcome to GradeUp!',   message:'Set up your study goals and subjects to personalise your dashboard.', category:'system', icon:'👋', iconColor:'blue',   time:'2d ago',  read:true  },
];

const CATEGORY_LABELS: Record<NotifCategory, string> = {
  assignment:'Assignment', achievement:'Achievement',
  streak:'Streak', grade:'Grade', social:'Social', system:'System',
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function NotificationPage() {
  const { notifications, markAsRead, addNotification } = useNotificationStore();
  const { user } = useAuth() as any;
  const [role, setRole] = useState('student');
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [items, setItems] = useState<RichNotification[]>(SAMPLE);

  useEffect(() => { if (user?.role) setRole(user.role); }, [user]);

  // Seed store if empty
  useEffect(() => {
    if (notifications.length === 0) {
      addNotification('Welcome to GradeUp! You have a new assignment.');
    }
  }, [addNotification, notifications.length]);

  const unreadCount  = items.filter(n => !n.read).length;
  const filtered     = filter === 'all'    ? items
                     : filter === 'unread' ? items.filter(n => !n.read)
                     :                       items.filter(n => n.read);

  const handleMarkRead = (id: string) => {
    setItems(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    markAsRead(id);
  };

  const handleMarkAllRead = () => {
    setItems(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleClearRead = () => {
    setItems(prev => prev.filter(n => !n.read));
  };

  const TABS = [
    { id:'all',    icon:'🔔', label:'All',    count: items.length    },
    { id:'unread', icon:'✨', label:'Unread', count: unreadCount     },
    { id:'read',   icon:'✅', label:'Read',   count: items.length - unreadCount },
  ];

  return (
    <>
      <style>{CSS}</style>
      <div className="np-root">
        <Navigation currentRole={role} onRoleChange={setRole as any} />

        {/* Hero */}
        <div className="np-hero">
          <div className="np-hero-inner">
            <div>
              <div className="np-hero-pill"><Bell size={12} /> Notifications</div>
              <div className="np-hero-title">🔔 Notification Centre</div>
              <div className="np-hero-sub">
                Stay on top of assignments, achievements &amp; updates<br />
                {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
              </div>
            </div>
            <div className="np-hero-stats">
              {[
                { n: items.length,          l: 'Total'   },
                { n: unreadCount,           l: 'Unread'  },
                { n: items.length - unreadCount, l: 'Read' },
              ].map((s, i) => (
                <div className="np-hstat" key={i}>
                  <div className="np-hstat-n">{s.n}</div>
                  <div className="np-hstat-l">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="np-stats">
          <motion.div className="np-scard blue" style={{ animationDelay: '.05s' }}>
            <div className="np-scard-icon"><Bell size={20} color="#6366f1" /></div>
            <div className="np-scard-n">{items.length}</div>
            <div className="np-scard-l">Total Notifications</div>
            <div className="np-scard-sub">All time</div>
          </motion.div>
          <motion.div className="np-scard amber" style={{ animationDelay: '.1s' }}>
            <div className="np-scard-icon"><Zap size={20} color="#f59e0b" /></div>
            <div className="np-scard-n">{unreadCount}</div>
            <div className="np-scard-l">Unread</div>
            <div className="np-scard-sub">{unreadCount > 0 ? 'Needs attention' : 'All caught up!'}</div>
          </motion.div>
          <motion.div className="np-scard green" style={{ animationDelay: '.15s' }}>
            <div className="np-scard-icon"><CheckCheck size={20} color="#10b981" /></div>
            <div className="np-scard-n">{items.filter(n => n.read).length}</div>
            <div className="np-scard-l">Read</div>
            <div className="np-scard-sub">Reviewed</div>
          </motion.div>
          <motion.div className="np-scard purple" style={{ animationDelay: '.2s' }}>
            <div className="np-scard-icon"><Award size={20} color="#8b5cf6" /></div>
            <div className="np-scard-n">{items.filter(n => n.category === 'achievement').length}</div>
            <div className="np-scard-l">Achievements</div>
            <div className="np-scard-sub">Earned so far</div>
          </motion.div>
        </div>

        {/* Body */}
        <div className="np-body">

          {/* Filter Tabs */}
          <div className="np-tabs">
            {TABS.map(t => (
              <button
                key={t.id}
                className={`np-tab${filter === t.id ? ' on' : ''}`}
                onClick={() => setFilter(t.id as any)}
              >
                <span>{t.icon}</span>
                <span className="np-tab-label">{t.label}</span>
                <span className="np-tab-badge">{t.count}</span>
              </button>
            ))}
          </div>

          {/* Notification Panel */}
          <div className="np-panel">
            <div className="np-panel-head">
              <div>
                <div className="np-panel-title">
                  <Bell size={16} color="#6366f1" />
                  {filter === 'all' ? 'All Notifications' : filter === 'unread' ? 'Unread' : 'Read'}
                </div>
                <div className="np-panel-sub">{filtered.length} notification{filtered.length !== 1 ? 's' : ''}</div>
              </div>
              <div className="np-panel-actions">
                {unreadCount > 0 && (
                  <button className="np-btn" onClick={handleMarkAllRead}>
                    <CheckCheck size={13} />
                    <span>Mark all read</span>
                  </button>
                )}
                <button className="np-btn danger" onClick={handleClearRead}>
                  <Trash2 size={13} />
                  <span>Clear read</span>
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={filter}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: .2 }}
              >
                {filtered.length === 0 ? (
                  <div className="np-empty">
                    <div className="np-empty-icon"><BellOff size={32} color="#6366f1" /></div>
                    <div className="np-empty-title">Nothing here</div>
                    <div className="np-empty-sub">
                      {filter === 'unread' ? "You're all caught up — no unread notifications." : 'No notifications to display.'}
                    </div>
                  </div>
                ) : (
                  <div className="np-list">
                    {filtered.map((n, i) => (
                      <motion.div
                        key={n.id}
                        className={`np-item${n.read ? '' : ' unread'}`}
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * .04 }}
                        onClick={() => !n.read && handleMarkRead(n.id)}
                      >
                        {/* Unread left accent */}
                        {!n.read && <div className="np-unread-dot" />}

                        {/* Icon bubble */}
                        <div className={`np-icon-wrap ${n.iconColor}`}>{n.icon}</div>

                        {/* Content */}
                        <div className="np-item-body">
                          <div className="np-item-title">{n.title}</div>
                          <div className="np-item-msg">{n.message}</div>
                          <div className="np-item-meta">
                            <span className="np-item-time">
                              <Clock size={11} />{n.time}
                            </span>
                            <span className={`np-item-tag ${n.category}`}>
                              {CATEGORY_LABELS[n.category]}
                            </span>
                          </div>
                        </div>

                        {/* Right: unread dot / mark-read btn */}
                        <div className="np-item-right">
                          {!n.read ? (
                            <>
                              <div className="np-unread-indicator" />
                              <button
                                className="np-mark-btn"
                                onClick={e => { e.stopPropagation(); handleMarkRead(n.id); }}
                                title="Mark as read"
                              >
                                <CheckCheck size={15} />
                              </button>
                            </>
                          ) : (
                            <ChevronRight size={15} color="#94a3b8" />
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

        </div>
      </div>
    </>
  );
}