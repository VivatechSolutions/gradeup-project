# GradeUp — Project Progress Log & README

> **Last updated:** March 20, 2026  
> **Design System:** Plus Jakarta Sans · Indigo/Purple/Pink gradient · Dashboard token set  
> **Stack:** React + TypeScript · Wouter routing · Framer Motion · Tailwind (patched) · Radix UI

---

## Design System Tokens (all pages must match)

```
Font:      Plus Jakarta Sans 400–800
Hero:      linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)
Cards:     #fff · border-radius:20px · border:1px solid rgba(0,0,0,.06)
           box-shadow:0 2px 12px rgba(0,0,0,.05) · hover translateY(-6px) scale(1.01)
Accent:    #6366f1   Purple:#8b5cf6   Success:#10b981   Amber:#f59e0b   Pink:#ec4899
Body:      #f8fafc   Text:#0f172a     Muted:#64748b      Subtle:#94a3b8   Border:#f1f5f9
Stat cards: border-top:3px solid [color], icon badge, animated number on load
Dark mode: --bg-app:#0f172a  --bg-surface:#1e293b  --text-main:#f1f5f9
           Toggled via <html data-theme="dark|light"> set in navigation.tsx
```

---

## Page Status Overview

| # | Page / Component | File | Status | Notes |
|---|-----------------|------|--------|-------|
| 1 | **Navigation** | `navigation.tsx` | ✅ Done | Dark/light theme, sticky 64px, breadcrumb, mobile drawer |
| 2 | **Dashboard (shell)** | `Dashboard.tsx` | ✅ Done | Layout shell, CSS vars, dark mode patches for Tailwind |
| 3 | **Student Dashboard** | `student-dashboard.tsx` | ✅ Done | Hero, stat cards, subject progress, recent activity |
| 4 | **Teacher Dashboard** | `teacher-dashboard.tsx` | ✅ Done | Class overview, assignments, analytics summary |
| 5 | **Sidebar** | `sidebar.tsx` | ✅ Done | Role-aware nav, collapsible, mobile-responsive |
| 6 | **Book Library (grid)** | `BookContentWindow.tsx` | ✅ Done | Hero, stat cards, filter chips, book grid |
| 7 | **Book TOC** | `BookContentWindow.tsx` | ✅ Done | Unit cards, chapter rows, progress strip |
| 8 | **Book Reader** | `BookContentWindow.tsx` | ✅ Done | Magazine CSS columns, spine, book emboss, flip animation |
| 9 | **Highlighter (inline)** | `BookContentWindow.tsx` | ✅ Done | 6-colour Word-doc picker, tooltip hover, edit/delete modal, localStorage persist |
| 10 | **Ask AI panel** | `BookContentWindow.tsx` | ✅ Done | Slide-in panel, chat bubbles, default question flow |
| 11 | **AI Enhanced Reader** | `BookContentWindow.tsx` | ✅ Done | Opens in new tab, gold button, locked state |
| 12 | **Context Menu** | `BookContentWindow.tsx` | ✅ Done | 4-action grid (Highlight · Explain · Summarize · Ask AI) |
| 13 | **Highlighter modal** | `Highlighter.tsx` | ✅ Done | Edit note · Change colour · Delete — now inlined into BookContentWindow |
| 14 | **Subject Selection** | `SubjectSelection.tsx` | ✅ Done | Dashboard-matched subject cards |
| 15 | **Community (social feed)** | `CommunityPage.tsx` | ✅ Done | Posts, likes, comments, dashboard tokens |
| 16 | **Community New (Discord)** | `CommunityNew.tsx` | ✅ Done | Server rail, channel sidebar, chat area, members panel |
| 17 | **Main Exam Page** | `MainExamPage.tsx` | ✅ Done | Proctored, viewport-locked, strike counter, speech recognition, mobile FAB |
| 18 | **Quiz Page** | `QuizPage.tsx` | ✅ Done | 3-step wizard, question card, right-panel palette, result screen |
| 19 | **Question Bank** | `QuestionBank.tsx` | ✅ Done | Paper cards, difficulty strip, PDF viewer sidebar, watermark |
| 20 | **FAQ Panel** | `FAQPanel.tsx` | ✅ Done | Custom accordion (no Radix cap bug), live search, staggered animation |
| 21 | **Quiz Bank Landing** | `QuizBankLanding.tsx` | ✅ Done | Dashboard hero, two option cards (Exam · Competitive), stats strip |
| 22 | **Quiz Bank Page** | `QuizBankPage.tsx` | ✅ Done | Arena → Banks → Q&A, XP bar, AI chat panel, filter chips, FABs |

