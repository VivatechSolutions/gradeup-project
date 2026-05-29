import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { Sun, Moon, Rocket, Sparkles, BookOpen, BarChart2, Trophy } from 'lucide-react';
import { useTheme } from '../../hooks/use-theme';
import { useAuth } from '../../hooks/use-auth';
import Navigation from '../../components/navigation';

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
*,*::before,*::after { box-sizing:border-box; margin:0; padding:0; }

.qbl-root {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  min-height: 100vh;
  background: #f8fafc;
  color: #0f172a;
  overflow-x: hidden;
}

/* ── Hero banner ── */
.qbl-hero {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 55%, #ec4899 100%);
  padding: 60px 40px 72px;
  text-align: center;
  position: relative;
  overflow: hidden;
}
.qbl-hero::before {
  content:''; position:absolute; top:-80px; right:-80px;
  width:320px; height:320px; border-radius:50%; background:rgba(255,255,255,.10); pointer-events:none;
}
.qbl-hero::after {
  content:''; position:absolute; bottom:-100px; left:20%;
  width:220px; height:220px; border-radius:50%; background:rgba(255,255,255,.07); pointer-events:none;
}
.qbl-hero-inner { position:relative; z-index:1; max-width:640px; margin:0 auto; }
.qbl-hero-badge {
  display:inline-block; padding:5px 16px; border-radius:20px;
  background:rgba(255,255,255,.22); border:1px solid rgba(255,255,255,.35);
  font-size:11.5px; font-weight:700; color:#fff; letter-spacing:.6px; text-transform:uppercase;
  margin-bottom:20px; backdrop-filter:blur(6px);
}
.qbl-hero-title {
  font-size: clamp(32px, 6vw, 56px);
  font-weight: 800; color: #fff; line-height: 1.1;
  letter-spacing: -1.5px; margin-bottom: 16px;
}
.qbl-hero-title span {
  background: rgba(255,255,255,.25);
  border-radius: 8px;
  padding: 0 6px;
}
.qbl-hero-sub {
  font-size: 16px; color: rgba(255,255,255,.78); line-height: 1.65; max-width:480px; margin:0 auto 32px;
}

