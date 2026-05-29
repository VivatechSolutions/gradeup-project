import React, { useState, useEffect, useRef } from "react";
import { Button } from "../components/ui/button";
import { ScrollArea } from "../components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../components/ui/tooltip";
import { motion, AnimatePresence } from "framer-motion";
import {
  Hash,
  Bot,
  Send,
  Sun,
  Moon,
  Menu,
  Users,
  X,
  AlertTriangle,
  GraduationCap,
  Skull,
  Trophy,
  Star,
  BookOpen,
  UserPlus,
  Atom,
  Code,
  Calculator,
  Globe,
  Trash2,
  Edit3,
  FileUp,
  FileText,
  Download,
  Smile,
  MoreVertical,
  BarChart3,
  Library,
  Pin,
  PlusCircle,
  Settings,
  MessageSquare,
  Shield,
  Zap,
  CheckCircle2,
  Search,
  Minimize2,
  MessageCircle,
  ChevronDown,
  Mail,
  Video,
  Phone,
  MapPin,
  Crown,
  ChevronLeft,
  Hash as HashIcon,
} from "lucide-react";
import { useTheme } from "../hooks/use-theme";
import { cn } from "../lib/utils";
import { useMediaQuery } from "../hooks/use-media-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { useAuth } from "../hooks/use-auth";
import Navigation from "../components/navigation";
import { useMeetingSystem } from "./MeetingModalSystem";
/* ─────────────────────────────────────────────────────────────
   CSS — matches dashboard design tokens exactly
   #6366f1 accent · #8b5cf6 purple · #ec4899 pink
   #10b981 green · #f59e0b amber
   bg: #f8fafc · surface: #fff · text: #0f172a
   muted: #64748b · subtle: #94a3b8
   border: rgba(0,0,0,.06) · card-shadow: 0 2px 12px rgba(0,0,0,.05)
   Font: Plus Jakarta Sans 400-800
───────────────────────────────────────────────────────────── */
export const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}

/* ── THEME VARIABLES ── */
:root {
  --cm-bg:           #f8fafc;
  --cm-surface:      #ffffff;
  --cm-surface2:     #f8fafc;
  --cm-text:         #0f172a;
  --cm-text2:        #374151;
  --cm-muted:        #64748b;
  --cm-subtle:       #94a3b8;
  --cm-border:       rgba(0,0,0,.06);
  --cm-border2:      rgba(0,0,0,.08);
  --cm-bubble-their: #f8fafc;
  --cm-bubble-txt:   #374151;
  --cm-input-bg:     #f8fafc;
  --cm-input-focus:  #ffffff;
  --cm-rank-bg:      #f8fafc;
  --cm-typing-bg:    #f8fafc;
  --cm-bot-bg:       #ffffff;
  --cm-bot-bubble:   #f8fafc;
  --cm-bot-input:    #f8fafc;
  --cm-act-btn:      #ffffff;
  --cm-reaction-bg:  #ffffff;
  --cm-member-hover: #f8fafc;
  --cm-drawer-bg:    #ffffff;
  --cm-srv-btn:      #f8fafc;
  --cm-ch-text:      #64748b;
  --cm-ch-name:      #0f172a;
  --cm-head-sep:     #e2e8f0;
  --cm-settings-bg:  #ffffff;
  --cm-pinned-bg:    rgba(99,102,241,.05);
  --cm-pinned-bdr:   rgba(99,102,241,.10);
  --cm-head-bg:      #ffffff;
  --cm-input-bar-bg: #ffffff;
  --cm-drop-shadow:  0 2px 12px rgba(0,0,0,.05);
}

[data-theme="dark"] {
  --cm-bg:           #0b1120;
  --cm-surface:      #1e293b;
  --cm-surface2:     #0f172a;
  --cm-text:         #f1f5f9;
  --cm-text2:        #cbd5e1;
  --cm-muted:        #94a3b8;
  --cm-subtle:       #64748b;
  --cm-border:       rgba(255,255,255,.07);
  --cm-border2:      rgba(255,255,255,.10);
  --cm-bubble-their: #0f172a;
  --cm-bubble-txt:   #f1f5f9;
  --cm-input-bg:     #0f172a;
  --cm-input-focus:  #1e293b;
  --cm-rank-bg:      #0f172a;
  --cm-typing-bg:    #0f172a;
  --cm-bot-bg:       #1e293b;
  --cm-bot-bubble:   #0f172a;
  --cm-bot-input:    #0f172a;
  --cm-act-btn:      #334155;
  --cm-reaction-bg:  #334155;
  --cm-member-hover: #0f172a;
  --cm-drawer-bg:    #0b1120;
  --cm-srv-btn:      #0f172a;
  --cm-ch-text:      #94a3b8;
  --cm-ch-name:      #f1f5f9;
  --cm-head-sep:     #334155;
  --cm-settings-bg:  #1e293b;
  --cm-pinned-bg:    rgba(99,102,241,.10);
  --cm-pinned-bdr:   rgba(99,102,241,.18);
  --cm-head-bg:      #1e293b;
  --cm-input-bar-bg: #1e293b;
  --cm-drop-shadow:  0 2px 12px rgba(0,0,0,.35);
}

.cm-root{
  font-family:'Plus Jakarta Sans',system-ui,sans-serif;
  display:flex; flex-direction:column;
  height:calc(100dvh - 64px);
  background:var(--cm-bg); color:var(--cm-text); overflow:hidden;
  transition:background .3s,color .3s;
}

/* ── HERO bar ── */
.cm-hero{
  margin:16px 20px 0; border-radius:20px; padding:14px 24px;
  background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#ec4899 100%);
  position:relative; overflow:hidden; color:#fff; flex-shrink:0;
  box-shadow:0 6px 24px rgba(99,102,241,.26);
  animation:heroIn .5s cubic-bezier(.34,1.56,.64,1) both;
}
@keyframes heroIn{from{opacity:0;transform:translateY(-10px) scale(.98)}to{opacity:1;transform:none}}
.cm-hero::before{content:'';position:absolute;top:-50px;right:-50px;width:160px;height:160px;border-radius:50%;background:rgba(255,255,255,.1);pointer-events:none;}
.cm-hero::after{content:'';position:absolute;bottom:-40px;left:25%;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,.07);pointer-events:none;}
.cm-hero-inner{position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;}
.cm-hero-left{display:flex;align-items:center;gap:12px;}
.cm-hero-pill{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:20px;margin-bottom:5px;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.28);font-size:10.5px;font-weight:700;color:#fff;}
.cm-hero-title{font-size:clamp(15px,2vw,20px);font-weight:800;color:#fff;margin-bottom:2px;letter-spacing:-.2px;line-height:1.2;}
.cm-hero-sub{font-size:11.5px;color:rgba(255,255,255,.68);line-height:1.4;}
.cm-hero-stats{display:flex;gap:7px;flex-shrink:0;}
.cm-hstat{text-align:center;padding:7px 12px;border-radius:11px;min-width:52px;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.2);backdrop-filter:blur(8px);}
.cm-hstat-n{font-size:16px;font-weight:800;color:#fff;line-height:1;}
.cm-hstat-l{font-size:9px;color:rgba(255,255,255,.62);margin-top:1px;}

/* ── BODY ── */
.cm-body{flex:1;display:flex;overflow:hidden;margin:12px 20px 16px;gap:12px;min-height:0;}

/* ── LEFT SIDEBAR ── */
.cm-sidebar{
  width:260px; flex-shrink:0; display:flex; flex-direction:column;
  background:var(--cm-surface); border-radius:20px; border:1px solid var(--cm-border);
  box-shadow:var(--cm-drop-shadow); overflow:hidden;
  animation:cardIn .5s cubic-bezier(.34,1.56,.64,1) both;
  transition:background .3s,border-color .3s;
}
@keyframes cardIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}