---

## Pages — Detailed Status

### ✅ COMPLETED

---

#### 1. Navigation (`navigation.tsx`)
- Sticky 64px bar — never collapses
- Gradient logo + animated pulse
- Breadcrumb shows current page label
- Back-arrow animates in on non-dashboard pages
- Desktop links with active underline indicator
- Theme toggle button — **sets `data-theme` on `<html>`, syncs Tailwind `.dark` class, persists to `localStorage`**
- Notifications bell with animated dot
- Avatar + dropdown (Profile · Settings · Theme · Logout)
- Mobile hamburger → sliding drawer with all links
- Closes drawer on route change

---

#### 2 & 3. Dashboard Shell + Student/Teacher Dashboards
- CSS variable system (`--bg-app`, `--bg-surface`, `--text-main`, etc.) drives all dark/light switching
- Tailwind override patches so child components' `bg-white`, `text-gray-900` etc. flip automatically
- Page entrance animation on role switch
- Mobile FAB toggles sidebar
- Student: stat cards, subject progress bars, recent activity feed
- Teacher: class roster, assignment queue, quick analytics

---

#### 6–13. BookContentWindow + Highlighter
**Three views in one file:**

**Library view**
- Dashboard hero gradient with floating orb decorations
- 4 stat cards (border-top coloured), filter chips, book grid
- Book cards: gradient cover, subject tag, progress bar, Open button

**TOC view**
- Book-coloured hero, unit cards with accent strip, chapter rows with hover slide

**Reader view** — the most complex component
- **Book spread**: CSS `column-count:2` — single DOM, two visual columns, real book look
- Spine, stacked page shadows, desk glow reflection
- Chapter flip animation (`rotateX + rotateY`)
- Floating `Ask AI` + `AI Enhanced` buttons inside book (top-right, horizontal row)
- **Highlighting**: `getClientRects()` for cross-column selection detection
  - 6 colours (Yellow · Green · Blue · Pink · Purple · Orange) — Word-doc style picker
  - Per-paragraph split for multi-paragraph selections
  - Hover tooltip shows colour dot + note
  - Click opens edit/delete modal
  - `localStorage` persists per `bookId::chapterId` key — survives page refresh
- Context menu (4 actions, no quote preview, positioned via `getClientRects`)
- Ask AI panel: sliding, chat bubbles, AI default question
- Explain/Summarize panel: side overlay

---

#### 17. MainExamPage
- Viewport-locked (no page scroll during exam)
- System check flow before exam starts
- Proctoring with 3-strike counter
- Speech recognition with 3 fixes (language, continuous, interim results)
- Mobile floating action palette

---

#### 18–20. QuizPage / QuestionBank / FAQPanel
- **QuizPage**: 3-step setup wizard (unit → difficulty → config), active quiz, result screen with review
- **QuestionBank**: difficulty colour strips, PDF viewer with left sidebar (AI Cracker, Mistake Radar, Topic Predictor), watermark
- **FAQPanel**: CSS `grid-template-rows 0fr→1fr` accordion (no max-height cap), live search with clear, staggered entrance

---

#### 21–22. Quiz Bank
- **Landing**: clean hero, two option cards (Exam Boss Mode · Big Leagues), feature chips, stats
- **Page**: Arena selection (6 arenas with gradient covers) → Banks grid (search + 6 filter chips) → Q&A forum (like toggle, Mark Mastered), XP level system, AI chat side panel, FABs