/* ── Stats row in hero ── */
.qbl-hero-stats {
  display:flex; align-items:center; justify-content:center; gap:0;
  background:rgba(255,255,255,.14); border:1px solid rgba(255,255,255,.22);
  border-radius:18px; padding:16px 0; max-width:400px; margin:0 auto 40px;
  backdrop-filter:blur(8px);
}
.qbl-hero-stat { flex:1; text-align:center; padding:0 20px; }
.qbl-hero-stat + .qbl-hero-stat { border-left:1px solid rgba(255,255,255,.22); }
.qbl-hs-num { font-size:26px; font-weight:800; color:#fff; line-height:1; }
.qbl-hs-lbl { font-size:11px; color:rgba(255,255,255,.65); font-weight:600; margin-top:3px; text-transform:uppercase; letter-spacing:.5px; }

/* ── Option cards ── */
.qbl-cards {
  max-width: 860px; margin: -40px auto 0; padding: 0 28px;
  display: grid; grid-template-columns: 1fr 1fr; gap: 20px;
  position: relative; z-index: 10;
}
.qbl-card {
  background: #fff; border-radius: 24px;
  border: 1px solid rgba(0,0,0,.06);
  box-shadow: 0 8px 32px rgba(0,0,0,.10);
  padding: 32px 28px 28px;
  cursor: pointer; overflow: hidden; position: relative;
  transition: all .28s cubic-bezier(.4,0,.2,1);
}
.qbl-card::before {
  content:''; position:absolute; top:-60px; right:-60px;
  width:160px; height:160px; border-radius:50%; opacity:.08; pointer-events:none;
}
.qbl-card.exam::before   { background:#6366f1; }
.qbl-card.league::before { background:#10b981; }
.qbl-card:hover { transform:translateY(-8px) scale(1.015); box-shadow:0 20px 48px rgba(0,0,0,.14); }

.qbl-card-icon {
  width: 64px; height: 64px; border-radius: 18px;
  display: flex; align-items: center; justify-content: center;
  font-size: 32px; margin-bottom: 20px;
  box-shadow: 0 6px 18px rgba(0,0,0,.12);
}
.qbl-card.exam   .qbl-card-icon { background: linear-gradient(135deg,#6366f1,#8b5cf6); }
.qbl-card.league .qbl-card-icon { background: linear-gradient(135deg,#10b981,#059669); }

.qbl-card-title { font-size:21px; font-weight:800; color:#0f172a; margin-bottom:6px; letter-spacing:-.3px; }
.qbl-card-sub   { font-size:13.5px; color:#64748b; line-height:1.55; margin-bottom:20px; font-weight:500; }
.qbl-card-chips { display:flex; flex-wrap:wrap; gap:7px; margin-bottom:22px; }
.qbl-chip {
  font-size:11px; font-weight:700; padding:4px 12px; border-radius:20px;
  border:1.5px solid; text-transform:uppercase; letter-spacing:.3px;
}
.qbl-card.exam .qbl-chip   { color:#6366f1; border-color:#c7d2fe; background:rgba(99,102,241,.07); }
.qbl-card.league .qbl-chip { color:#10b981; border-color:#a7f3d0; background:rgba(16,185,129,.07); }
.qbl-card-btn {
  width:100%; padding:13px; border-radius:14px; border:none; cursor:pointer;
  font-family:inherit; font-size:14px; font-weight:800; color:#fff;
  display:flex; align-items:center; justify-content:center; gap:8px;
  transition:all .2s;
}
.qbl-card.exam .qbl-card-btn   { background:linear-gradient(135deg,#6366f1,#8b5cf6); box-shadow:0 6px 16px rgba(99,102,241,.35); }
.qbl-card.league .qbl-card-btn { background:linear-gradient(135deg,#10b981,#059669); box-shadow:0 6px 16px rgba(16,185,129,.3); }
.qbl-card-btn:hover { transform:translateY(-1px); filter:brightness(1.08); }

/* ── Bottom section ── */
.qbl-bottom {
  max-width: 860px; margin: 40px auto 60px; padding: 0 28px;
  display: flex; align-items: center; justify-content: space-between; gap:16px; flex-wrap:wrap;
}
.qbl-tip {
  font-size:13px; color:#94a3b8; font-weight:500; display:flex; align-items:center; gap:7px;
}
.qbl-theme-btn {
  display:flex; align-items:center; gap:7px;
  padding:9px 18px; border-radius:13px;
  border:1.5px solid #e2e8f0; background:#fff;
  font-family:inherit; font-size:13px; font-weight:700; color:#64748b;
  cursor:pointer; transition:all .18s; box-shadow:0 1px 4px rgba(0,0,0,.05);
}
.qbl-theme-btn:hover { border-color:#c7d2fe; color:#6366f1; background:rgba(99,102,241,.05); }

/* ── Responsive ── */
@media(max-width:640px) {
  .qbl-cards { grid-template-columns:1fr; padding:0 16px; }
  .qbl-hero  { padding:48px 20px 64px; }
  .qbl-bottom{ padding:0 16px; }
}
`;

const QuizBankLanding = () => {
  const [, setLocation]   = useLocation();
  const { theme, setTheme } = useTheme();
  const { userHeader }      = useAuth();
  const [currentRole, setCurrentRole] = useState('student');
  useEffect(() => { if (userHeader?.role) setCurrentRole(userHeader.role); }, [userHeader]);

  const cards = [
    {
      key: 'exam', type: 'exam',
      emoji: '📚', title: 'Exam Boss Mode',
      sub: 'Crush textbooks, unit tests and board exams. Smart quizzes built around your syllabus.',
      chips: ['Board Exams', 'Unit Tests', 'Chapter-wise'],
      link: '/bookGuide/exam',
      btnLabel: 'Start Exam Prep',
      BtnIcon: Rocket,
    },
    {
      key: 'league', type: 'league',
      emoji: '🏆', title: 'The Big Leagues',
      sub: 'NEET, JEE, UPSC, Banking and beyond. Competitive-level prep with expert explanations.',
      chips: ['NEET', 'JEE', 'UPSC', 'Banking'],
      link: '/bookGuide/competitive',
      btnLabel: 'Enter Big Leagues',
      BtnIcon: Sparkles,
    },
  ];

  return (
    <>
      <style>{CSS}</style>
      <div className="qbl-root">
        <Navigation currentRole={currentRole} onRoleChange={setCurrentRole}/>

        {/* Hero */}
        <div className="qbl-hero">
          <div className="qbl-hero-inner">
            <div className="qbl-hero-badge">🧠 Quiz Bank — Choose Your Destiny</div>
            <h1 className="qbl-hero-title">
              Master Every <span>Topic</span> You Touch
            </h1>
            <p className="qbl-hero-sub">
              Two powerful modes — daily exam prep or hardcore competitive training. Pick your path and start climbing the leaderboard.
            </p>
            {/* Hero stats */}
            <div className="qbl-hero-stats">
              <div className="qbl-hero-stat">
                <div className="qbl-hs-num">12+</div>
                <div className="qbl-hs-lbl">Quiz Banks</div>
              </div>
              <div className="qbl-hero-stat">
                <div className="qbl-hs-num">500+</div>
                <div className="qbl-hs-lbl">Questions</div>
              </div>
              <div className="qbl-hero-stat">
                <div className="qbl-hs-num">6</div>
                <div className="qbl-hs-lbl">Arenas</div>
              </div>
            </div>
          </div>
        </div>

        {/* Option cards */}
        <div className="qbl-cards">
          {cards.map((c, i) => (
            <motion.div
              key={c.key}
              initial={{ opacity:0, y:28 }}
              animate={{ opacity:1, y:0 }}
              transition={{ delay: i*0.1 + 0.1, type:'spring', stiffness:300, damping:22 }}
            >
              <div className={`qbl-card ${c.type}`} onClick={() => setLocation(c.link)}>
                <div className="qbl-card-icon">{c.emoji}</div>
                <div className="qbl-card-title">{c.title}</div>
                <div className="qbl-card-sub">{c.sub}</div>
                <div className="qbl-card-chips">
                  {c.chips.map(ch => <span key={ch} className="qbl-chip">{ch}</span>)}
                </div>
                <button className="qbl-card-btn" onClick={e => { e.stopPropagation(); setLocation(c.link); }}>
                  <c.BtnIcon size={15}/> {c.btnLabel}
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom row */}
        <div className="qbl-bottom">
          <div className="qbl-tip">
            <Trophy size={14} style={{color:'#f59e0b'}}/>
            Earn XP by solving questions and level up your rank
          </div>
          <button className="qbl-theme-btn" onClick={() => setTheme(theme==='dark'?'light':'dark')}>
            {theme === 'dark' ? <><Sun size={14}/> Light Mode</> : <><Moon size={14}/> Dark Mode</>}
          </button>
        </div>
      </div>
    </>
  );
};

export default QuizBankLanding;