.cm-server-rail{display:flex;flex-direction:row;gap:6px;padding:10px 12px;border-bottom:1px solid var(--cm-border);flex-shrink:0;overflow-x:auto;scrollbar-width:none;}
.cm-server-rail::-webkit-scrollbar{display:none;}
.cm-srv-btn{
  width:34px;height:34px;border-radius:10px;flex-shrink:0;
  display:flex;align-items:center;justify-content:center;font-size:16px;
  border:none;cursor:pointer;transition:all .18s;
  background:var(--cm-srv-btn);color:var(--cm-muted);
}
.cm-srv-btn:hover{transform:scale(1.08);background:rgba(99,102,241,.1);}
.cm-srv-btn.active{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;box-shadow:0 3px 10px rgba(99,102,241,.35);}
.cm-srv-add{width:34px;height:34px;border-radius:10px;background:rgba(16,185,129,.1);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#10b981;transition:all .18s;flex-shrink:0;}
.cm-srv-add:hover{background:rgba(16,185,129,.2);transform:scale(1.06);}

.cm-rank{margin:10px;padding:10px 12px;background:var(--cm-rank-bg);border:1px solid var(--cm-border);border-radius:14px;flex-shrink:0;transition:background .3s,border-color .3s;}
.cm-rank-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;}
.cm-rank-title{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;}
.cm-rank-pts{font-size:10px;color:var(--cm-subtle);font-weight:600;}
.cm-rank-bar{height:4px;background:var(--cm-border2);border-radius:4px;overflow:hidden;}
.cm-rank-fill{height:100%;border-radius:4px;background:linear-gradient(90deg,#6366f1,#8b5cf6);transition:width .6s;}

.cm-ch-header{display:flex;align-items:center;justify-content:space-between;padding:10px 12px 4px;flex-shrink:0;border-bottom:0 solid var(--cm-border);}
.cm-ch-label{font-size:9.5px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;color:var(--cm-subtle);}
.cm-channels-scroll{flex:1;overflow-y:auto;padding:0 8px 8px;scrollbar-width:thin;scrollbar-color:rgba(99,102,241,.2) transparent;}
.cm-ch-btn{
  display:flex;align-items:center;gap:8px;width:100%;padding:7px 10px;border-radius:10px;
  border:1px solid transparent;background:none;cursor:pointer;font-family:inherit;
  font-size:12.5px;font-weight:500;color:var(--cm-ch-text);transition:all .15s;text-align:left;margin:1px 0;
}
.cm-ch-btn:hover{background:rgba(99,102,241,.07);color:var(--cm-text2);}
.cm-ch-btn.active{background:linear-gradient(135deg,rgba(99,102,241,.12),rgba(139,92,246,.07));color:#4f46e5;font-weight:700;border-color:rgba(99,102,241,.18);}
[data-theme="dark"] .cm-ch-btn.active{color:#a5b4fc;border-color:rgba(99,102,241,.25);}
.cm-ch-dot{margin-left:auto;width:5px;height:5px;border-radius:50%;background:#6366f1;box-shadow:0 0 6px rgba(99,102,241,.6);flex-shrink:0;}
.cm-repo-btn{margin:8px;padding:9px 12px;border-radius:12px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;cursor:pointer;font-family:inherit;font-size:12px;font-weight:700;display:flex;align-items:center;gap:7px;box-shadow:0 3px 10px rgba(99,102,241,.28);transition:all .2s;flex-shrink:0;}
.cm-repo-btn:hover{transform:translateY(-1px);box-shadow:0 5px 16px rgba(99,102,241,.38);}

/* ── MAIN CHAT AREA ── */
.cm-chat{
  flex:1;display:flex;flex-direction:column;
  background:var(--cm-surface);border-radius:20px;border:1px solid var(--cm-border);
  box-shadow:var(--cm-drop-shadow);overflow:hidden;min-width:0;
  animation:cardIn .5s .05s cubic-bezier(.34,1.56,.64,1) both;
  transition:background .3s,border-color .3s;
}
.cm-sessions{padding:10px 12px;border-bottom:1px solid var(--cm-border);background:linear-gradient(135deg,rgba(99,102,241,.06),rgba(16,185,129,.06));display:flex;gap:8px;overflow-x:auto;flex-shrink:0}
.cm-session-card{min-width:230px;max-width:280px;border:1px solid var(--cm-border2);background:var(--cm-surface);border-radius:12px;padding:10px;display:flex;flex-direction:column;gap:7px;box-shadow:0 2px 10px rgba(0,0,0,.04)}
.cm-session-top{display:flex;align-items:center;gap:8px;font-size:11px;font-weight:800;color:#6366f1;text-transform:uppercase;letter-spacing:.04em}
.cm-session-title{font-size:12.5px;font-weight:800;color:var(--cm-text);line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cm-session-meta{font-size:11px;color:var(--cm-muted);line-height:1.45}
.cm-session-actions{display:flex;gap:6px}
.cm-session-actions button{flex:1;border:1px solid var(--cm-border2);background:var(--cm-surface2);border-radius:8px;padding:6px 8px;font-size:11px;font-weight:800;color:var(--cm-text2);cursor:pointer}
.cm-session-actions button:first-child{background:rgba(16,185,129,.09);border-color:rgba(16,185,129,.24);color:#059669}

.cm-chat-head{
  height:54px;padding:0 14px;display:flex;align-items:center;gap:9px;
  border-bottom:1px solid var(--cm-border);flex-shrink:0;
  background:var(--cm-head-bg);transition:background .3s,border-color .3s;
}
.cm-ch-icon{color:var(--cm-subtle);flex-shrink:0;}
.cm-ch-name{font-size:13.5px;font-weight:800;color:var(--cm-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.cm-ch-topic{font-size:11.5px;color:var(--cm-subtle);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;}
.cm-head-sep{width:1px;height:14px;background:var(--cm-head-sep);flex-shrink:0;}
.cm-head-actions{display:flex;align-items:center;gap:3px;flex-shrink:0;}
.cm-hbtn{width:30px;height:30px;border-radius:9px;border:none;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--cm-subtle);transition:all .15s;}
.cm-hbtn:hover{background:rgba(99,102,241,.08);color:#6366f1;}
.cm-hbtn.on{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;}

.cm-search-bar{padding:8px 14px;border-bottom:1px solid var(--cm-border);flex-shrink:0;}
.cm-search-inner{display:flex;align-items:center;gap:8px;padding:7px 12px;border-radius:12px;background:var(--cm-input-bg);border:1.5px solid var(--cm-border2);transition:all .2s;}
.cm-search-inner:focus-within{border-color:#6366f1;background:var(--cm-input-focus);box-shadow:0 0 0 3px rgba(99,102,241,.1);}
.cm-search-input{flex:1;border:none;background:transparent;font-family:inherit;font-size:13px;color:var(--cm-text);outline:none;}
.cm-search-input::placeholder{color:var(--cm-subtle);}

.cm-pinned{padding:7px 14px;background:var(--cm-pinned-bg);border-bottom:1px solid var(--cm-pinned-bdr);display:flex;align-items:center;gap:7px;flex-shrink:0;transition:background .3s;}
.cm-pinned-text{font-size:12px;color:#4f46e5;font-weight:500;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
[data-theme="dark"] .cm-pinned-text{color:#a5b4fc;}

.cm-msgs-area{flex:1;min-height:0;}
.cm-msgs-inner{padding:16px 14px;display:flex;flex-direction:column;gap:14px;}

.cm-msg{display:flex;gap:9px;align-items:flex-start;overflow:visible;}
.cm-msg.mine{flex-direction:row-reverse;}
.cm-msg-body{display:flex;flex-direction:column;gap:3px;max-width:72%;position:relative;}
.cm-msg.mine .cm-msg-body{align-items:flex-end;}
.cm-msg-meta{display:flex;align-items:center;gap:5px;flex-wrap:wrap;}
.cm-msg.mine .cm-msg-meta{flex-direction:row-reverse;}
.cm-msg-name{font-size:11px;font-weight:700;color:var(--cm-text2);}
.cm-msg-name.ai{color:#6366f1;}
[data-theme="dark"] .cm-msg-name.ai{color:#a5b4fc;}
.cm-msg-time{font-size:10px;color:var(--cm-subtle);}
.cm-badge{font-size:9px;font-weight:700;padding:1px 6px;border-radius:10px;text-transform:uppercase;letter-spacing:.05em;}
.cm-badge-admin {background:rgba(99,102,241,.1);color:#6366f1;}
.cm-badge-tutor {background:rgba(16,185,129,.1);color:#059669;}
.cm-badge-leader{background:rgba(245,158,11,.1);color:#d97706;}
.cm-badge-ai    {background:rgba(16,185,129,.1);color:#059669;}

.cm-bubble{padding:9px 13px;border-radius:16px;font-size:13px;line-height:1.6;position:relative;}
.cm-bubble.yours{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border-radius:16px 16px 4px 16px;box-shadow:0 3px 10px rgba(99,102,241,.24);}
.cm-bubble.theirs{background:var(--cm-bubble-their);color:var(--cm-bubble-txt);border:1px solid var(--cm-border);border-radius:16px 16px 16px 4px;transition:background .3s,color .3s,border-color .3s;}
.cm-bubble.ai-bubble{background:linear-gradient(135deg,rgba(16,185,129,.06),rgba(20,184,166,.06));color:var(--cm-text);border:1px solid rgba(16,185,129,.14);border-radius:16px 16px 16px 4px;transition:color .3s;}
[data-theme="dark"] .cm-bubble.ai-bubble{background:linear-gradient(135deg,rgba(16,185,129,.1),rgba(20,184,166,.1));border-color:rgba(16,185,129,.2);}

.cm-file-bubble{display:flex;align-items:center;gap:9px;padding:9px 13px;border-radius:13px;border:1px solid var(--cm-border);background:var(--cm-input-bg);transition:border .15s,background .3s;}
.cm-file-bubble:hover{border-color:#c7d2fe;}
.cm-file-icon{width:32px;height:32px;border-radius:9px;background:rgba(99,102,241,.1);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.cm-poll-bubble{padding:12px 14px;border-radius:16px;background:linear-gradient(135deg,rgba(99,102,241,.04),rgba(139,92,246,.04));border:1px solid rgba(99,102,241,.12);width:240px;}
[data-theme="dark"] .cm-poll-bubble{background:linear-gradient(135deg,rgba(99,102,241,.10),rgba(139,92,246,.08));border-color:rgba(99,102,241,.20);}
.cm-poll-q{font-size:12px;font-weight:700;color:#4f46e5;margin-bottom:9px;display:flex;align-items:center;gap:5px;}
[data-theme="dark"] .cm-poll-q{color:#a5b4fc;}
.cm-poll-opt{width:100%;padding:6px 11px;border-radius:9px;margin-bottom:5px;background:var(--cm-surface);border:1.5px solid var(--cm-border2);cursor:pointer;font-family:inherit;font-size:11.5px;font-weight:500;display:flex;justify-content:space-between;transition:all .15s;color:var(--cm-text2);text-align:left;}
.cm-poll-opt:hover{border-color:#6366f1;background:rgba(99,102,241,.04);color:#4338ca;}

/* ── Hover actions ── */
.cm-msg-actions{
  opacity:0; pointer-events:none;
  position:absolute; top:26px;
  gap:3px; align-items:center; display:flex;
  transition:opacity .15s;
  padding:4px;
  z-index:10;
}
.cm-msg:not(.mine) .cm-msg-body .cm-msg-actions,
.cm-msg:not(.mine) .cm-msg-actions{left:calc(100% + 4px);padding-left:6px;}
.cm-msg.mine .cm-msg-body .cm-msg-actions,
.cm-msg.mine .cm-msg-actions{right:calc(100% + 4px);padding-right:6px;}
.cm-msg:hover .cm-msg-actions,
.cm-msg-actions:hover{opacity:1;pointer-events:auto;}
.cm-act-btn{
  width:28px;height:28px;border-radius:8px;
  border:1px solid var(--cm-border2);
  background:var(--cm-act-btn);
  box-shadow:0 2px 8px rgba(0,0,0,.08);
  display:flex;align-items:center;justify-content:center;
  cursor:pointer;color:var(--cm-subtle);transition:all .15s;flex-shrink:0;
}
.cm-act-btn:hover{border-color:#c7d2fe;color:#6366f1;background:var(--cm-surface);}
[data-theme="dark"] .cm-act-btn:hover{background:rgba(99,102,241,.15);color:#a5b4fc;border-color:#818cf8;}

.cm-reaction{
  display:inline-flex;align-items:center;gap:3px;
  margin-top:4px;
  background:var(--cm-reaction-bg);border:1px solid var(--cm-border2);
  border-radius:20px;padding:2px 7px;font-size:12px;
  box-shadow:0 2px 6px rgba(0,0,0,.07);
  cursor:pointer;transition:all .15s;user-select:none;
  width:fit-content;
}
.cm-reaction:hover{border-color:#c7d2fe;background:var(--cm-surface);}
.cm-reaction-wrap{margin-top:2px;}

.cm-typing{display:flex;align-items:center;gap:9px;padding:0 14px;}
.cm-typing-dots{display:flex;gap:3px;padding:9px 13px;background:var(--cm-typing-bg);border-radius:16px 16px 16px 4px;border:1px solid var(--cm-border);transition:background .3s;}
.cm-typing-dot{width:5px;height:5px;border-radius:50%;background:var(--cm-subtle);}

.cm-input-bar{padding:10px 12px;border-top:1px solid var(--cm-border);flex-shrink:0;background:var(--cm-input-bar-bg);transition:background .3s,border-color .3s;}
.cm-edit-tag{display:flex;align-items:center;gap:5px;font-size:11px;font-weight:600;color:#d97706;background:rgba(245,158,11,.07);border-radius:7px;padding:4px 9px;margin-bottom:5px;}
.cm-input-row{display:flex;align-items:center;gap:5px;padding:7px 10px;border-radius:13px;border:1.5px solid var(--cm-border2);background:var(--cm-input-bg);transition:all .2s;}
.cm-input-row:focus-within{border-color:#6366f1;background:var(--cm-input-focus);box-shadow:0 0 0 3px rgba(99,102,241,.1);}
.cm-input-row.banned{border-color:#fca5a5;background:rgba(239,68,68,.04);}
.cm-input-tool{width:26px;height:26px;border-radius:7px;border:none;background:none;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--cm-subtle);transition:all .15s;flex-shrink:0;}
.cm-input-tool:hover{background:rgba(99,102,241,.08);color:#6366f1;}
.cm-input-text{flex:1;background:none;border:none;outline:none;font-family:inherit;font-size:13px;color:var(--cm-text);min-width:0;}
.cm-input-text::placeholder{color:var(--cm-subtle);}
.cm-input-send{width:30px;height:30px;border-radius:9px;flex-shrink:0;background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#fff;transition:all .2s;box-shadow:0 3px 8px rgba(99,102,241,.28);}
.cm-input-send:hover{transform:scale(1.06);box-shadow:0 4px 12px rgba(99,102,241,.38);}
.cm-input-send:disabled{opacity:.4;cursor:not-allowed;transform:none;}
.cm-view-only{display:flex;align-items:center;justify-content:center;gap:7px;padding:10px;border-radius:11px;background:var(--cm-input-bg);border:1.5px dashed var(--cm-border2);font-size:12px;color:var(--cm-subtle);font-weight:500;}
.cm-footer-note{font-size:9.5px;color:var(--cm-subtle);text-align:center;margin-top:4px;opacity:.6;}

/* ── MEMBERS PANEL ── */
.cm-members{
  width:200px;flex-shrink:0;display:flex;flex-direction:column;
  background:var(--cm-surface);border-radius:20px;border:1px solid var(--cm-border);
  box-shadow:var(--cm-drop-shadow);overflow:hidden;
  animation:cardIn .5s .1s cubic-bezier(.34,1.56,.64,1) both;
  transition:background .3s,border-color .3s;
}
.cm-members-head{padding:12px 12px 8px;border-bottom:1px solid var(--cm-border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;}
.cm-members-title{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:var(--cm-muted);}
.cm-online-badge{font-size:9.5px;font-weight:700;padding:2px 7px;border-radius:20px;background:rgba(16,185,129,.1);color:#059669;}
.cm-status-lbl{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--cm-subtle);padding:6px 10px 3px;}
.cm-member-row{display:flex;align-items:center;gap:7px;padding:6px 8px;border-radius:9px;cursor:pointer;transition:background .15s;margin:1px 5px;}
.cm-member-row:hover{background:var(--cm-member-hover);}
.cm-mem-name{font-size:11.5px;font-weight:500;color:var(--cm-text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.cm-mem-role{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;}
.cm-role-admin {color:#6366f1;}
.cm-role-mod   {color:#10b981;}
.cm-role-tutor {color:#3b82f6;}
.cm-role-leader{color:#f59e0b;}
.cm-role-member{color:var(--cm-subtle);}

/* ── BAN OVERLAY ── */
.cm-ban-overlay{position:absolute;inset:0;background:rgba(0,0,0,.92);backdrop-filter:blur(20px);z-index:200;display:flex;align-items:center;justify-content:center;padding:32px;border-radius:20px;}

/* ── FLOATING CHATBOT ── */
.cm-fab{position:fixed;bottom:80px;right:16px;z-index:100;display:flex;flex-direction:column;align-items:flex-end;gap:10px;}
@media(min-width:769px){.cm-fab{bottom:24px;right:20px;}}
.cm-fab-btn{width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#fff;box-shadow:0 6px 20px rgba(99,102,241,.38);transition:all .2s;position:relative;}
.cm-fab-btn:hover{transform:scale(1.06);}
.cm-fab-pulse{position:absolute;top:-2px;right:-2px;width:12px;height:12px;border-radius:50%;background:#22c55e;border:2px solid var(--cm-bg);}
.cm-bot-box{width:300px;border-radius:18px;overflow:hidden;box-shadow:0 16px 48px rgba(0,0,0,.16);border:1px solid var(--cm-border);background:var(--cm-bot-bg);transform-origin:bottom right;transition:background .3s,border-color .3s;}
.cm-bot-head{padding:12px 14px;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;gap:9px;}
.cm-bot-msgs{height:180px;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:7px;scrollbar-width:thin;}
.cm-bot-bubble{max-width:80%;padding:7px 11px;border-radius:12px;font-size:12px;line-height:1.5;}
.cm-bot-bubble.user{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border-radius:12px 12px 4px 12px;align-self:flex-end;}
.cm-bot-bubble.ai{background:var(--cm-bot-bubble);color:var(--cm-text);border:1px solid var(--cm-border);border-radius:12px 12px 12px 4px;transition:background .3s,color .3s;}
.cm-bot-input-row{padding:9px;border-top:1px solid var(--cm-border);display:flex;gap:7px;}
.cm-bot-input{flex:1;height:34px;border-radius:9px;padding:0 11px;border:1.5px solid var(--cm-border2);font-family:inherit;font-size:12.5px;outline:none;transition:border .2s,background .3s;background:var(--cm-bot-input);color:var(--cm-text);}
.cm-bot-input:focus{border-color:#6366f1;background:var(--cm-input-focus);}
.cm-bot-send{width:34px;height:34px;border-radius:9px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#fff;transition:all .2s;}
.cm-bot-send:hover{transform:scale(1.06);}

/* ── PAGE LOADER ── */
.cm-loader{position:fixed;inset:0;background:var(--cm-bg);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;z-index:999;transition:background .3s;}
.cm-loader-icon{width:60px;height:60px;border-radius:18px;position:relative;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;box-shadow:0 10px 28px rgba(99,102,241,.35);}
.cm-loader-dots{display:flex;gap:5px;}
.cm-loader-dot{width:5px;height:5px;border-radius:50%;background:#818cf8;}

/* ── MOBILE DRAWER OVERLAY ── */
.cm-drawer-overlay{position:fixed;inset:0;background:rgba(0,0,0,.4);backdrop-filter:blur(3px);z-index:300;}
.cm-drawer{position:fixed;left:0;top:0;bottom:0;z-index:310;width:280px;display:flex;flex-direction:column;background:var(--cm-surface);box-shadow:6px 0 32px rgba(0,0,0,.16);transition:background .3s;}
.cm-drawer-right{left:auto;right:0;box-shadow:-6px 0 32px rgba(0,0,0,.16);}
.cm-drawer-head{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--cm-border);flex-shrink:0;}
.cm-drawer-title{font-size:14px;font-weight:800;color:var(--cm-text);}
.cm-drawer-close{width:30px;height:30px;border-radius:9px;border:none;background:rgba(0,0,0,.05);cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--cm-muted);transition:all .15s;}
[data-theme="dark"] .cm-drawer-close{background:rgba(255,255,255,.05);}
.cm-drawer-close:hover{background:rgba(239,68,68,.08);color:#ef4444;}

/* ── MODAL & POPOVER ── */
[data-radix-popper-content-wrapper]{z-index:500!important;}
.cm-root [role="dialog"] > div,
[data-radix-dialog-content]{
  background:var(--cm-surface)!important;
  border:1px solid var(--cm-border2)!important;
  box-shadow:0 24px 64px rgba(0,0,0,.18)!important;
}
[data-theme="dark"] .cm-root [role="dialog"] > div,
[data-theme="dark"] [data-radix-dialog-content]{
  background:#1e293b!important;
  border-color:rgba(255,255,255,.1)!important;
  box-shadow:0 24px 64px rgba(0,0,0,.5)!important;
}
[data-radix-popper-content-wrapper] > div{
  background:var(--cm-surface)!important;
  border:1px solid var(--cm-border2)!important;
  box-shadow:0 8px 28px rgba(0,0,0,.14)!important;
  border-radius:14px!important;
}
[data-theme="dark"] [data-radix-popper-content-wrapper] > div{
  background:#1e293b!important;
  border-color:rgba(255,255,255,.1)!important;
}
[data-radix-dialog-overlay]{background:rgba(0,0,0,.5)!important;backdrop-filter:blur(4px)!important;}

/* ── SIDEBAR SERVER NAME ── */
.cm-server-name-wrap{padding:10px 12px 4px;border-bottom:1px solid var(--cm-border);flex-shrink:0;}
.cm-server-name{font-size:13px;font-weight:800;color:var(--cm-text);}
.cm-server-cat{font-size:10.5px;color:var(--cm-subtle);margin-top:1px;}

/* ── SETTINGS PANEL (inline slide-over) ── */
.cm-settings-panel{background:var(--cm-settings-bg);border-left:1px solid var(--cm-border);transition:background .3s,border-color .3s;}
.cm-settings-panel .cm-stat-item{background:var(--cm-surface2);transition:background .3s;}
.cm-settings-panel .cm-stat-label{color:var(--cm-text);}
.cm-settings-panel .cm-stat-val{color:var(--cm-text);}

@media(max-width:1280px){.cm-members{display:none;}}
@media(max-width:1024px){.cm-sidebar{display:none;}.cm-body{margin:10px 14px 12px;}}
@media(max-width:768px){
  .cm-hero{margin:10px 12px 0;padding:12px 16px;border-radius:16px;}
  .cm-hero-stats{display:none;}
  .cm-body{margin:8px 10px 10px;}
  .cm-chat{border-radius:16px;}
  .cm-msgs-inner{padding:12px 10px;gap:12px;}
  .cm-chat-head{height:50px;padding:0 10px;gap:7px;}
  .cm-input-bar{padding:8px 10px;}
  .cm-bubble{font-size:12.5px;padding:8px 11px;}
}
@media(max-width:480px){
  .cm-hero{margin:8px 8px 0;padding:10px 12px;border-radius:13px;}
  .cm-hero-title{font-size:14px;}
  .cm-body{margin:6px 8px 8px;}
  .cm-chat{border-radius:13px;}
  .cm-msg-body{max-width:82%;}
  .cm-poll-bubble{width:200px;}
}
`;

/* ── helpers ── */
const FORBIDDEN = [
  "fuck",
  "porn",
  "adult",
  "sex",
  "gf",
  "bf",
  "love you",
  "crush",
  "kiss",
  "bitch",
  "asshole",
  "shit",
  "nude",
  "honey",
  "darling",
  "sexy",
];
const SCHOOL_GRADES = [
  "Grade 6",
  "Grade 7",
  "Grade 8",
  "Grade 9",
  "Grade 10",
  "Grade 11",
  "Grade 12",
  "University Year 1",
  "University Year 2",
  "University Year 3",
  "University Year 4",
];
const SUBJECTS_LIST = [
  "Mathematics",
  "Science",
  "Physics",
  "Chemistry",
  "Biology",
  "English",
  "History",
  "Geography",
  "Computer Science",
  "Economics",
  "Literature",
  "Sociology",
];
const ROLES = ["Member", "Moderator", "Admin", "Tutor", "Student Leader"];
const COMMUNITY_SESSIONS_KEY = "gradeup_community_sessions_v1";
const SERVER_CATS = [
  "Science & Technology",
  "Arts & Humanities",
  "Mathematics",
  "Languages",
  "Social Sciences",
  "General Study",
];
const SERVER_ICONS = [
  "⚗",
  "📜",
  "⌨",
  "🧬",
  "📐",
  "🌍",
  "📚",
  "🔬",
  "⚛",
  "💡",
  "🎓",
  "🔭",
];
const AV_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#0ea5e9",
  "#10b981",
  "#f43f5e",
  "#f59e0b",
  "#ec4899",
  "#14b8a6",
];
const avColor = (n: string) => AV_COLORS[n.charCodeAt(0) % AV_COLORS.length];
const avInit = (n: string) =>
  n
    .split(/[_\s]/)
    .map((w: string) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

const getSuitableIcon = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes("math") || n.includes("calc")) return "🔢";
  if (n.includes("science") || n.includes("physics") || n.includes("chem"))
    return "⚗";
  if (n.includes("code") || n.includes("dev") || n.includes("computer"))
    return "💻";
  if (n.includes("history") || n.includes("geo")) return "🌍";
  if (n.includes("english") || n.includes("lit")) return "📖";
  return "#";
};

const UserAvatar = ({
  name,
  status,
  size = 32,
}: {
  name: string;
  status?: string;
  size?: number;
}) => (
  <div
    style={{ position: "relative", flexShrink: 0, width: size, height: size }}
  >
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: avColor(name),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontWeight: 700,
        fontSize: size * 0.34,
        fontFamily: "Plus Jakarta Sans,system-ui,sans-serif",
      }}
    >
      {avInit(name)}
    </div>
    {status && (
      <span
        style={{
          position: "absolute",
          bottom: -1,
          right: -1,
          width: size * 0.3,
          height: size * 0.3,
          borderRadius: "50%",
          border: "2px solid #fff",
          background: status === "Online" ? "#22c55e" : "#f59e0b",
        }}
      />
    )}
  </div>
);

/* ── initial data ── */
const INIT = {
  isAdmin: true,
  servers: [
    {
      id: "s1",
      name: "Science Academy",
      icon: "⚗",
      description: "Advanced physics and scientific research hub.",
      category: "Science & Technology",
      memberCount: 142,
      isPrivate: false,
    },
    {
      id: "s2",
      name: "History Lab",
      icon: "📜",
      description: "Exploring ancient civilizations.",
      category: "Arts & Humanities",
      memberCount: 87,
      isPrivate: false,
    },
    {
      id: "s3",
      name: "Code Guild",
      icon: "⌨",
      description: "Engineering and software development.",
      category: "Science & Technology",
      memberCount: 203,
      isPrivate: true,
    },
  ],
  channels: {
    s1: [
      {
        id: "c1",
        name: "quantum-physics",
        icon: "⚗",
        topic: "Discuss all things quantum",
      },
      { id: "c11", name: "general", icon: "#", topic: "General discussion" },
      {
        id: "c12",
        name: "resources",
        icon: "📚",
        topic: "Share study resources",
      },
    ],
    s2: [
      {
        id: "c2",
        name: "ancient-greece",
        icon: "🌍",
        topic: "Ancient Greek history",
      },
    ],
    s3: [
      {
        id: "c3",
        name: "javascript",
        icon: "💻",
        topic: "JavaScript development",
      },
    ],
  } as Record<string, any[]>,
  messages: {
    s1_c1: [
      {
        id: "m1",
        user: "AI Moderator",
        text: "Welcome to Quantum Physics. All content is monitored for scholarly integrity.",
        timestamp: "10:00 AM",
        isAI: true,
        role: "Moderator",
      },
      {
        id: "m2",
        user: "Scholar_Alpha",
        text: "Can someone explain the double-slit experiment in simple terms?",
        timestamp: "10:05 AM",
        role: "Member",
      },
      {
        id: "m3",
        user: "You",
        text: "When particles are observed, they collapse from wave-like probability distributions into discrete positions.",
        timestamp: "10:07 AM",
        role: "Admin",
      },
    ],
  } as Record<string, any[]>,
  members: {
    s1_c1: [
      {
        id: "u1",
        name: "AI Moderator",
        status: "Online",
        isAI: true,
        role: "Moderator",
        grade: "N/A",
        subject: "All Subjects",
        email: "ai@academy.edu",
        joined: "Jan 2024",
        bio: "AI moderation assistant",
      },
      {
        id: "u2",
        name: "You",
        status: "Online",
        role: "Admin",
        grade: "University Year 2",
        subject: "Physics",
        email: "you@academy.edu",
        joined: "Feb 2024",
        bio: "Passionate about quantum mechanics",
      },
      {
        id: "u3",
        name: "Scholar_Alpha",
        status: "Online",
        role: "Member",
        grade: "Grade 11",
        subject: "Science",
        email: "alpha@academy.edu",
        joined: "Mar 2024",
        bio: "Science enthusiast",
      },
      {
        id: "u4",
        name: "Prof_Newton",
        status: "Away",
        role: "Tutor",
        grade: "University Year 4",
        subject: "Physics",
        email: "newton@academy.edu",
        joined: "Jan 2024",
        bio: "Physics tutor",
      },
      {
        id: "u5",
        name: "Quantum_Riya",
        status: "Online",
        role: "Student Leader",
        grade: "Grade 12",
        subject: "Physics",
        email: "riya@academy.edu",
        joined: "Feb 2024",
        bio: "School science captain",
      },
    ],
  } as Record<string, any[]>,
  pinnedMessageId: null as string | null,
};

/* ── Floating Chatbot ── */
const FloatingChatbot = () => {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([
    { from: "ai", text: "Hi! I'm your Community AI 🎓 Ask me anything!" },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const TIPS = [
    "Use channels to organise discussions by topic.",
    "Pin important messages so everyone can find them.",
    "Create polls to gather opinions from the group.",
    "Upload files to share study resources.",
    "React with emojis to acknowledge messages.",
  ];
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, typing]);
  const send = () => {
    if (!input.trim()) return;
    const q = input.trim();
    setMsgs((m) => [...m, { from: "user", text: q }]);
    setInput("");
    setTyping(true);
    setTimeout(
      () => {
        let r = TIPS[Math.floor(Math.random() * TIPS.length)];
        const l = q.toLowerCase();
        if (l.includes("poll"))
          r = "Click the bar chart icon in the input bar to create a poll.";
        if (l.includes("channel"))
          r = "Click + next to Channels to add a new channel.";
        if (l.includes("member"))
          r = "Click the UserPlus icon in the header to add members.";
        setMsgs((m) => [...m, { from: "ai", text: r }]);
        setTyping(false);
      },
      900 + Math.random() * 600,
    );
  };
  return (
    <div className="cm-fab">
      <AnimatePresence>
        {open && (
          <motion.div
            className="cm-bot-box"
            initial={{ opacity: 0, scale: 0.88, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: 16 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <div className="cm-bot-head">
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Bot size={16} color="#fff" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
                  Community AI
                </div>
                <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.7)" }}>
                  Ask me anything
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "rgba(255,255,255,.7)",
                  display: "flex",
                }}
              >
                <X size={14} />
              </button>
            </div>
            <div className="cm-bot-msgs">
              {msgs.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    display: "flex",
                    justifyContent:
                      m.from === "user" ? "flex-end" : "flex-start",
                  }}
                >
                  <div className={`cm-bot-bubble ${m.from}`}>{m.text}</div>
                </motion.div>
              ))}
              {typing && (
                <div
                  style={{
                    display: "flex",
                    gap: 3,
                    padding: "8px 11px",
                    background: "#f8fafc",
                    borderRadius: 12,
                    width: "fit-content",
                    border: "1px solid rgba(0,0,0,.06)",
                  }}
                >
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background: "#94a3b8",
                      }}
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{
                        duration: 1,
                        delay: i * 0.2,
                        repeat: Infinity,
                      }}
                    />
                  ))}
                </div>
              )}
              <div ref={endRef} />
            </div>
            <div className="cm-bot-input-row">
              <input
                className="cm-bot-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Ask anything…"
              />
              <button className="cm-bot-send" onClick={send}>
                <Send size={13} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button
        className="cm-fab-btn"
        onClick={() => setOpen((o) => !o)}
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
      >
        {open ? <X size={20} /> : <MessageCircle size={20} />}
        {!open && <div className="cm-fab-pulse" />}
      </motion.button>
    </div>
  );
};

/* ── Message bubble ── */
const MsgBubble = ({
  msg,
  isAdmin,
  onPin,
  onEdit,
  onDelete,
  onReact,
  pinnedId,
}: any) => {
  const isYou = msg.user === "You";
  const isAI = msg.isAI;
  return (
    <motion.div
      className={`cm-msg${isYou ? " mine" : ""}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      style={{ paddingBottom: msg.reaction ? 4 : 0 }}
    >
      <UserAvatar name={msg.user} size={30} />
      <div className="cm-msg-body">
        <div className="cm-msg-meta">
          <span className={`cm-msg-name${isAI ? " ai" : ""}`}>{msg.user}</span>
          {msg.role === "Admin" && (
            <span className="cm-badge cm-badge-admin">Admin</span>
          )}
          {msg.role === "Tutor" && (
            <span className="cm-badge cm-badge-tutor">Tutor</span>
          )}
          {msg.role === "Student Leader" && (
            <span className="cm-badge cm-badge-leader">Leader</span>
          )}
          {isAI && <span className="cm-badge cm-badge-ai">AI</span>}
          {pinnedId === msg.id && <Pin size={9} style={{ color: "#6366f1" }} />}
          <span className="cm-msg-time">{msg.timestamp}</span>
        </div>
        {msg.isPoll ? (
          <div className="cm-poll-bubble">
            <div className="cm-poll-q">
              <BarChart3 size={12} />
              {msg.question}
            </div>
            {msg.options?.map((o: any) => (
              <button key={o.id} className="cm-poll-opt">
                {o.text}
                <span style={{ fontSize: 10, color: "#94a3b8" }}>
                  {o.votes} votes
                </span>
              </button>
            ))}
          </div>
        ) : msg.isFile ? (
          <div className="cm-file-bubble">
            <div className="cm-file-icon">
              <FileText size={15} style={{ color: "#6366f1" }} />
            </div>
            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: "#374151",
                flex: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {msg.fileName}
            </span>
            <Download
              size={13}
              style={{ color: "#94a3b8", cursor: "pointer", flexShrink: 0 }}
            />
          </div>
        ) : (
          <div
            className={`cm-bubble ${isYou ? "yours" : isAI ? "ai-bubble" : "theirs"}`}
          >
            {msg.text}
          </div>
        )}
        {/* Reaction badge — rendered BELOW bubble, not inside it */}
        {msg.reaction && (
          <div className="cm-reaction-wrap">
            <span
              className="cm-reaction"
              title="Click to remove"
              onClick={() => onReact(msg.id, null)}
            >
              {msg.reaction}{" "}
              <span style={{ fontSize: 10, color: "#94a3b8", marginLeft: 1 }}>
                ×
              </span>
            </span>
          </div>
        )}

        {/* Hover actions — anchored to the body, appear beside it */}
        <div className="cm-msg-actions">
          <Popover>
            <PopoverTrigger asChild>
              <button className="cm-act-btn" title="React">
                <Smile size={12} />
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-fit p-2 flex gap-2 rounded-xl shadow-xl border border-gray-100 bg-white"
              style={{ zIndex: 500 }}
            >
              {["🎓", "✨", "💡", "❤️", "🔥", "👏", "🤔", "😮"].map((e) => (
                <button
                  key={e}
                  onClick={() => onReact(msg.id, e)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 18,
                    lineHeight: 1,
                    padding: "2px",
                    borderRadius: 6,
                    transition: "transform .12s",
                  }}
                  onMouseEnter={(ev) =>
                    (ev.currentTarget.style.transform = "scale(1.35)")
                  }
                  onMouseLeave={(ev) =>
                    (ev.currentTarget.style.transform = "scale(1)")
                  }
                >
                  {e}
                </button>
              ))}
            </PopoverContent>
          </Popover>
          {isAdmin && (
            <Popover>
              <PopoverTrigger asChild>
                <button className="cm-act-btn" title="More">
                  <MoreVertical size={12} />
                </button>
              </PopoverTrigger>
              <PopoverContent
                className="w-36 p-1.5 rounded-xl shadow-xl border border-gray-100 bg-white space-y-0.5"
                style={{ zIndex: 500 }}
              >
                {[
                  {
                    icon: <Pin size={11} />,
                    label: "Pin",
                    action: () => onPin(msg.id),
                  },
                  {
                    icon: <Edit3 size={11} />,
                    label: "Edit",
                    action: () => onEdit(msg),
                  },
                  {
                    icon: <Trash2 size={11} />,
                    label: "Delete",
                    action: () => onDelete(msg.id),
                    danger: true,
                  },
                ].map((a) => (
                  <button
                    key={a.label}
                    onClick={a.action}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      padding: "7px 10px",
                      borderRadius: 8,
                      border: "none",
                      background: "none",
                      cursor: "pointer",
                      fontSize: 12.5,
                      fontWeight: 500,
                      color: a.danger ? "#ef4444" : "#374151",
                      fontFamily: "inherit",
                      transition: "background .12s",
                    }}
                    onMouseEnter={(ev) =>
                      (ev.currentTarget.style.background = a.danger
                        ? "rgba(239,68,68,.07)"
                        : "#f8fafc")
                    }
                    onMouseLeave={(ev) =>
                      (ev.currentTarget.style.background = "none")
                    }
                  >
                    {a.icon}
                    {a.label}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>
    </motion.div>
  );
};

/* ── Page Loader ── */
const PageLoader = () => (
  <div className="cm-loader">
    <style>{CSS}</style>
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="cm-loader-icon">
        <motion.div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 18,
            background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
          }}
          animate={{
            rotate: [0, 180, 360],
            borderRadius: ["20%", "50%", "20%"],
          }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />
        <GraduationCap
          size={26}
          color="#fff"
          style={{ position: "relative", zIndex: 1 }}
        />
      </div>
    </motion.div>
    <p style={{ fontSize: 13, fontWeight: 600, color: "#64748b" }}>
      Launching Academy
    </p>
    <div className="cm-loader-dots">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="cm-loader-dot"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  </div>
);

/* ─── Main Component ─── */
const CommunityNewPage = () => {
  const { theme, setTheme } = useTheme();
  const { userHeader } = useAuth();
  const [currentRole, setCurrentRole] = useState("student");
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState(INIT);
  const [activeServerId, setActiveServerId] = useState("s1");
  const [activeChannelId, setActiveChannelId] = useState("c1");
  const [typing, setTyping] = useState("");
  const [isTypingInd, setIsTypingInd] = useState(false);
  const [strikes, setStrikes] = useState(0);
  const [isBanned, setIsBanned] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [studyPoints, setStudyPoints] = useState(0);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [communitySessions, setCommunitySessions] = useState<any[]>([]);
  const [viewingMember, setViewingMember] = useState<any>(null);
  const [serverModal, setServerModal] = useState(false);
  const [channelModal, setChannelModal] = useState(false);
  const [memberModal, setMemberModal] = useState(false);
  
  const [pollModal, setPollModal] = useState({
    open: false,
    question: "",
    options: ["", ""],
  });
  const [serverForm, setServerForm] = useState({
    name: "",
    description: "",
    category: "",
    icon: "🎓",
    isPrivate: false,
  });
  const [channelForm, setChannelForm] = useState({ name: "", topic: "" });
  const [memberForm, setMemberForm] = useState({
    name: "",
    email: "",
    phone: "",
    grade: "",
    subject: "",
    role: "Member",
    bio: "",
    location: "",
  });

  const scrollRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isMobile = useMediaQuery("(max-width: 768px)");
  const isTablet = useMediaQuery("(max-width: 1024px)");
  const isDesktop = useMediaQuery("(min-width: 1280px)");

  useEffect(() => {
    if (userHeader?.role) setCurrentRole(userHeader.role);
  }, [userHeader]);
  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 1400);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    const loadSessions = () => {
      try {
        setCommunitySessions(JSON.parse(localStorage.getItem(COMMUNITY_SESSIONS_KEY) || "[]"));
      } catch {
        setCommunitySessions([]);
      }
    };
    loadSessions();
    window.addEventListener("storage", loadSessions);
    return () => window.removeEventListener("storage", loadSessions);
  }, []);
  useEffect(() => {
    const vp = scrollRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]",
    );
    if (vp) vp.scrollTo({ top: vp.scrollHeight, behavior: "smooth" });
  }, [data.messages, isTypingInd, activeServerId, activeChannelId]);

  // Close mobile drawers on channel switch
  useEffect(() => {
    setShowSidebar(false);
  }, [activeChannelId, activeServerId]);

  const activeServer = data.servers.find((s) => s.id === activeServerId);
  const msgKey = `${activeServerId}_${activeChannelId}`;
  const messages = data.messages[msgKey] || [];
  const members = data.members[msgKey] || [];
  const filtered = searchQuery
    ? messages.filter((m: any) =>
        m.text?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : messages;
  const onlineCount = members.filter((m: any) => m.status === "Online").length;
  const pinnedMsg = messages.find((m: any) => m.id === data.pinnedMessageId);
  const rank =
    studyPoints >= 100
      ? { title: "Professor", color: "#8b5cf6" }
      : studyPoints >= 50
        ? { title: "Scholar", color: "#f59e0b" }
        : { title: "Novice", color: "#6366f1" };
  const activeChannel = data.channels[activeServerId]?.find(
    (c: any) => c.id === activeChannelId,
  );
  const joinCommunitySession = (session: any, role: "observer" | "participant") => {
    if (!session?.link) return;
    const sep = session.link.includes("?") ? "&" : "?";
    window.location.href = `${session.link}${sep}role=${role}`;
  };

  const triggerStrike = () => {
    const s = strikes + 1;
    setStrikes(s);
    if (s >= 3) setIsBanned(true);
    else setShowWarning(true);
  };

  const handleSend = () => {
    if (isBanned || !typing.trim() || !data.isAdmin) return;
    if (FORBIDDEN.some((w) => typing.toLowerCase().includes(w))) {
      setTyping("");
      triggerStrike();
      return;
    }
    if (editingMsgId) {
      setData((p) => ({
        ...p,
        messages: {
          ...p.messages,
          [msgKey]: p.messages[msgKey].map((m: any) =>
            m.id === editingMsgId ? { ...m, text: typing } : m,
          ),
        },
      }));
      setEditingMsgId(null);
    } else {
      setIsTypingInd(true);
      setTimeout(() => setIsTypingInd(false), 600);
      const nm = {
        id: Date.now().toString(),
        user: "You",
        text: typing,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        role: "Admin",
      };
      setData((p) => ({
        ...p,
        messages: {
          ...p.messages,
          [msgKey]: [...(p.messages[msgKey] || []), nm],
        },
      }));
      setStudyPoints((p) => p + 10);
    }
    setTyping("");
    inputRef.current?.focus();
  };

  const handleFileUpload = (e: any) => {
    const file = e.target.files?.[0];
    if (!file || !data.isAdmin) return;
    const nm = {
      id: Date.now().toString(),
      user: "You",
      isFile: true,
      fileName: file.name,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      role: "Admin",
    };
    setData((p) => ({
      ...p,
      messages: {
        ...p.messages,
        [msgKey]: [...(p.messages[msgKey] || []), nm],
      },
    }));
    setStudyPoints((p) => p + 20);
    e.target.value = "";
  };

  const handleCreateServer = () => {
    if (!serverForm.name.trim()) return;
    const nid = `s${Date.now()}`;
    const cid = `c${Date.now()}`;
    setData((p) => ({
      ...p,
      servers: [
        ...p.servers,
        {
          id: nid,
          name: serverForm.name,
          icon: serverForm.icon,
          description: serverForm.description,
          category: serverForm.category,
          memberCount: 1,
          isPrivate: serverForm.isPrivate,
        },
      ],
      channels: {
        ...p.channels,
        [nid]: [
          { id: cid, name: "general", icon: "#", topic: "General discussion" },
        ],
      },
      messages: { ...p.messages, [`${nid}_${cid}`]: [] },
      members: { ...p.members, [`${nid}_${cid}`]: [] },
    }));
    setServerForm({
      name: "",
      description: "",
      category: "",
      icon: "🎓",
      isPrivate: false,
    });
    setServerModal(false);
  };

  const handleCreateChannel = () => {
    if (!channelForm.name.trim()) return;
    const clean = channelForm.name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    setData((p) => ({
      ...p,
      channels: {
        ...p.channels,
        [activeServerId]: [
          ...(p.channels[activeServerId] || []),
          {
            id: `c${Date.now()}`,
            name: clean,
            icon: getSuitableIcon(channelForm.name),
            topic: channelForm.topic,
          },
        ],
      },
    }));
    setChannelForm({ name: "", topic: "" });
    setChannelModal(false);
  };

  const handleAddMember = () => {
    if (!memberForm.name.trim()) return;
    const nm = {
      id: `u${Date.now()}`,
      name: memberForm.name.replace(/\s+/g, "_"),
      status: "Online",
      role: memberForm.role,
      grade: memberForm.grade,
      subject: memberForm.subject,
      email: memberForm.email,
      phone: memberForm.phone,
      bio: memberForm.bio,
      location: memberForm.location,
      joined: new Date().toLocaleDateString("en-GB", {
        month: "short",
        year: "numeric",
      }),
    };
    setData((p) => ({
      ...p,
      members: { ...p.members, [msgKey]: [...(p.members[msgKey] || []), nm] },
    }));
    const wm = {
      id: Date.now().toString(),
      user: "AI Moderator",
      isAI: true,
      text: `Welcome ${nm.name}! 🎉 They've joined as ${nm.role}.`,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      role: "Moderator",
    };
    setData((p) => ({
      ...p,
      messages: {
        ...p.messages,
        [msgKey]: [...(p.messages[msgKey] || []), wm],
      },
    }));
    setMemberForm({
      name: "",
      email: "",
      phone: "",
      grade: "",
      subject: "",
      role: "Member",
      bio: "",
      location: "",
    });
    setMemberModal(false);
  };

  const handleCreatePoll = () => {
    if (
      !pollModal.question.trim() ||
      pollModal.options.filter(Boolean).length < 2
    )
      return;
    const poll = {
      id: Date.now().toString(),
      user: "You",
      isPoll: true,
      question: pollModal.question,
      options: pollModal.options
        .filter(Boolean)
        .map((o: any, i: number) => ({ id: i, text: o, votes: 0 })),
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      role: "Admin",
    };
    setData((p) => ({
      ...p,
      messages: {
        ...p.messages,
        [msgKey]: [...(p.messages[msgKey] || []), poll],
      },
    }));
    setPollModal({ open: false, question: "", options: ["", ""] });
  };

  const roleClass = (r: string) =>
    ({
      Admin: "cm-role-admin",
      Moderator: "cm-role-mod",
      Tutor: "cm-role-tutor",
      "Student Leader": "cm-role-leader",
    })[r] || "cm-role-member";
const { meetingUI, openMeeting, renderMeetingCard } = useMeetingSystem({
  isDark: theme === "dark",
  members: members,  // already resolved above, not members[msgKey]
  currentUser: "You",
  onPostCard: (card) => {
    if (card._update) {
      setData((p) => ({
        ...p,
        messages: {
          ...p.messages,
          [msgKey]: p.messages[msgKey].map((m) =>
            m.isMeetingCard && m.card?.id === card.id ? { ...m, card } : m,
          ),
        },
      }));
    } else {
      setData((p) => ({
        ...p,
        messages: {
          ...p.messages,
          [msgKey]: [
            ...(p.messages[msgKey] || []),
            { id: card.id, isMeetingCard: true, card },
          ],
        },
      }));
    }
  },
});
  /* ── Reusable sidebar content (used both desktop + mobile drawer) ── */
  const SidebarContent = () => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* Server rail */}
      <div className="cm-server-rail">
        <TooltipProvider delayDuration={100}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 3px 10px rgba(99,102,241,.35)",
              flexShrink: 0,
            }}
          >
            <GraduationCap size={17} color="#fff" />
          </div>
          {data.servers.map((s) => (
            <Tooltip key={s.id}>
              <TooltipTrigger asChild>
                <button
                  className={`cm-srv-btn${activeServerId === s.id ? " active" : ""}`}
                  onClick={() => {
                    setActiveServerId(s.id);
                    setActiveChannelId(data.channels[s.id]?.[0]?.id || "");
                  }}
                >
                  {s.icon}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {s.name}
                {s.isPrivate ? " 🔒" : ""}
              </TooltipContent>
            </Tooltip>
          ))}
          {data.isAdmin && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="cm-srv-add"
                  onClick={() => setServerModal(true)}
                >
                  <PlusCircle size={16} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Create Community
              </TooltipContent>
            </Tooltip>
          )}
        </TooltipProvider>
      </div>

      {/* Server name */}
      <div
        style={{
          padding: "10px 12px 4px",
          borderBottom: "1px solid rgba(0,0,0,.06)",
          flexShrink: 0,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>
          {activeServer?.name}
        </div>
        <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 1 }}>
          {activeServer?.category}
        </div>
      </div>

      {/* Rank card */}
      <div className="cm-rank">
        <div className="cm-rank-row">
          <span className="cm-rank-title" style={{ color: rank.color }}>
            {rank.title}
          </span>
          <span className="cm-rank-pts">{studyPoints} pts</span>
        </div>
        <div className="cm-rank-bar">
          <motion.div
            className="cm-rank-fill"
            animate={{ width: `${Math.min(studyPoints % 100, 100)}%` }}
            transition={{ type: "spring", stiffness: 60 }}
          />
        </div>
      </div>

      {/* Channels */}
      <div className="cm-ch-header">
        <span className="cm-ch-label">Channels</span>
        {data.isAdmin && (
          <button
            style={{
              width: 22,
              height: 22,
              borderRadius: 7,
              border: "none",
              background: "rgba(99,102,241,.1)",
              color: "#6366f1",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={() => setChannelModal(true)}
          >
            <PlusCircle size={12} />
          </button>
        )}
      </div>
      <div className="cm-channels-scroll">
        {data.channels[activeServerId]?.map((c: any, i: number) => (
          <motion.button
            key={c.id}
            className={`cm-ch-btn${activeChannelId === c.id ? " active" : ""}`}
            onClick={() => setActiveChannelId(c.id)}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <span style={{ fontSize: 13, flexShrink: 0 }}>{c.icon}</span>
            <span
              style={{
                flex: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {c.name}
            </span>
            {activeChannelId === c.id && <span className="cm-ch-dot" />}
          </motion.button>
        ))}
      </div>

      <button className="cm-repo-btn" onClick={() => setIsLibraryOpen(true)}>
        <Library size={13} /> Repository
      </button>
    </div>
  );

  /* ── Members content ── */
  const MembersContent = () => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="cm-members-head">
        <span className="cm-members-title">Members</span>
        <span className="cm-online-badge">{onlineCount} online</span>
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {["Online", "Away"].map((status) => {
          const group = members.filter((m: any) => m.status === status);
          if (!group.length) return null;
          return (
            <div key={status}>
              <div className="cm-status-lbl">
                {status} — {group.length}
              </div>
              {group.map((m: any, i: number) => (
                <motion.div
                  key={m.id}
                  className="cm-member-row"
                  onClick={() => setViewingMember(m)}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <UserAvatar name={m.name} status={m.status} size={28} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="cm-mem-name">{m.name}</div>
                    <div className={`cm-mem-role ${roleClass(m.role)}`}>
                      {m.role}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );

  if (isLoading) return <PageLoader />;

  return (
    <TooltipProvider delayDuration={100}>
      <style>{CSS}</style>
      <Navigation currentRole={currentRole} onRoleChange={setCurrentRole} />

      <div className="cm-root">
        {/* ── HERO ── */}
        {/* <div className="cm-hero">
          <div className="cm-hero-inner">
            <div className="cm-hero-left">
              <div style={{width:40,height:40,borderRadius:13,background:"rgba(255,255,255,.2)",border:"1.5px solid rgba(255,255,255,.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{activeServer?.icon||"🎓"}</div>
              <div>
                <div className="cm-hero-pill">💬 Community</div>
                <div className="cm-hero-title">{activeServer?.name||"Academy"}</div>
                <div className="cm-hero-sub">{activeServer?.category} · {activeServer?.memberCount} members</div>
              </div>
            </div>
            <div className="cm-hero-stats">
              {[{n:messages.length,l:"Messages"},{n:onlineCount,l:"Online"},{n:studyPoints,l:"Points"},{n:members.length,l:"Members"}].map((s,i)=>(
                <div key={i} className="cm-hstat">
                  <div className="cm-hstat-n">{s.n}</div>
                  <div className="cm-hstat-l">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div> */}

        {/* ── BODY ── */}
        <div className="cm-body">
          {/* Desktop sidebar */}
          {!isTablet && (
            <div className="cm-sidebar">
              <SidebarContent />
            </div>
          )}

          {/* ── MAIN CHAT ── */}
          <div className="cm-chat" style={{ position: "relative" }}>
            {/* Chat header */}
            <div className="cm-chat-head">
              {isTablet && (
                <button
                  className="cm-hbtn"
                  onClick={() => setShowSidebar(true)}
                >
                  <Menu size={15} />
                </button>
              )}
              <span style={{ fontSize: 16, flexShrink: 0 }}>
                {activeChannel?.icon || "#"}
              </span>
              <span className="cm-ch-name">{activeChannel?.name}</span>
              <span className="cm-head-sep" />
              <span className="cm-ch-topic">{activeChannel?.topic}</span>
              <div className="cm-head-actions">
                {/* Search */}
                <AnimatePresence>
                  {isSearchOpen && (
                    <motion.div
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: isMobile ? 120 : 150, opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      style={{
                        overflow: "hidden",
                        borderRadius: 9,
                        border: "1.5px solid rgba(99,102,241,.3)",
                        background: "#f8fafc",
                        display: "flex",
                        alignItems: "center",
                        padding: "0 8px",
                        height: 30,
                      }}
                    >
                      <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search…"
                        autoFocus
                        style={{
                          border: "none",
                          background: "transparent",
                          outline: "none",
                          fontSize: 12,
                          fontFamily: "inherit",
                          width: "100%",
                          color: "#0f172a",
                        }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
                <button
                  className="cm-hbtn"
                  onClick={() => {
                    setIsSearchOpen((s) => !s);
                    setSearchQuery("");
                  }}
                >
                  <Search size={14} />
                </button>
                <button
                  className="cm-hbtn"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                  {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
                </button>
                <button className="cm-hbtn" onClick={openMeeting}>
                  <Video size={14} />
                </button>
                {!isDesktop && (
                  <button
                    className={`cm-hbtn${showMembers ? " on" : ""}`}
                    onClick={() => setShowMembers((o) => !o)}
                  >
                    <Users size={14} />
                  </button>
                )}
                {data.isAdmin && (
                  <button
                    className="cm-hbtn"
                    onClick={() => setMemberModal(true)}
                  >
                    <UserPlus size={14} />
                  </button>
                )}
                <button
                  className="cm-hbtn"
                  onClick={() => setIsSettingsOpen(true)}
                >
                  <Settings size={14} />
                </button>
              </div>
            </div>

            {communitySessions.length > 0 && (
              <div className="cm-sessions">
                {communitySessions.slice(0, 6).map((s: any) => (
                  <div key={s.id} className="cm-session-card">
                    <div className="cm-session-top">{s.type === "debate" ? "Debate" : "Seminar"} session</div>
                    <div className="cm-session-title">{s.title}</div>
                    <div className="cm-session-meta">
                      {s.subject || "Community"}{s.unit ? ` · ${s.unit}` : ""}<br />
                      {s.date || "Scheduled"} {s.time ? `at ${s.time}` : ""}
                    </div>
                    <div className="cm-session-actions">
                      <button onClick={() => joinCommunitySession(s, "observer")}>Observer</button>
                      <button onClick={() => joinCommunitySession(s, "participant")}>Participant</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pinned */}
            <AnimatePresence>
              {pinnedMsg && (
                <motion.div
                  className="cm-pinned"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                >
                  <Pin size={11} style={{ color: "#6366f1", flexShrink: 0 }} />
                  <span className="cm-pinned-text">
                    {pinnedMsg.isPoll ? pinnedMsg.question : pinnedMsg.text}
                  </span>
                  {data.isAdmin && (
                    <button
                      onClick={() =>
                        setData((p) => ({ ...p, pinnedMessageId: null }))
                      }
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#94a3b8",
                        display: "flex",
                      }}
                    >
                      <X size={11} />
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages */}
            <ScrollArea className="cm-msgs-area" ref={scrollRef}>
              <div className="cm-msgs-inner">
                {filtered
                  .filter((m: any) => !m.hidden)
                  .map((msg: any) => {
                     // Meeting card — render inline in feed
  if (msg.isMeetingCard) {
    return (
      <div key={msg.id} style={{padding:"4px 0"}}>
        {renderMeetingCard(msg.card)}
      </div>
    );
  }
  return (
                    <MsgBubble
                      key={msg.id}
                      msg={msg}
                      isAdmin={data.isAdmin}
                      pinnedId={data.pinnedMessageId}
                      onPin={(id: string) =>
                        setData((p) => ({ ...p, pinnedMessageId: id }))
                      }
                      onEdit={(m: any) => {
                        setEditingMsgId(m.id);
                        setTyping(m.text);
                        inputRef.current?.focus();
                      }}
                      onDelete={(id: string) =>
                        setData((p) => ({
                          ...p,
                          messages: {
                            ...p.messages,
                            [msgKey]: p.messages[msgKey].filter(
                              (m: any) => m.id !== id,
                            ),
                          },
                        }))
                      }
                      onReact={(id: string, e: string | null) =>
                        setData((p) => ({
                          ...p,
                          messages: {
                            ...p.messages,
                            [msgKey]: p.messages[msgKey].map((m: any) =>
                              m.id === id ? { ...m, reaction: e } : m,
                            ),
                          },
                        }))
                      }
                    />
                  )})}
                <AnimatePresence>
                  {isTypingInd && (
                    <motion.div
                      className="cm-typing"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                    >
                      <UserAvatar name="You" size={26} />
                      <div className="cm-typing-dots">
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            className="cm-typing-dot"
                            animate={{ y: [0, -3, 0] }}
                            transition={{
                              duration: 0.5,
                              repeat: Infinity,
                              delay: i * 0.11,
                            }}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                {filtered.length === 0 && searchQuery && (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "40px 20px",
                      color: "#94a3b8",
                    }}
                  >
                    <Search
                      size={24}
                      style={{ margin: "0 auto 8px", opacity: 0.4 }}
                    />
                    <p style={{ fontSize: 12.5, fontWeight: 500 }}>
                      No messages matching "{searchQuery}"
                    </p>
                  </div>
                )}
                {filtered.length === 0 && !searchQuery && (
                  <div style={{ textAlign: "center", padding: "40px 20px" }}>
                    <span
                      style={{
                        fontSize: 28,
                        display: "block",
                        marginBottom: 8,
                      }}
                    >
                      💬
                    </span>
                    <p
                      style={{
                        fontSize: 12.5,
                        color: "#94a3b8",
                        fontWeight: 500,
                      }}
                    >
                      No messages yet — start the conversation!
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="cm-input-bar">
              <AnimatePresence>
                {editingMsgId && (
                  <motion.div
                    className="cm-edit-tag"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                  >
                    <Edit3 size={11} /> Editing message
                    <button
                      onClick={() => {
                        setEditingMsgId(null);
                        setTyping("");
                      }}
                      style={{
                        marginLeft: "auto",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#94a3b8",
                        display: "flex",
                      }}
                    >
                      <X size={11} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
              {!data.isAdmin ? (
                <div className="cm-view-only">
                  <Shield size={13} /> View-only mode — admin access required.
                </div>
              ) : (
                <div className={`cm-input-row${isBanned ? " banned" : ""}`}>
                  <button
                    className="cm-input-tool"
                    onClick={() => setPollModal({ ...pollModal, open: true })}
                    title="Create poll"
                  >
                    <BarChart3 size={13} />
                  </button>
                  <button
                    className="cm-input-tool"
                    onClick={() => fileInputRef.current?.click()}
                    title="Upload file"
                  >
                    <FileUp size={13} />
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: "none" }}
                    onChange={handleFileUpload}
                  />
                  <input
                    ref={inputRef}
                    className="cm-input-text"
                    disabled={isBanned}
                    value={isBanned ? "Access suspended" : typing}
                    onChange={(e) => setTyping(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && !e.shiftKey && handleSend()
                    }
                    placeholder={
                      editingMsgId
                        ? "Edit your message…"
                        : `Message #${activeChannel?.name || "channel"}…`
                    }
                  />
                  <AnimatePresence>
                    {typing.trim() && (
                      <motion.button
                        className="cm-input-send"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 20,
                        }}
                        onClick={handleSend}
                        disabled={isBanned}
                      >
                        <Send size={12} />
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Ban overlay */}
            <AnimatePresence>
              {isBanned && (
                <motion.div
                  className="cm-ban-overlay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <motion.div
                    initial={{ scale: 0.85 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.1 }}
                    style={{ textAlign: "center", maxWidth: 300 }}
                  >
                    <motion.div
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 18,
                        background: "rgba(239,68,68,.1)",
                        border: "1px solid rgba(239,68,68,.2)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 16px",
                      }}
                    >
                      <Skull size={32} color="#ef4444" />
                    </motion.div>
                    <h2
                      style={{
                        fontSize: 20,
                        fontWeight: 800,
                        color: "#fff",
                        marginBottom: 7,
                      }}
                    >
                      Access Suspended
                    </h2>
                    <p
                      style={{
                        fontSize: 12.5,
                        color: "#94a3b8",
                        lineHeight: 1.6,
                        marginBottom: 20,
                      }}
                    >
                      You've reached the maximum policy violations. Access has
                      been terminated.
                    </p>
                    <button
                      onClick={() => window.location.reload()}
                      style={{
                        width: "100%",
                        padding: "11px",
                        borderRadius: 12,
                        background: "#ef4444",
                        color: "#fff",
                        border: "none",
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      Leave Academy
                    </button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Desktop members panel */}
          {isDesktop && (
            <div className="cm-members">
              <MembersContent />
            </div>
          )}
        </div>

        {/* ── MOBILE DRAWERS ── */}

        {/* Left: Sidebar drawer */}
        <AnimatePresence>
          {showSidebar && isTablet && (
            <>
              <motion.div
                className="cm-drawer-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowSidebar(false)}
              />
              <motion.div
                className="cm-drawer"
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }}
              >
                <div className="cm-drawer-head">
                  <div className="cm-drawer-title">📚 Channels</div>
                  <button
                    className="cm-drawer-close"
                    onClick={() => setShowSidebar(false)}
                  >
                    <X size={14} />
                  </button>
                </div>
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <SidebarContent />
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Right: Members drawer */}
        <AnimatePresence>
          {showMembers && !isDesktop && (
            <>
              <motion.div
                className="cm-drawer-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowMembers(false)}
              />
              <motion.div
                className="cm-drawer cm-drawer-right"
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }}
              >
                <div className="cm-drawer-head">
                  <div className="cm-drawer-title">👥 Members</div>
                  <button
                    className="cm-drawer-close"
                    onClick={() => setShowMembers(false)}
                  >
                    <X size={14} />
                  </button>
                </div>
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <MembersContent />
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* ─── DIALOGS ─── */}

      {/* Create Server */}
      <Dialog
        open={serverModal}
        onOpenChange={(o) => !o && setServerModal(false)}
      >
        <DialogContent className="sm:max-w-lg rounded-2xl p-0 overflow-hidden bg-white dark:bg-slate-900 border border-gray-200 shadow-2xl">
          <div
            style={{
              background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
              padding: "18px 22px",
            }}
          >
            <DialogTitle
              style={{ color: "#fff", fontSize: 16, fontWeight: 800 }}
            >
              Create a Community
            </DialogTitle>
            <p
              style={{
                color: "rgba(255,255,255,.7)",
                fontSize: 12,
                marginTop: 3,
              }}
            >
              Set up a new learning space
            </p>
          </div>
          <div
            style={{
              padding: 22,
              display: "flex",
              flexDirection: "column",
              gap: 13,
              maxHeight: "60vh",
              overflowY: "auto",
            }}
          >
            <div>
              <label
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: ".08em",
                  display: "block",
                  marginBottom: 7,
                }}
              >
                Icon
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {SERVER_ICONS.map((icon) => (
                  <button
                    key={icon}
                    onClick={() => setServerForm((f) => ({ ...f, icon }))}
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 9,
                      fontSize: 17,
                      border: `2px solid ${serverForm.icon === icon ? "#6366f1" : "transparent"}`,
                      background:
                        serverForm.icon === icon
                          ? "rgba(99,102,241,.08)"
                          : "#f8fafc",
                      cursor: "pointer",
                      transition: "all .15s",
                      transform:
                        serverForm.icon === icon ? "scale(1.1)" : "scale(1)",
                    }}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            {[
              {
                label: "Community Name *",
                key: "name",
                ph: "e.g. Advanced Biology Club",
              },
              {
                label: "Description",
                key: "description",
                ph: "What is this community about?",
              },
            ].map((f) => (
              <div key={f.key}>
                <label
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: ".08em",
                    display: "block",
                    marginBottom: 5,
                  }}
                >
                  {f.label}
                </label>
                <input
                  value={(serverForm as any)[f.key]}
                  onChange={(e) =>
                    setServerForm((p) => ({ ...p, [f.key]: e.target.value }))
                  }
                  placeholder={f.ph}
                  style={{
                    width: "100%",
                    height: 38,
                    borderRadius: 11,
                    border: "1.5px solid rgba(0,0,0,.08)",
                    padding: "0 12px",
                    fontSize: 13,
                    outline: "none",
                    fontFamily: "inherit",
                    background: "#f8fafc",
                    boxSizing: "border-box",
                    transition: "border .2s",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                  onBlur={(e) =>
                    (e.target.style.borderColor = "rgba(0,0,0,.08)")
                  }
                />
              </div>
            ))}
            <div>
              <label
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: ".08em",
                  display: "block",
                  marginBottom: 5,
                }}
              >
                Category
              </label>
              <select
                value={serverForm.category}
                onChange={(e) =>
                  setServerForm((f) => ({ ...f, category: e.target.value }))
                }
                style={{
                  width: "100%",
                  height: 38,
                  borderRadius: 11,
                  border: "1.5px solid rgba(0,0,0,.08)",
                  padding: "0 12px",
                  fontSize: 13,
                  outline: "none",
                  fontFamily: "inherit",
                  background: "#f8fafc",
                  boxSizing: "border-box",
                }}
              >
                <option value="">Select category</option>
                {SERVER_CATS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                cursor: "pointer",
              }}
            >
              <div
                onClick={() =>
                  setServerForm((f) => ({ ...f, isPrivate: !f.isPrivate }))
                }
                style={{
                  width: 38,
                  height: 22,
                  borderRadius: 11,
                  background: serverForm.isPrivate
                    ? "#6366f1"
                    : "rgba(0,0,0,.1)",
                  position: "relative",
                  transition: "background .2s",
                  flexShrink: 0,
                  cursor: "pointer",
                }}
              >
                <motion.div
                  animate={{ x: serverForm.isPrivate ? 17 : 2 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  style={{
                    position: "absolute",
                    top: 2,
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: "#fff",
                    boxShadow: "0 2px 6px rgba(0,0,0,.15)",
                  }}
                />
              </div>
              <div>
                <p
                  style={{ fontSize: 12.5, fontWeight: 600, color: "#374151" }}
                >
                  Private Community
                </p>
                <p style={{ fontSize: 11, color: "#94a3b8" }}>
                  Only invited members can join
                </p>
              </div>
            </label>
          </div>
          <div style={{ padding: "0 22px 20px", display: "flex", gap: 9 }}>
            <button
              onClick={() => setServerModal(false)}
              style={{
                flex: 1,
                padding: "9px",
                borderRadius: 11,
                border: "1.5px solid rgba(0,0,0,.08)",
                background: "#fff",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                color: "#64748b",
                fontFamily: "inherit",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleCreateServer}
              disabled={!serverForm.name.trim()}
              style={{
                flex: 1,
                padding: "9px",
                borderRadius: 11,
                border: "none",
                background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
                opacity: serverForm.name.trim() ? 1 : 0.5,
              }}
            >
              Create Community
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Channel */}
      <Dialog
        open={channelModal}
        onOpenChange={(o) => !o && setChannelModal(false)}
      >
        <DialogContent className="sm:max-w-sm rounded-2xl p-6 bg-white dark:bg-slate-900 border border-gray-200 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <span>💬</span> Create Channel
            </DialogTitle>
          </DialogHeader>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 11,
              marginTop: 12,
            }}
          >
            {[
              { label: "Channel Name *", key: "name", ph: "channel-name" },
              { label: "Topic", key: "topic", ph: "What's this channel for?" },
            ].map((f) => (
              <div key={f.key}>
                <label
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: ".08em",
                    display: "block",
                    marginBottom: 5,
                  }}
                >
                  {f.label}
                </label>
                <input
                  value={(channelForm as any)[f.key]}
                  onChange={(e) =>
                    setChannelForm((p) => ({ ...p, [f.key]: e.target.value }))
                  }
                  placeholder={f.ph}
                  onKeyDown={(e) =>
                    e.key === "Enter" &&
                    f.key === "name" &&
                    handleCreateChannel()
                  }
                  style={{
                    width: "100%",
                    height: 38,
                    borderRadius: 11,
                    border: "1.5px solid rgba(0,0,0,.08)",
                    padding: "0 12px",
                    fontSize: 13,
                    outline: "none",
                    fontFamily: "inherit",
                    background: "#f8fafc",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 9, marginTop: 14 }}>
            <button
              onClick={() => setChannelModal(false)}
              style={{
                flex: 1,
                padding: "9px",
                borderRadius: 11,
                border: "1.5px solid rgba(0,0,0,.08)",
                background: "#fff",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                color: "#64748b",
                fontFamily: "inherit",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleCreateChannel}
              disabled={!channelForm.name.trim()}
              style={{
                flex: 1,
                padding: "9px",
                borderRadius: 11,
                border: "none",
                background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
                opacity: channelForm.name.trim() ? 1 : 0.5,
              }}
            >
              Create
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Member */}
      <Dialog
        open={memberModal}
        onOpenChange={(o) => !o && setMemberModal(false)}
      >
        <DialogContent className="sm:max-w-lg rounded-2xl p-0 overflow-hidden bg-white dark:bg-slate-900 border border-gray-200 shadow-2xl">
          <div
            style={{
              background: "linear-gradient(135deg,#10b981,#0d9488)",
              padding: "18px 22px",
            }}
          >
            <DialogTitle
              style={{ color: "#fff", fontSize: 16, fontWeight: 800 }}
            >
              Add Member
            </DialogTitle>
            <p
              style={{
                color: "rgba(255,255,255,.7)",
                fontSize: 12,
                marginTop: 3,
              }}
            >
              Enter the student's details
            </p>
          </div>
          <div style={{ padding: 22, maxHeight: "60vh", overflowY: "auto" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 12px",
                background: "#f8fafc",
                borderRadius: 11,
                marginBottom: 14,
                border: "1px solid rgba(0,0,0,.06)",
              }}
            >
              <UserAvatar name={memberForm.name || "New"} size={38} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
                  {memberForm.name || "New Member"}
                </p>
                <p style={{ fontSize: 11, color: "#94a3b8" }}>
                  {memberForm.grade || "Grade not set"} ·{" "}
                  {memberForm.subject || "Subject not set"}
                </p>
              </div>
              <span
                style={{
                  fontSize: 9.5,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 20,
                  background: "rgba(99,102,241,.1)",
                  color: "#6366f1",
                  textTransform: "uppercase",
                }}
              >
                {memberForm.role}
              </span>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 11,
              }}
            >
              {[
                {
                  label: "Full Name *",
                  key: "name",
                  ph: "Student name",
                  type: "text",
                },
                {
                  label: "Email",
                  key: "email",
                  ph: "student@school.edu",
                  type: "email",
                },
                {
                  label: "Phone",
                  key: "phone",
                  ph: "+91 00000 00000",
                  type: "text",
                },
                {
                  label: "Location",
                  key: "location",
                  ph: "e.g. Chennai",
                  type: "text",
                },
              ].map((f) => (
                <div key={f.key}>
                  <label
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#64748b",
                      textTransform: "uppercase",
                      letterSpacing: ".08em",
                      display: "block",
                      marginBottom: 5,
                    }}
                  >
                    {f.label}
                  </label>
                  <input
                    value={(memberForm as any)[f.key]}
                    onChange={(e) =>
                      setMemberForm((p) => ({ ...p, [f.key]: e.target.value }))
                    }
                    placeholder={f.ph}
                    type={f.type}
                    style={{
                      width: "100%",
                      height: 36,
                      borderRadius: 10,
                      border: "1.5px solid rgba(0,0,0,.08)",
                      padding: "0 11px",
                      fontSize: 13,
                      outline: "none",
                      fontFamily: "inherit",
                      background: "#f8fafc",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              ))}
              {[
                { label: "Role", key: "role", opts: ROLES },
                {
                  label: "Grade",
                  key: "grade",
                  opts: SCHOOL_GRADES,
                  placeholder: "Select grade",
                },
                {
                  label: "Subject",
                  key: "subject",
                  opts: SUBJECTS_LIST,
                  placeholder: "Select subject",
                },
              ].map((f) => (
                <div key={f.key}>
                  <label
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#64748b",
                      textTransform: "uppercase",
                      letterSpacing: ".08em",
                      display: "block",
                      marginBottom: 5,
                    }}
                  >
                    {f.label}
                  </label>
                  <select
                    value={(memberForm as any)[f.key]}
                    onChange={(e) =>
                      setMemberForm((p) => ({ ...p, [f.key]: e.target.value }))
                    }
                    style={{
                      width: "100%",
                      height: 36,
                      borderRadius: 10,
                      border: "1.5px solid rgba(0,0,0,.08)",
                      padding: "0 11px",
                      fontSize: 13,
                      outline: "none",
                      fontFamily: "inherit",
                      background: "#f8fafc",
                      boxSizing: "border-box",
                    }}
                  >
                    {"placeholder" in f && (
                      <option value="">{(f as any).placeholder}</option>
                    )}
                    {f.opts.map((o: string) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 11 }}>
              <label
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: ".08em",
                  display: "block",
                  marginBottom: 5,
                }}
              >
                Bio
              </label>
              <textarea
                value={memberForm.bio}
                onChange={(e) =>
                  setMemberForm((p) => ({ ...p, bio: e.target.value }))
                }
                rows={2}
                placeholder="Short bio…"
                style={{
                  width: "100%",
                  borderRadius: 10,
                  border: "1.5px solid rgba(0,0,0,.08)",
                  padding: "9px 11px",
                  fontSize: 13,
                  outline: "none",
                  fontFamily: "inherit",
                  background: "#f8fafc",
                  resize: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>
          <div style={{ padding: "0 22px 20px", display: "flex", gap: 9 }}>
            <button
              onClick={() => setMemberModal(false)}
              style={{
                flex: 1,
                padding: "9px",
                borderRadius: 11,
                border: "1.5px solid rgba(0,0,0,.08)",
                background: "#fff",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                color: "#64748b",
                fontFamily: "inherit",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleAddMember}
              disabled={!memberForm.name.trim()}
              style={{
                flex: 1,
                padding: "9px",
                borderRadius: 11,
                border: "none",
                background: "linear-gradient(135deg,#10b981,#0d9488)",
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
                opacity: memberForm.name.trim() ? 1 : 0.5,
              }}
            >
              Add Member
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Member Profile */}
      <Dialog
        open={!!viewingMember}
        onOpenChange={(o) => !o && setViewingMember(null)}
      >
        {viewingMember && (
          <DialogContent className="sm:max-w-sm rounded-2xl p-0 overflow-hidden bg-white dark:bg-slate-900 border border-gray-200 shadow-2xl">
            <div
              style={{
                background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                padding: "22px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginBottom: 9,
                }}
              >
                <UserAvatar
                  name={viewingMember.name}
                  status={viewingMember.status}
                  size={52}
                />
              </div>
              <h3 style={{ color: "#fff", fontSize: 16, fontWeight: 800 }}>
                {viewingMember.name}
              </h3>
              <p
                style={{
                  color: "rgba(255,255,255,.7)",
                  fontSize: 11.5,
                  marginTop: 2,
                }}
              >
                {viewingMember.role}
              </p>
            </div>
            <div
              style={{
                padding: 18,
                display: "flex",
                flexDirection: "column",
                gap: 9,
              }}
            >
              {[
                {
                  icon: <GraduationCap size={12} />,
                  label: "Grade",
                  value: viewingMember.grade,
                },
                {
                  icon: <BookOpen size={12} />,
                  label: "Subject",
                  value: viewingMember.subject,
                },
                {
                  icon: <Mail size={12} />,
                  label: "Email",
                  value: viewingMember.email,
                },
                {
                  icon: <Phone size={12} />,
                  label: "Phone",
                  value: viewingMember.phone,
                },
                {
                  icon: <MapPin size={12} />,
                  label: "Location",
                  value: viewingMember.location,
                },
                {
                  icon: <Star size={12} />,
                  label: "Joined",
                  value: viewingMember.joined,
                },
              ]
                .filter((i) => i.value)
                .map((item) => (
                  <div
                    key={item.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      fontSize: 12,
                    }}
                  >
                    <span style={{ color: "#94a3b8", flexShrink: 0 }}>
                      {item.icon}
                    </span>
                    <span
                      style={{
                        color: "#94a3b8",
                        width: 52,
                        flexShrink: 0,
                        fontSize: 11,
                      }}
                    >
                      {item.label}
                    </span>
                    <span
                      style={{
                        color: "#374151",
                        fontWeight: 500,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.value}
                    </span>
                  </div>
                ))}
              {viewingMember.bio && (
                <p
                  style={{
                    fontSize: 12,
                    color: "#64748b",
                    lineHeight: 1.6,
                    paddingTop: 9,
                    borderTop: "1px solid rgba(0,0,0,.06)",
                  }}
                >
                  {viewingMember.bio}
                </p>
              )}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  paddingTop: 9,
                  borderTop: "1px solid rgba(0,0,0,.06)",
                  fontSize: 12,
                  fontWeight: 600,
                  color:
                    viewingMember.status === "Online" ? "#059669" : "#d97706",
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background:
                      viewingMember.status === "Online" ? "#22c55e" : "#f59e0b",
                  }}
                />
                {viewingMember.status}
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Poll */}
      <Dialog
        open={pollModal.open}
        onOpenChange={(o) => setPollModal((p) => ({ ...p, open: o }))}
      >
        <DialogContent className="sm:max-w-sm rounded-2xl p-6 bg-white dark:bg-slate-900 border border-gray-200 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart3 size={14} className="text-indigo-500" />
              Create Poll
            </DialogTitle>
          </DialogHeader>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 9,
              marginTop: 10,
            }}
          >
            <input
              value={pollModal.question}
              onChange={(e) =>
                setPollModal({ ...pollModal, question: e.target.value })
              }
              placeholder="Ask your question…"
              style={{
                width: "100%",
                height: 38,
                borderRadius: 11,
                border: "1.5px solid rgba(0,0,0,.08)",
                padding: "0 12px",
                fontSize: 13,
                outline: "none",
                fontFamily: "inherit",
                background: "#f8fafc",
                boxSizing: "border-box",
              }}
            />
            {pollModal.options.map((opt: string, i: number) => (
              <input
                key={i}
                value={opt}
                onChange={(e) => {
                  const o = [...pollModal.options];
                  o[i] = e.target.value;
                  setPollModal({ ...pollModal, options: o });
                }}
                placeholder={`Option ${i + 1}`}
                style={{
                  width: "100%",
                  height: 36,
                  borderRadius: 10,
                  border: "1.5px solid rgba(0,0,0,.08)",
                  padding: "0 11px",
                  fontSize: 13,
                  outline: "none",
                  fontFamily: "inherit",
                  background: "#f8fafc",
                  boxSizing: "border-box",
                }}
              />
            ))}
            {pollModal.options.length < 6 && (
              <button
                onClick={() =>
                  setPollModal({
                    ...pollModal,
                    options: [...pollModal.options, ""],
                  })
                }
                style={{
                  fontSize: 12,
                  color: "#6366f1",
                  fontWeight: 600,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  padding: "2px 0",
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <PlusCircle size={12} /> Add option
              </button>
            )}
          </div>
          <button
            onClick={handleCreatePoll}
            disabled={
              !pollModal.question.trim() ||
              pollModal.options.filter(Boolean).length < 2
            }
            style={{
              width: "100%",
              marginTop: 13,
              padding: "10px",
              borderRadius: 12,
              border: "none",
              background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
              opacity:
                pollModal.question.trim() &&
                pollModal.options.filter(Boolean).length >= 2
                  ? 1
                  : 0.5,
            }}
          >
            Launch Poll
          </button>
        </DialogContent>
      </Dialog>

      {/* Warning */}
      <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
        <AlertDialogContent className="rounded-2xl max-w-sm p-6 bg-white dark:bg-slate-900 border border-gray-200 shadow-2xl">
          <AlertDialogHeader
            style={{ alignItems: "center", textAlign: "center", gap: 11 }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 13,
                background: "rgba(245,158,11,.1)",
                border: "1px solid rgba(245,158,11,.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AlertTriangle size={20} color="#f59e0b" />
            </div>
            <AlertDialogTitle className="text-sm font-semibold">
              Policy Violation
            </AlertDialogTitle>
            <AlertDialogDescription>
              This message violates academy guidelines. Strike{" "}
              <strong style={{ color: "#f59e0b" }}>{strikes}/3</strong>{" "}
              recorded.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter style={{ marginTop: 14 }}>
            <AlertDialogAction
              onClick={() => setShowWarning(false)}
              style={{
                width: "100%",
                borderRadius: 11,
                background: "#f59e0b",
                color: "#fff",
                fontWeight: 700,
              }}
            >
              Understood
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear confirm */}
      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent className="rounded-2xl max-w-sm p-6 bg-white dark:bg-slate-900 border border-gray-200 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-semibold">
              Clear all messages?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all messages in this channel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter style={{ gap: 9, marginTop: 14 }}>
            <AlertDialogCancel className="flex-1 rounded-xl text-sm">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setData((p) => ({
                  ...p,
                  messages: { ...p.messages, [msgKey]: [] },
                }));
                setShowClearConfirm(false);
                setIsSettingsOpen(false);
              }}
              className="flex-1 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold"
            >
              Clear all
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Settings panel */}
      <AnimatePresence>
        {isSettingsOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 140,
                background: "rgba(0,0,0,.15)",
                backdropFilter: "blur(4px)",
              }}
              onClick={() => setIsSettingsOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              style={{
                position: "fixed",
                inset: "64px 0 0 auto",
                zIndex: 150,
                width: 260,
                background: "#fff",
                borderLeft: "1px solid rgba(0,0,0,.06)",
                display: "flex",
                flexDirection: "column",
                boxShadow: "-4px 0 24px rgba(0,0,0,.1)",
                fontFamily: "Plus Jakarta Sans,system-ui,sans-serif",
              }}
            >
              <div
                style={{
                  height: 50,
                  padding: "0 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderBottom: "1px solid rgba(0,0,0,.06)",
                  flexShrink: 0,
                }}
              >
                <span
                  style={{ fontWeight: 800, fontSize: 13.5, color: "#0f172a" }}
                >
                  Channel Settings
                </span>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 7,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#94a3b8",
                  }}
                >
                  <X size={13} />
                </button>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
                <div
                  style={{
                    textAlign: "center",
                    padding: "16px 0 14px",
                    borderBottom: "1px solid rgba(0,0,0,.06)",
                    marginBottom: 14,
                  }}
                >
                  <div
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: 14,
                      background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 22,
                      margin: "0 auto 9px",
                      boxShadow: "0 4px 14px rgba(99,102,241,.28)",
                    }}
                  >
                    {activeServer?.icon}
                  </div>
                  <p
                    style={{
                      fontWeight: 800,
                      fontSize: 13.5,
                      color: "#0f172a",
                    }}
                  >
                    {activeServer?.name}
                  </p>
                  <p style={{ fontSize: 11, color: "#94a3b8" }}>
                    {activeServer?.category}
                  </p>
                </div>
                {[
                  {
                    label: "Messages",
                    value: messages.length,
                    color: "#6366f1",
                  },
                  { label: "Members", value: members.length, color: "#8b5cf6" },
                  {
                    label: "Your Points",
                    value: studyPoints,
                    color: rank.color,
                  },
                  { label: "Online Now", value: onlineCount, color: "#10b981" },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "9px 11px",
                      borderRadius: 9,
                      background: "#f8fafc",
                      marginBottom: 5,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: "#374151",
                      }}
                    >
                      {item.label}
                    </span>
                    <span
                      style={{
                        fontSize: 12.5,
                        fontWeight: 700,
                        color: item.color,
                      }}
                    >
                      {item.value}
                    </span>
                  </div>
                ))}
                {data.isAdmin && (
                  <button
                    onClick={() => setShowClearConfirm(true)}
                    style={{
                      width: "100%",
                      marginTop: 10,
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      padding: "9px 11px",
                      borderRadius: 9,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#ef4444",
                      fontSize: 12,
                      fontWeight: 500,
                      fontFamily: "inherit",
                      transition: "background .15s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "rgba(239,68,68,.06)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "none")
                    }
                  >
                    <Trash2 size={12} /> Clear message history
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Repository */}
      <AnimatePresence>
        {isLibraryOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 120,
                background: "rgba(0,0,0,.2)",
                backdropFilter: "blur(4px)",
              }}
              onClick={() => setIsLibraryOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              style={{
                position: "fixed",
                inset: "76px 16px 16px",
                zIndex: 130,
                background: "#fff",
                borderRadius: 20,
                boxShadow: "0 20px 48px rgba(0,0,0,.16)",
                border: "1px solid rgba(0,0,0,.06)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                fontFamily: "Plus Jakarta Sans,system-ui,sans-serif",
              }}
            >
              <div
                style={{
                  height: 52,
                  padding: "0 18px",
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  borderBottom: "1px solid rgba(0,0,0,.06)",
                  flexShrink: 0,
                }}
              >
                <Library size={15} style={{ color: "#6366f1" }} />
                <span
                  style={{ fontWeight: 800, fontSize: 13.5, color: "#0f172a" }}
                >
                  Knowledge Repository
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color: "#94a3b8",
                    background: "#f8fafc",
                    padding: "2px 8px",
                    borderRadius: 20,
                    marginLeft: 3,
                  }}
                >
                  {messages.filter((m: any) => m.isFile).length} files
                </span>
                <button
                  onClick={() => setIsLibraryOpen(false)}
                  style={{
                    marginLeft: "auto",
                    width: 28,
                    height: 28,
                    borderRadius: 7,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#94a3b8",
                  }}
                >
                  <X size={14} />
                </button>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: 18 }}>
                <Tabs defaultValue="files">
                  <TabsList className="h-8 rounded-xl bg-gray-100 p-1 mb-5">
                    <TabsTrigger
                      value="files"
                      className="rounded-lg text-xs font-semibold px-3"
                    >
                      Files ({messages.filter((m: any) => m.isFile).length})
                    </TabsTrigger>
                    <TabsTrigger
                      value="polls"
                      className="rounded-lg text-xs font-semibold px-3"
                    >
                      Polls ({messages.filter((m: any) => m.isPoll).length})
                    </TabsTrigger>
                    <TabsTrigger
                      value="members"
                      className="rounded-lg text-xs font-semibold px-3"
                    >
                      Members ({members.length})
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="files">
                    {messages.filter((m: any) => m.isFile).length === 0 ? (
                      <div
                        style={{
                          textAlign: "center",
                          padding: "40px 20px",
                          color: "#94a3b8",
                        }}
                      >
                        <FileText
                          size={24}
                          style={{ margin: "0 auto 8px", opacity: 0.4 }}
                        />
                        <p style={{ fontSize: 12.5 }}>No files uploaded yet</p>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fill,minmax(180px,1fr))",
                          gap: 10,
                        }}
                      >
                        {messages
                          .filter((m: any) => m.isFile)
                          .map((f: any) => (
                            <motion.div
                              key={f.id}
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 9,
                                padding: "11px 13px",
                                borderRadius: 12,
                                background: "#f8fafc",
                                border: "1px solid rgba(0,0,0,.06)",
                                cursor: "pointer",
                                transition: "border .15s",
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.borderColor = "#c7d2fe")
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.borderColor =
                                  "rgba(0,0,0,.06)")
                              }
                            >
                              <div
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: 9,
                                  background: "rgba(99,102,241,.1)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                }}
                              >
                                <FileText
                                  size={14}
                                  style={{ color: "#6366f1" }}
                                />
                              </div>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <p
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 500,
                                    color: "#374151",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {f.fileName}
                                </p>
                                <p style={{ fontSize: 10, color: "#94a3b8" }}>
                                  by {f.user}
                                </p>
                              </div>
                              <Download
                                size={13}
                                style={{ color: "#c7d2fe", flexShrink: 0 }}
                              />
                            </motion.div>
                          ))}
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="polls">
                    {messages.filter((m: any) => m.isPoll).length === 0 ? (
                      <div
                        style={{
                          textAlign: "center",
                          padding: "40px 20px",
                          color: "#94a3b8",
                        }}
                      >
                        <BarChart3
                          size={24}
                          style={{ margin: "0 auto 8px", opacity: 0.4 }}
                        />
                        <p style={{ fontSize: 12.5 }}>No polls created yet</p>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 9,
                        }}
                      >
                        {messages
                          .filter((m: any) => m.isPoll)
                          .map((p: any) => (
                            <div
                              key={p.id}
                              style={{
                                padding: "13px 15px",
                                borderRadius: 12,
                                background: "#f8fafc",
                                border: "1px solid rgba(0,0,0,.06)",
                              }}
                            >
                              <p
                                style={{
                                  fontSize: 12.5,
                                  fontWeight: 700,
                                  color: "#374151",
                                  marginBottom: 9,
                                }}
                              >
                                {p.question}
                              </p>
                              {p.options?.map((o: any) => (
                                <div
                                  key={o.id}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 7,
                                    padding: "4px 0",
                                    fontSize: 12,
                                    color: "#64748b",
                                  }}
                                >
                                  <div
                                    style={{
                                      width: 9,
                                      height: 9,
                                      borderRadius: "50%",
                                      border: "2px solid rgba(0,0,0,.12)",
                                      flexShrink: 0,
                                    }}
                                  />
                                  {o.text}
                                  <span
                                    style={{
                                      marginLeft: "auto",
                                      color: "#94a3b8",
                                      fontSize: 10.5,
                                    }}
                                  >
                                    {o.votes} votes
                                  </span>
                                </div>
                              ))}
                            </div>
                          ))}
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="members">
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fill,minmax(160px,1fr))",
                        gap: 9,
                      }}
                    >
                      {members.map((m: any, i: number) => (
                        <motion.div
                          key={m.id}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.04 }}
                          onClick={() => setViewingMember(m)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 9,
                            padding: "9px 11px",
                            borderRadius: 12,
                            background: "#f8fafc",
                            border: "1px solid rgba(0,0,0,.06)",
                            cursor: "pointer",
                            transition: "border .15s",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.borderColor = "#c7d2fe")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.borderColor =
                              "rgba(0,0,0,.06)")
                          }
                        >
                          <UserAvatar
                            name={m.name}
                            status={m.status}
                            size={32}
                          />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <p
                              style={{
                                fontSize: 12,
                                fontWeight: 500,
                                color: "#374151",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {m.name}
                            </p>
                            <p style={{ fontSize: 10, color: "#94a3b8" }}>
                              {m.grade}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <FloatingChatbot />
      {meetingUI}
    </TooltipProvider>
  );
};

export default CommunityNewPage;