---

## 🔄 IN PROGRESS

| Page | Notes |
|------|-------|
| **StudentDashboard dark mode** | Base done; individual stat cards / chart components may still use hardcoded colours — needs audit |
| **TeacherDashboard dark mode** | Same — Tailwind patches cover most cases but custom inline styles may need manual pass |
| **Sidebar dark mode** | Needs `[data-theme="dark"]` CSS applied to sidebar's own stylesheet |

---

## ❌ NOT STARTED / NEEDS BUILD

| # | Page | Priority | Notes |
|---|------|----------|-------|
| 1 | **AI Tutor** (`/ai-tutor`) | 🔴 High | Full chat interface, subject context, streaming responses |
| 2 | **Progress Page** (`/progress`) | 🔴 High | Charts (subject breakdown, weekly streak, XP history), achievements timeline |
| 3 | **Preparation Exam** (`/preparation-exam`) | 🔴 High | Timed mock tests, difficulty selector, review mode |
| 4 | **Profile Page** (`/profile`) | 🟡 Medium | Avatar upload, personal info, stats summary, badge showcase |
| 5 | **Settings Page** (`/settings`) | 🟡 Medium | Notifications, theme (can mirror nav toggle), privacy, account |
| 6 | **Achievements Page** (`/achievements`) | 🟡 Medium | Badge grid, XP history, leaderboard strip |
| 7 | **Seminar Tool** (`/seminar-tool`) | 🟡 Medium | Real-time collaborative whiteboard / presentation mode |
| 8 | **Debate Tool** (`/debate-tool`) | 🟡 Medium | Two-team layout, timer, argument cards, voting |
| 9 | **Homework / Assignments** (`/homework`) | 🟡 Medium | Student: submit + view feedback. Teacher: create + grade |
| 10 | **Analytics (Teacher)** (`/analytics`) | 🟡 Medium | Class-wide charts, per-student drill-down, export |
| 11 | **Enhanced Content Manager** (`/enhanced-content-manager`) | 🟡 Medium | Teacher creates AI-enhanced chapters, preview reader |
| 12 | **My Students** (`/students`) | 🟡 Medium | Roster table, per-student progress cards, message button |
| 13 | **Auth Pages** (Login / Register / Forgot) | 🔴 High | If not already done — needed for all routes |
| 14 | **Onboarding Flow** | 🟢 Low | Role selection, subject preferences, first-time walkthroughs |
| 15 | **Notification Centre** | 🟢 Low | Full panel (now just a bell dot), mark read, categories |
| 16 | **Search / Command Palette** | 🟢 Low | Global search across books, quizzes, community posts |

---

## Known Bugs / Technical Debt

| Item | File | Status |
|------|------|--------|
| `CommentTooltip` import still referenced | `BookContentWindow.tsx` | ✅ Removed in latest build |
| `Highlighter.tsx` external component | Redundant since inlining | ✅ Can delete — logic is now inside BookContentWindow |
| Dark mode on StudentDashboard inline styles | `student-dashboard.tsx` | 🔄 Partial — CSS patches cover Tailwind classes |
| Book reader `no-select` was blocking button clicks | `BookContentWindow.tsx` | ✅ Fixed — `pointer-events:none` removed from `.no-select` |
| Cross-column highlight selection | `BookContentWindow.tsx` | ✅ Fixed — `getClientRects()` + per-paragraph split |
| Theme toggle had no DOM effect | `navigation.tsx` | ✅ Fixed — `applyTheme()` sets `data-theme` on `<html>` |
| Dashboard hardcoded `#f8fafc` | `Dashboard.tsx` | ✅ Fixed — CSS variable `--bg-app` |

---

## File Map

```
src/
├── components/
│   ├── navigation.tsx              ✅ Done
│   ├── sidebar.tsx                 ✅ Done (base)
│   ├── student-dashboard.tsx       ✅ Done
│   ├── teacher-dashboard.tsx       ✅ Done
│   │
│   ├── book/
│   │   ├── BookContentWindow.tsx   ✅ Done (Library + TOC + Reader + Highlighter)
│   │   └── Highlighter.tsx         ⚠️  Redundant — logic inlined into BookContentWindow
│   │
│   ├── community/
│   │   ├── CommunityPage.tsx       ✅ Done (social feed)
│   │   └── CommunityNew.tsx        ✅ Done (Discord-style)
│   │
│   ├── exam/
│   │   ├── MainExamPage.tsx        ✅ Done
│   │   └── PreparationExam.tsx     ❌ Not started
│   │
│   ├── quiz/
│   │   ├── QuizPage.tsx            ✅ Done
│   │   ├── QuestionBank.tsx        ✅ Done
│   │   ├── QuizBankLanding.tsx     ✅ Done
│   │   └── QuizBankPage.tsx        ✅ Done
│   │
│   ├── ui/
│   │   ├── FAQPanel.tsx            ✅ Done
│   │   ├── SubjectSelection.tsx    ✅ Done
│   │   └── FunnyLoader.tsx         ✅ Done (used in BookContentWindow)
│   │
│   └── (not started)
│       ├── AiTutor.tsx             ❌
│       ├── ProgressPage.tsx        ❌
│       ├── ProfilePage.tsx         ❌
│       ├── SettingsPage.tsx        ❌
│       ├── AchievementsPage.tsx    ❌
│       ├── SeminarTool.tsx         ❌
│       ├── DebateTool.tsx          ❌
│       ├── HomeworkPage.tsx        ❌
│       ├── AnalyticsPage.tsx       ❌
│       ├── EnhancedContentMgr.tsx  ❌
│       └── MyStudentsPage.tsx      ❌
│
├── pages/
│   └── Dashboard.tsx               ✅ Done
│
└── hooks/
    ├── use-auth.ts                 ✅ (existing)
    └── use-theme.ts                ⚠️  Navigation now manages theme directly via localStorage
                                       — use-theme hook can be removed or unified
```

---

## Session Log

| Date | What was built |
|------|---------------|
| Mar 19 | StudentDashboard, BookContentWindow (library + TOC), SubjectSelection, CommunityPage — initial dashboard design system established |
| Mar 20 (AM) | CommunityNew (Discord), MainExamPage (speech recognition fixes), QuizPage (correctAnswer bug fix), QuestionBank |
| Mar 20 (mid) | FAQPanel, BookContentWindow reader (magazine columns), highlighting cross-column fix, Sidebar, full book embossing |
| Mar 20 (PM) | BookContentWindow — floating buttons, context menu, Ask AI, tooltip, localStorage highlights, inline Highlighter, remove hotspots |
| Mar 20 (PM) | QuizBankLanding + QuizBankPage — full dashboard-matched rebuild |
| Mar 20 (PM) | Navigation — dark/light theme fix (`applyTheme` → `data-theme` on `<html>`) |
| Mar 20 (PM) | Dashboard.tsx — CSS variable system, Tailwind dark mode patches |

---

## How Dark Mode Works (technical summary)

1. **User clicks theme toggle** in `navigation.tsx`
2. `applyTheme(dark)` runs immediately (not waiting for re-render):
   - `document.documentElement.setAttribute("data-theme", "dark")`
   - `document.documentElement.classList.toggle("dark", true)`
   - `localStorage.setItem("gradeup-theme", "dark")`
3. On next page load, `navigation.tsx`'s `useState` reads from `localStorage` and `applyTheme` runs inside `useEffect` before paint
4. CSS variables in `Dashboard.tsx` respond: `--bg-app: #0f172a` etc.
5. Tailwind override patches in `Dashboard.tsx` flip `bg-white`, `text-gray-900` etc. for all child components

---

*Generated by Claude — GradeUp UI Project — March 2026*
